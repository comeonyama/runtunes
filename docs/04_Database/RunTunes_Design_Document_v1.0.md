# RunTunes 設計書 v1.0

**（要件定義・機能設計・技術設計）**

------------------------------------------------------------------------

# 第1章 要件定義

## 1.1 プロジェクト概要

### システム名

RunTunes

### 目的

ランニングシーンに応じたSpotifyプレイリストをAIで提案・生成するWebサービスを提供する。

### 対象ユーザー

-   ランナー
-   Spotify利用者
-   DiscoverRoutes.jp利用者

## 1.2 システム範囲

### 対象機能

-   ランニングシーン選択
-   年代選択
-   ジャンル選択
-   曲数選択
-   人気度指定
-   AI選曲
-   候補曲編集
-   Spotifyプレイリスト生成

### 対象外

-   音楽再生
-   SNS
-   独自音楽配信

## 1.3 機能要件

  ID      内容
  ------- -----------------------
  FR-01   条件指定
  FR-02   AIによる候補曲生成
  FR-03   候補曲編集
  FR-04   Spotify保存
  FR-05   AI・Spotifyキャッシュ

## 1.4 非機能要件

-   React SPA
-   HTTPS
-   OAuth認証
-   レスポンシブ対応
-   APIキーはサーバー側管理
-   初回表示3秒以内

## 1.5 制約

-   OpenAI API
-   Spotify Web API
-   WordPress固定ページ配下
-   MySQL利用

------------------------------------------------------------------------

# 第2章 機能設計

## 2.1 画面一覧

1.  ホーム
2.  Spotifyログイン
3.  候補曲編集
4.  完了画面

## 2.2 ホーム画面

入力項目

-   ランニングシーン
-   年代
-   ジャンル
-   曲数
-   人気度

操作

-   Generate Playlist

## 2.3 候補曲編集

-   削除
-   並び替え
-   Spotify保存

## 2.4 機能一覧

  ID     機能
  ------ -------------------
  F-01   条件入力
  F-02   AI生成
  F-03   AIキャッシュ
  F-04   Spotify検索
  F-05   Spotifyキャッシュ
  F-06   候補曲編集
  F-07   Playlist生成

## 2.5 処理フロー

1.  条件入力
2.  AIキャッシュ検索
3.  OpenAI生成
4.  Spotifyキャッシュ検索
5.  Spotify検索
6.  候補表示
7.  編集
8.  Playlist生成

------------------------------------------------------------------------

# 第3章 技術設計

## 3.1 システム構成

``` text
Browser
   │
React SPA
   │
REST API (Fastify)
   │
├─ OpenAI API
├─ Spotify API
└─ MySQL (Prisma)
```

## 3.2 技術スタック

  分類       技術
  ---------- ---------------------------
  Frontend   React + TypeScript + Vite
  Backend    Node.js + Fastify
  ORM        Prisma
  Database   MySQL
  Auth       Spotify OAuth

## 3.3 ディレクトリ

``` text
frontend/
  src/
    components/
    pages/
    hooks/
    api/
    types/
    utils/

backend/
  src/
    routes/
    controllers/
    services/
    repositories/
    middleware/
    prisma/
```

## 3.4 データフロー

``` text
Generate
   │
AI Cache
   │
OpenAI
   │
Spotify Cache
   │
Spotify Search
   │
DB保存
   │
Playlist生成
```

## 3.5 データベース

### songs

-   title
-   artist
-   album
-   spotify_track_id
-   spotify_uri
-   popularity
-   duration_ms

### playlist_cache

-   cache_key
-   response_json

### spotify_search_cache

-   title
-   artist
-   song_id

## 3.6 API

### POST /api/generate

AIによる候補曲生成

### POST /api/playlist

Spotifyプレイリスト生成

### GET /api/auth/login

Spotifyログイン

### GET /api/auth/callback

OAuthコールバック

## 3.7 キャッシュ戦略

### AIキャッシュ

キー - scene - genre - decade - popularity - count

### Spotifyキャッシュ

キー - title - artist

## 3.8 セキュリティ

-   HTTPS
-   OAuth Authorization Code Flow
-   APIキー非公開
-   CORS
-   Rate Limit
-   入力値バリデーション

## 3.9 テスト

-   Unit Test
-   Integration Test
-   Playwright E2E

## 3.10 開発ロードマップ

1.  要件定義
2.  設計
3.  React SPA
4.  API
5.  OAuth
6.  OpenAI
7.  Spotify
8.  キャッシュ
9.  WordPress統合
10. 公開

## 3.11 将来構想

-   BPM検索
-   Audio Features
-   Apple Music対応
-   YouTube Music対応
-   独自楽曲マスタ育成
-   管理画面
