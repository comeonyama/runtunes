# RunTunes 技術設計書

## 1. システム構成

```text
XServer
└─ React SPA
   ├─ Spotify Accounts API (Authorization Code with PKCE)
   └─ API Gateway HTTP API
      └─ AWS Lambda / Fastify
         ├─ packaged Candidate DB JSON (read-only)
         ├─ OpenAI Responses API
         └─ Spotify Web API

Administrator workstation
└─ BatchService
   ├─ Spotify Search API
   ├─ Candidate DB JSON
   └─ batch-state.json
```

ローカル開発ではViteが `/api` を `http://127.0.0.1:3001` へプロキシし、Fastifyは通常のNode.jsプロセスとして起動する。本番では同じFastify serverをAWS Lambda adapterから実行する。

## 2. コンポーネント責務

### Frontend

- PKCE verifier/stateとSpotifyトークンの管理
- 条件入力とAPI実行状態の管理
- Candidate trackをOpenAIリクエスト向けに整形
- AI選曲結果のSpotify Embed表示
- Spotifyプレイリスト保存の開始

### Backend API

- リクエストのランタイム検証
- Candidate DBの読み取り
- Spotifyトークンの検証とプロフィール取得
- OpenAI Responses APIによる構造化選曲
- Spotifyプレイリスト作成と曲追加

### BatchService

- seedごとのSpotify Search
- Candidate DBへの追記とSpotify Track ID重複排除
- リクエスト間隔の制御
- 現在位置と `nextAllowedAt` の永続化

CLIはBatchServiceを呼び出す薄いエントリーポイントとし、将来のcron等でもサービスを再利用できる構成とする。

## 3. ディレクトリ

```text
frontend/src/
  components/  表示と入力
  hooks/       非同期処理と状態
  pages/       ホーム、OAuthコールバック
  services/    API、Spotify PKCE
  types/       共有フロントエンド型

backend/src/
  cli/          seed生成、バッチ起動
  repositories/ Candidate DB、バッチ状態
  services/     OpenAI、Spotify、batch、seed
  server.ts     Fastifyルート
  local.ts      ローカル起動
  lambda.ts     Lambda handler
```

## 4. データフロー

### ユーザー生成

1. ブラウザが `GET /api/spotify/tracks` で候補曲を取得する。
2. APIはジャンル別JSONをシャッフルし最大50曲返す。
3. ブラウザが条件と候補メタデータを `POST /api/openai/select-tracks` へ送る。
4. APIはSpotifyトークンを検証し、OpenAIへ候補を渡す。
5. ブラウザは選択IDを元候補に解決し、試聴UIを表示する。
6. 保存操作で `POST /api/spotify/playlists` を呼ぶ。

### Candidate DB更新

1. 管理者が必要に応じてGlobal / K-Pop seed JSONを生成する。
2. バッチが保存済みseedを読み、Spotify Searchを順番に実行する。
3. 結果をジャンル別Candidate DBへ追記する。
4. 429時は現在位置と再開可能時刻を保存して終了する。

## 5. セキュリティ

- OpenAI API keyと管理バッチ用Spotifyトークンはバックエンド環境だけに置く。
- SpotifyユーザートークンはブラウザからBearerトークンとして受け取り、Lambdaには保存しない。
- SPA認証ではClient Secretを使用しない。
- AIには候補曲メタデータをデータとして渡し、候補外IDをサービス側で拒否する。
- 本番CORSは本番フロントエンドoriginに限定する。

## 6. デプロイ

- Frontend: base path `/runtunes/` でViteをproduction buildしXServerへ配置
- Backend: build成果物、production依存、Candidate DBをZIP化してLambdaへ配置
- API: SAMでAPI Gateway HTTP API、Lambda、ログ保持、Budgetを管理
- Candidate DB更新後はLambda packageを再作成してデプロイする

## 7. 検証

- Frontend: `npm run lint`, `npm run build`
- Backend: `npm run typecheck`, `npm test`, `npm run build`
- Infrastructure: `sam validate --lint`, `sam build`
