# RunTunes 引き継ぎ書（2026-06-28）

## 現状

-   コード変更は実施していない。
-   Git commit は行っていない。
-   現行コードは Fastify(Node.js) + React SPA のまま。
-   最新仕様書を作成済み（現行仕様が正）。

## 本日の結論

PHP API 案と AWS Lambda 案を比較検討した結果、v1.0
は以下の構成を採用する方針とする。

-   React SPA：XServerスタンダードへ配置
-   API：AWS Lambda
-   API Gateway：HTTP API
-   Candidate DB：Lambdaデプロイパッケージへ同梱
-   Node.js バッチ：継続利用
-   Seed Manager：継続利用
-   S3：導入しない（将来必要になれば追加）

## この構成を採用する理由

-   Fastify/Node.js資産を最大限流用できる
-   PHPへの全面移植が不要
-   XServer VPS契約が不要
-   S3を使わないため構成がシンプル
-   ポートフォリオとしてAWS Lambda経験を示せる
-   Candidate DBは小規模かつ更新頻度が低く、Lambda同梱で十分

## 想定構成

``` text
XServer Standard
└── /runtunes/
    └── React build

AWS
├── API Gateway HTTP API
└── Lambda
    ├── OpenAI API
    ├── Spotify API
    └── Candidate JSON（同梱）
```

## Candidate DB

当面は以下をLambdaへ同梱する。

-   backend/data/candidates/global.json
-   backend/data/candidates/j-groove.json
-   backend/data/candidates/k-pop.json

バッチ更新後は再デプロイする運用とする。

## 次回タスク

### Phase 1

-   Fastify構成を確認
-   Lambdaへ移行する方式を設計
-   API Gateway HTTP API構成を決定
-   Candidate DB同梱方法を決定

### Phase 2

Lambdaへ移植対象API

-   GET /api/spotify/tracks
-   GET /api/spotify/profile
-   POST /api/openai/select-tracks
-   POST /api/spotify/playlists

Fastifyのサービス層・OpenAI・Spotifyロジックは可能な限り再利用する。

### Phase 3

フロントエンド修正

-   API Base URLを環境変数化
-   開発環境／本番環境切替

### Phase 4

デプロイ

-   Lambda
-   API Gateway
-   XServerへReact build配置
-   動作確認

## 今回見送った案

### PHP API

メリット

-   XServerだけで完結
-   構成が単純

デメリット

-   APIを全面書き換える必要がある
-   Node.js資産を活かしにくい

### Lambda + S3

今回は見送り。

Candidate DBは小規模のため、まずはLambda同梱で十分と判断した。

## 注意事項

-   コード変更は未実施
-   Git状態は変更なし
-   次回は設計・実装をLambda案で開始する
-   S3導入は将来必要になった時点で検討する
