# RunTunes

AI-assisted Spotify playlist generator for runners.

RunTunes は、ランニング時間・ペース・ジャンルに合わせて、AI が候補曲からプレイリストを組み立てる Web アプリケーションです。生成結果を試聴してから、自分の Spotify アカウントへ保存できます。

## 主な機能

- Spotify Authorization Code with PKCE によるログイン
- ランニング時間（30〜120分）、ペース、ジャンルの指定
- Global / J-Groove / K-Pop の Candidate DB から候補曲を取得
- OpenAI による選曲、曲順、タイトル、説明文の生成
- Spotify Embed による生成結果の試聴
- Spotify プレイリストへの保存
- 管理者バッチによる Candidate DB の更新とレート制限後の再開

## アーキテクチャ

```text
Browser (React SPA)
  ├─ Spotify Accounts API (PKCE)
  └─ Fastify API
       ├─ Candidate DB (JSON)
       ├─ OpenAI Responses API
       └─ Spotify Web API
```

ユーザー操作では Spotify Search を実行しません。候補曲は、管理者バッチが事前に Spotify Search から収集して `backend/data/candidates/` に保存します。API はその Candidate DB を読み取り、OpenAI は渡された候補曲の中から選曲します。

本番環境は、XServer 上の静的 React SPA と、API Gateway + AWS Lambda 上の Fastify API で構成します。

## 技術スタック

| 分類 | 技術 |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend | Node.js, TypeScript, Fastify |
| AI | OpenAI Responses API |
| Music / Auth | Spotify Web API, Authorization Code with PKCE |
| Data | JSON Candidate DB |
| Infrastructure | AWS Lambda, API Gateway HTTP API, AWS SAM, XServer |

## ディレクトリ

```text
frontend/        React SPA
backend/         Fastify API、Candidate DB、管理者バッチ
seed-manager/    Spotifyプレイリストからseed候補を作る管理ツール
infrastructure/  AWS SAMテンプレートとデプロイ手順
docs/            要件・設計・API・運用ドキュメント
```

## ローカルセットアップ

必要なもの:

- Node.js 22
- Spotify Developer アプリ
- OpenAI API key

### 1. 環境変数

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

`frontend/.env`:

```dotenv
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
VITE_API_BASE_URL=
VITE_APP_BASE_PATH=/
```

`backend/.env`:

```dotenv
OPENAI_API_KEY=your_openai_api_key
SPOTIFY_BATCH_ACCESS_TOKEN=your_batch_access_token
REQUEST_INTERVAL_MS=1000
```

Spotify Developer Dashboard には `http://localhost:5173/callback` を Redirect URI として登録してください。SPA のため Client Secret は使用しません。

### 2. 起動

ターミナルを2つ開きます。

```bash
cd backend
npm ci
npm run dev
```

```bash
cd frontend
npm ci
npm run dev
```

フロントエンドは通常 `http://localhost:5173`、バックエンドは `http://127.0.0.1:3001` で起動します。

## Candidate DB 管理

リポジトリルートから実行します。

```bash
npm run batch:global
npm run batch:j-groove
npm run batch:kpop
```

Global / K-Pop の seed を再生成する場合は、先にバックエンドで以下を実行します。

```bash
cd backend
npm run seed:global
npm run seed:kpop
```

詳細は [backend/README.md](backend/README.md) を参照してください。

## 検証

```bash
cd frontend
npm run lint
npm run build
```

```bash
cd backend
npm run typecheck
npm test
npm run build
```

## ドキュメント

ドキュメント一覧は [docs/README.md](docs/README.md) を参照してください。デプロイ手順は [infrastructure/README.md](infrastructure/README.md)、Seed Manager は [seed-manager/README.md](seed-manager/README.md) にあります。

## License

MIT License

## Author

Ken Yamamoto
