# RunTunes アーキテクチャガイド

## 1. 設計原則

### AIは候補から選ぶ

OpenAIに曲を発明させず、Candidate DBから取得したSpotify Track IDだけを選択させる。OpenAI応答はJSON Schemaとサービス側検証を通し、候補外IDと重複IDを除外する。

### ユーザー操作とSpotify Searchを分離する

Spotify Searchは管理者バッチだけが実行する。ユーザー向けAPIはCandidate DBを読むため、画面操作による検索バーストやSearch APIの429がプレイリスト生成へ直接波及しない。

### 秘密情報を適切な境界に置く

- OpenAI API keyとバッチ用Spotifyトークン: バックエンド環境
- Spotify Client ID: 公開可能なフロントエンド設定
- Spotifyユーザートークン: ブラウザで保持し、必要なAPIリクエストで送信
- Spotify Client Secret: 使用しない

## 2. Candidate collection

```text
Saved seed JSON
  → BatchService
  → Spotify Search API (sequential, interval controlled)
  → normalize / filter / deduplicate
  → Candidate DB JSON
```

CLIから直接検索ロジックを持たず、必ずBatchServiceを経由する。429時は `Retry-After` を `nextAllowedAt` として保存し、seed indexとともに次回実行へ引き継ぐ。

Candidate DBは現状append型で、既存Track IDは更新せず重複として扱う。データ更新後は新しいCandidate DBをLambda packageへ含めて再デプロイする。

## 3. Playlist generation

```text
Candidate DB
  → random candidates (max 50)
  → surprise selection + OpenAI selection
  → validate and merge IDs
  → preview
  → Spotify playlist creation
```

ランニング時間、ペース、ジャンルは選曲のヒントであり、Spotify Search queryには使用しない。genre別Candidate DBがジャンル境界を担当し、OpenAIはその内部で曲順と構成を決める。

## 4. 認証

SPAはSpotify Authorization Code with PKCEを使用する。code verifierとstateは認証中だけ `sessionStorage`、取得したaccess token・refresh token・有効期限は `localStorage` に保存する。API側はBearer tokenをSpotify `/me` で検証する。

バックエンドはOAuth callbackやtoken refreshを担当しない。ブラウザに有効なaccess tokenがない場合は再接続する。

## 5. 実行環境

### Local

- Vite development server: `localhost:5173`
- Fastify: `127.0.0.1:3001`
- Vite `/api` proxyで接続

### Production

- XServer: `/runtunes/` 配下の静的SPA
- API Gateway HTTP API: 公開する4ルートとCORS
- Lambda: Fastify API、Candidate DB読み取り
- CloudWatch Logs: 14日保持
- Cost controls: Lambda同時実行2、API throttling、月額Budget通知

## 6. 変更時のルール

- APIを変更したらAPI設計書とfrontend serviceを同時に確認する。
- Candidate schemaを変更したらrepository、batch、同梱JSON、API型を確認する。
- Spotify scopeは必要最小限にし、追加時は理由を記録する。
- Candidate DB更新とアプリコード変更を区別し、デプロイ対象を明確にする。
- frontend、backend、seed-managerは各subprojectで検証する。
