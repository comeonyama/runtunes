# RunTunes 現状仕様書

最終確認日: 2026-06-28

本書は、現在のリポジトリに存在する実行コード、設定ファイル、JSONデータを正としてまとめた仕様書である。既存の過去設計書やREADMEに記載されていても、現行コードに存在しない機能は現行仕様として扱わない。

## システム概要

RunTunesは、ランニング時間・ペース・ジャンルを入力し、あらかじめ構築した楽曲候補群からOpenAIが選曲したSpotifyプレイリストを作成するSPAである。

現在対応するジャンルは次の3種類である。

| 画面表示 | フロントエンド値 | バックエンド値 | Candidate DBファイル |
|---|---|---|---|
| Global | `global` | `global` | `backend/data/candidates/global.json` |
| J-Groove | `J_GROOVE` | `jgroove` | `backend/data/candidates/j-groove.json` |
| K-Pop | `kpop` | `kpop` | `backend/data/candidates/k-pop.json` |

楽曲候補はユーザー操作時にSpotify Search APIから取得しない。管理者が事前にバッチを実行してJSON形式のCandidate DBへ蓄積し、本体アプリはそのJSONだけを読み取る。

本体とは別に、Spotifyプレイリストからアーティスト名を抽出してSeed JSONを作る「Seed Manager」が独立したSPAとして存在する。

## ディレクトリ構成

```text
runtunes/
├── frontend/                 # RunTunes本体のReact SPA
│   ├── src/
│   │   ├── components/       # 入力フォーム、AI選曲結果、候補曲表示
│   │   ├── hooks/            # React Query mutation/query、Spotify Embed制御
│   │   ├── pages/            # ホーム、Spotify callback
│   │   ├── services/         # 本体API、Spotify PKCE認証クライアント
│   │   └── types/            # フォーム、候補曲等の型
│   └── vite.config.ts        # `/api`を127.0.0.1:3001へプロキシ
├── backend/                  # Fastify APIと管理バッチ
│   ├── src/
│   │   ├── cli/              # Seed生成、Candidate DB更新コマンド
│   │   ├── repositories/     # Candidate DB、バッチ状態のJSON永続化
│   │   ├── services/         # OpenAI、Spotify、Seed、バッチ処理
│   │   └── server.ts         # APIルートと入力検証
│   ├── data/
│   │   ├── candidates/       # ジャンル別Candidate DB
│   │   ├── *-seed.json       # Spotify検索用Seed
│   │   └── batch-state.json  # バッチ再開位置とRetry-After状態
│   └── test/                 # Node.js test runnerによるバックエンドテスト
├── seed-manager/             # Seed JSON作成用の独立React SPA
├── docs/                     # ドキュメント
└── package.json              # ルートから各Candidate DBバッチを起動
```

## アーキテクチャ

```text
管理者フロー
  Seed JSON
      │
      ▼
  Backend CLI batch ── Spotify Search API
      │
      ▼
  JSON Candidate DB
      │
      └─────────────────────────────┐
                                    │
ユーザーフロー                      ▼
  Browser / React SPA ─────── Fastify API ───── OpenAI Responses API
         │                          │
         │ Spotify PKCE             ├────────── Spotify Web API
         │ Spotify Embed API        │            （profile / playlist作成）
         ▼                          ▼
  Spotify Accounts            JSON Candidate DB

独立管理ツール
  Seed Manager SPA ─────────── Spotify Web API
         │                     （playlist items取得）
         └── Seed JSONをローカルダウンロード
```

- 本体はReact SPAとFastify APIの2層構成である。
- OpenAI APIキーはバックエンドだけで使用する。
- 本体のSpotifyアクセストークンはブラウザに保存し、必要なAPI呼び出し時にBearerトークンとしてバックエンドへ渡す。
- Candidate DBとバッチ状態はRDBではなく、バックエンド内のJSONファイルに保存する。
- Spotify Searchは管理者バッチだけが実行する。
- 開発時の既定URLは、本体 `http://localhost:5173`、API `http://127.0.0.1:3001`、Seed Manager `http://127.0.0.1:5174` である。

## 使用技術

| 区分 | 現在の技術 |
|---|---|
| 本体フロントエンド | React 19、TypeScript 6、Vite 8 |
| UI | Tailwind CSS 4、Lucide React |
| フォーム／状態 | Reactのローカルstate、TanStack React Query 5 |
| ルーティング | React Router DOM 7 |
| HTTP | Fetch API、Spotifyトークン交換のみAxios |
| バックエンド | Node.js、Fastify 5、TypeScript、tsx |
| AI | OpenAI Node SDK、Responses API、モデル `gpt-5.5`、Structured Outputs |
| 音楽サービス | Spotify Accounts、Spotify Web API、Spotify IFrame Embed API |
| 永続化 | JSONファイル、テンポラリファイルからのrenameによる置換保存 |
| テスト | Node.js組み込みtest runner、TypeScript typecheck、ESLint |
| Seed Manager | React 19、TypeScript 6、Vite 8 |

Prisma、MySQL、WordPress連携は現在の実行コードには存在しない。

## 画面一覧

### 1. RunTunesホーム（`/`）

本体の唯一の操作画面。以下の機能を持つ。

- Spotify接続／切断
- 接続ユーザー名とSpotifyプラン種別の表示
- Running time選択: 30〜120分、5分単位、初期値60分
- Pace選択: Easy／Middle／Hard、初期値Middle
- Genre選択: Global／J-Groove／K-Pop、初期値Global
- Candidate DB取得とAI選曲を連続実行する「Generate Playlist」
- OpenAIによる要約、選曲結果、アルバム画像の表示
- 1つのSpotify埋め込みプレイヤーによる選択曲の試聴
- 選曲結果をSpotifyの非公開プレイリストとして保存
- 作成後のSpotifyプレイリストを別タブで開く

Spotify未接続中はGenerateボタンを使用できない。生成処理中の多重送信も抑止する。

Candidate DBの全候補一覧は通常表示しない。開発環境かつソース内定数 `SHOW_DEBUG` が `true` の場合だけ表示できるが、現在は `false` である。候補取得エラーまたは0件の場合は通常設定でもメッセージを表示する。

### 2. Spotify callback（`/callback`）

本体Spotify認証の戻り先。`state`、認可エラー、認可コードを検証し、PKCEのcode verifierを使ってトークン交換を行う。成功時は `/` へ戻り、失敗時はエラーと戻るボタンを表示する。

### 3. Seed Manager（独立SPAの `/`）

管理者向け画面。単一画面内で次を行う。

1. Spotifyへ接続する。
2. Spotify Playlist URLとSeed名を入力する。
3. プレイリスト全ページからアーティストを抽出する。
4. 重複排除されたアーティストを個別、一括で選択解除／再選択する。
5. `{ name, artists }` 形式のJSONをプレビューする。
6. Seed JSONをローカルへダウンロードする。

## Spotify認証フロー

### RunTunes本体

Authorization Code with PKCEをSPA内で実行する。Client Secretは使用しない。

1. `Connect Spotify` 押下時に、64文字のcode verifier、SHA-256 code challenge、32文字のstateを生成する。
2. code verifierとstateを`sessionStorage`へ保存する。
3. Spotify Accountsの `/authorize` へ遷移する。
4. `/callback` で受信stateと保存stateを照合する。
5. Spotify Accountsの `/api/token` へ認可コード、code verifier、Client ID、redirect URIを送る。
6. access token、refresh token、失効時刻を`localStorage`へ保存する。
7. access tokenを使い、バックエンド経由でSpotifyプロフィールを取得する。

要求スコープは次の3つである。

- `playlist-modify-public`
- `playlist-modify-private`
- `user-read-private`

本体は保存済みrefresh tokenを使った自動更新を実装していない。access tokenが失効するとローカルのaccess tokenと失効時刻を削除し、再接続が必要になる。

### Seed Manager

Seed ManagerもAuthorization Code with PKCEを使用するが、本体とは別のstorage keyとredirect URIを使用する。callback専用ルートはなく、同じ `/` でquery parameterを処理してURLから除去する。

要求スコープは次の2つである。

- `playlist-read-private`
- `playlist-read-collaborative`

Seed Managerはrefresh tokenによるaccess token更新を実装済みである。失効30秒前以降はrefreshを試み、失敗時は保存セッションを消去する。

## データフロー

### プレイリスト生成

1. ユーザーがRunning time、Pace、Genreを入力してGenerateを押す。
2. フロントエンドが `GET /api/spotify/tracks?genre=...` を呼ぶ。
3. バックエンドが対象Candidate DBを読み、Fisher-Yates方式で順序をシャッフルして最大50曲を返す。
4. フロントエンドが時間、ペース、ジャンルと候補曲の最小メタデータを `POST /api/openai/select-tracks` へ送る。
5. バックエンドは目標曲数を `round(durationMinutes / 4)` とし、候補数を上限にする。
6. 目標曲数の約20%をSurprise枠としてランダム選択する。可能な限り主アーティストが分散するように選ぶ。
7. 残り約80%をOpenAIへ渡し、候補IDだけから自然な再生順で選曲させる。
8. OpenAI選曲とSurprise枠を均等な位置に合成し、`selectedTrackIds`、日本語の要約、タイトル、説明を返す。
9. フロントエンドはIDをCandidate DBの曲情報へ解決し、順番どおり表示する。
10. ユーザーはSpotify Embedで試聴し、`Save to Spotify` を押す。
11. フロントエンドがBearer tokenと選曲結果を `POST /api/spotify/playlists` へ送る。
12. バックエンドがSpotifyプロフィールを検証し、非公開プレイリストを作成して全曲を追加する。

Running time、Pace、GenreはOpenAIに対する緩い選曲ヒントである。候補曲の収集自体はジャンルだけで決まり、時間やペースではCandidate DBを絞り込まない。

### Candidate DB更新

1. 管理者がジャンル別のSeed JSONを用意する。
2. 管理者がルートの `npm run batch:global`、`npm run batch:j-groove`、`npm run batch:kpop` のいずれかを実行する。
3. バッチがSeedを順番に読み、artist seedは `artist:"..."`、keyword seedは値をそのままSpotify検索queryにする。
4. Spotify Search APIを `type=track`、`market=JP` で呼ぶ。artist seedは最大5件、keyword seedは最大10件を取得する。
5. `is_playable=false` の曲と、曲名またはアルバム名に `playlist`、`workout`、`fitness`、`gym`、`compilation` を含む曲を除外する。
6. Spotify track IDで既存データと重複排除し、新規曲だけをCandidate DB末尾に追加する。
7. 各Seed処理後に進捗を保存し、次のリクエストまで既定1,000ms待機する。
8. Spotifyが429を返した場合は現在位置と`nextAllowedAt`を保存して終了する。待機期限前の再実行はSpotify APIを呼ばない。期限後は保存位置から再開する。

### Seed Manager

1. 管理者がSpotify Playlist URLを入力する。
2. Seed ManagerがSpotify Web APIのplaylist itemsを50件ずつ全ページ取得する。
3. track以外のitemを除外し、各trackの全アーティストを取り出す。
4. Unicode NFKC正規化と小文字化を使い、表示名ベースで重複排除する。
5. 選択済みアーティストとSeed名からJSONを生成し、ブラウザでダウンロードする。

Seed Managerが生成したファイルをバックエンドへ自動登録する処理はない。管理者が適切なSeedファイルへ反映する必要がある。

## API一覧

### RunTunes内部API

| Method | Path | 認証 | 主な入力 | 主な出力／動作 |
|---|---|---|---|---|
| GET | `/api/spotify/tracks` | なし | query `genre=global\|jgroove\|kpop` | Candidate DBからランダム最大50曲。`Cache-Control: no-store` |
| GET | `/api/spotify/profile` | Spotify Bearer | Authorization header | Spotify `/me` の `id`、表示名、product、images |
| POST | `/api/openai/test` | なし | なし | OpenAI疎通確認テキスト。現在の画面からは未使用 |
| POST | `/api/openai/select-tracks` | なし | 30〜120分、pace、genre、1〜50候補曲 | AI選曲結果、要約、タイトル、説明 |
| POST | `/api/spotify/playlists` | Spotify Bearer | 1〜100 track ID、タイトル、説明 | 非公開プレイリストを作成し、IDとURLを返す |

`/api/spotify/profile` と `/api/spotify/playlists` はSpotify 429時にHTTP 429、`Retry-After` header、`retryAfterSeconds`を返す。その他の外部API失敗は主に502へ変換する。

### 使用する外部API

| 呼び出し元 | API | 用途 |
|---|---|---|
| 本体ブラウザ | Spotify Accounts `/authorize`、`/api/token` | PKCE認証、トークン交換 |
| Seed Managerブラウザ | Spotify Accounts `/authorize`、`/api/token` | PKCE認証、refresh |
| 本体ブラウザ | Spotify IFrame API | 選択曲の埋め込み再生 |
| バックエンド | Spotify Web API `/v1/me` | プロフィール取得とトークン確認 |
| バックエンド | Spotify Web API `/v1/me/playlists` | 非公開プレイリスト作成 |
| バックエンド | Spotify Web API `/v1/playlists/{id}/items` | 作成済みプレイリストへ曲を追加 |
| 管理バッチ | Spotify Web API `/v1/search` | Candidate DB構築 |
| Seed Managerブラウザ | Spotify Web API `/v1/playlists/{id}/items` | プレイリスト内アーティスト抽出 |
| バックエンド | OpenAI Responses API | AI選曲、疎通確認、Global／K-Pop Seed生成 |

## Candidate DB仕様

### 保存方式

Candidate DBはジャンルごとに1つのJSONファイルとして保存する。

```json
{
  "updatedAt": "2026-06-28T09:08:32.526Z",
  "tracks": [
    {
      "spotifyTrackId": "Spotify track ID",
      "uri": "spotify:track:...",
      "name": "Track name",
      "artists": ["Artist name"],
      "album": "Album name",
      "imageUrl": "https://... or null",
      "embedUrl": "https://open.spotify.com/embed/track/...",
      "externalUrl": "https://open.spotify.com/track/... or null",
      "isPlayable": true
    }
  ]
}
```

- 読み込み時に全フィールドをランタイム検証する。不正形式はAPI 500となる。
- ファイルが存在しない場合は空DBとして扱う。
- 重複キーは `spotifyTrackId` である。
- 追加時だけ `updatedAt` を更新する。
- 保存は一時ファイルへ書いた後、renameで本ファイルを置換する。
- 本体APIでは `spotifyTrackId` を `id` に改名して返す。
- 本体取得時は毎回全体をシャッフルし、先頭50曲を返す。利用履歴やユーザー別の重み付けはない。

2026-06-28確認時点の収録数は次のとおりである。

| ジャンル | 曲数 | `updatedAt` |
|---|---:|---|
| Global | 155 | `2026-06-28T09:08:32.526Z` |
| J-Groove | 204 | `2026-06-28T04:43:08.943Z` |
| K-Pop | 81 | `2026-06-28T03:58:26.374Z` |

### バッチ状態

`backend/data/batch-state.json` は次を保存する。

- `lastGenre`: 最後に実行したジャンル
- `lastSeedIndex`: 次回再開するSeed位置
- `nextAllowedAt`: Spotify 429後に再実行可能となる時刻
- `lastRunAt`: 実行開始時刻

状態は全ジャンルで1ファイルを共有する。正常完了後は `lastSeedIndex=0`、`nextAllowedAt=null` に戻る。

## Seed方式の仕様

### Seed JSON

ジャンルごとのファイルは次のとおりである。

| ジャンル | ファイル | 現在の生成／管理方法 |
|---|---|---|
| Global | `backend/data/global-seed.json` | 手動JSONを利用可能。OpenAI再生成CLIも存在 |
| J-Groove | `backend/data/jgroove-seed.json` | 主にSeed Manager等で作ったアーティスト一覧を反映 |
| K-Pop | `backend/data/kpop-seed.json` | OpenAI再生成CLIが存在 |

最低限必要なのは `artists` 配列で、`keywords` 配列は任意である。

```json
{
  "name": "Seed name",
  "artists": ["Artist A", "Artist B"],
  "keywords": ["optional search keyword"]
}
```

各要素は文字列のほか、次のオブジェクト形式も読み込める。

- artist: `{ "name": "Artist A", "weight": 1 }`
- keyword: `{ "value": "dance pop", "weight": 1 }`

`weight` は正の有限数として正規化され、未指定時は1になる。ただし現在のバッチはweightを検索順・件数・重複処理に使用していない。

### Seed生成CLI

- `npm --prefix backend run seed:global`
- `npm --prefix backend run seed:kpop`

両CLIはOpenAI Responses APIの `gpt-5.5` とJSON Schemaを使い、アーティスト15〜30件、キーワード5〜12件を生成して対象Seedファイルを置換する。J-Groove用のOpenAI Seed生成CLIは存在しない。

### Candidate DBバッチCLI

- `npm run batch:global`
- `npm run batch:j-groove`
- `npm run batch:kpop`

必要な環境変数は `SPOTIFY_BATCH_ACCESS_TOKEN`。リクエスト間隔は `REQUEST_INTERVAL_MS` で変更でき、既定値は1,000msである。バッチ自身はSpotify tokenの取得やrefreshを行わない。

## 現在未実装の機能

以下は現行コードに実装がない、または画面から利用できない機能である。

- 本体Spotify認証のrefresh tokenによる自動更新
- Candidate DBの閲覧、検索、削除、手動編集、Seed取込みを行う管理画面
- Seed ManagerからバックエンドSeedファイルへの直接保存・同期
- J-Groove SeedのOpenAI自動生成CLI
- Candidate DBのRDB化、ユーザー別履歴、利用回数、評価、重み付け
- 選曲後の曲削除、追加、ドラッグ＆ドロップ並び替え
- 作成済みSpotifyプレイリストの再編集、上書き、公開／非公開選択
- ユーザーアカウント、バックエンドセッション、生成履歴の保存
- Distance、年代、人気度、BPM等の入力・絞り込み
- OpenAI接続テストのUI（APIとhookはあるがHomePageから使用していない）
- Candidate一覧の通常ユーザー向け表示（デバッグ用componentのみ存在し、現在は無効）
- Spotify 429の待機時間を本体UIに反映する処理（フォームには状態用propがあるが常にfalse）
- 本体フロントエンドとSeed Managerの自動テスト
- 本番配信、環境別API URL、監視、CI/CDに関する実装

既知の検証上の不整合として、バックエンドのバッチテストはkeyword検索件数を20件と期待しているが、現行実装は10件を指定している。このため2026-06-28時点でバックエンドテスト8件中1件が失敗する。TypeScript typecheck、フロントエンドbuild/lint、Seed Manager build/lintは成功する。

## 今後の予定

現行リポジトリ内には、確定済みのロードマップや期限付き計画を示す実装上の情報はない。したがって、過去設計書の予定を本書へ転記しない。

現状から継続開発する場合の直近候補は、次の未実装事項の解消である。ただし、これらは確定スケジュールではない。

1. keyword検索件数に関する実装とテストの不整合を解消し、バックエンドテストを全件成功させる。
2. 本体Spotify認証にrefresh処理を追加し、長時間利用時の再接続を減らす。
3. Spotify 429の`retryAfterSeconds`をフロントエンドへ伝え、待機状態と再試行可能時刻を表示する。
4. Seed ManagerのJSONを安全に取り込める管理フローを追加する。
5. Candidate DBの運用機能とデータ品質確認手段を整備する。
6. プレイリスト保存前の削除・並び替えなど、ユーザー編集機能を追加する。
7. フロントエンドとSeed Managerの自動テスト、CI、デプロイ設定を整備する。
