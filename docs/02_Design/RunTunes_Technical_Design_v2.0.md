# RunTunes 技術設計書 v2.0

> Status: Draft\
> Project: RunTunes (DiscoverRoutes.jp)

# 1. システム概要

RunTunes はランニングシーンに合わせた Spotify プレイリストを生成する
React SPA である。

## アーキテクチャ

``` text
Browser
   │
React SPA
   │
REST API (Fastify)
   │
├─ OpenAI API
├─ Spotify API
└─ MySQL + Prisma
```

# 2. 技術スタック

  分類       採用技術
  ---------- ---------------------------------------
  Frontend   React + TypeScript + Vite
  Backend    Node.js + Fastify
  ORM        Prisma
  DB         MySQL
  Auth       Spotify OAuth Authorization Code Flow
  Hosting    WordPress + Node.js

# 3. ディレクトリ

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
    utils/
```

# 4. Prismaスキーマ

``` prisma
model Song {
  id              Int      @id @default(autoincrement())
  title           String
  artist          String
  album           String?
  spotifyTrackId  String   @unique
  spotifyUri      String
  imageUrl        String?
  durationMs      Int?
  popularity      Int?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([title, artist])
}

model PlaylistCache {
  id           Int      @id @default(autoincrement())
  cacheKey     String   @unique
  responseJson Json
  createdAt    DateTime @default(now())
}

model SpotifySearchCache {
  id         Int      @id @default(autoincrement())
  title      String
  artist     String
  songId     Int
  searchedAt DateTime @default(now())

  @@index([title, artist])
}
```

# 5. API仕様

## POST /api/generate

入力

``` json
{
  "scene":"race",
  "genre":"J-POP",
  "decade":"2020s",
  "count":30,
  "popularity":70
}
```

出力

``` json
[
  {
    "title":"Song",
    "artist":"Artist",
    "spotifyUri":"spotify:track:xxxxx"
  }
]
```

## POST /api/playlist

Spotifyプレイリストを生成する。

# 6. シーケンス図

``` mermaid
sequenceDiagram
participant U as User
participant R as React
participant A as API
participant DB as MySQL
participant O as OpenAI
participant S as Spotify

U->>R: Generate
R->>A: POST /generate
A->>DB: AI Cache検索

alt Cache Hit
    DB-->>A: 候補曲
else Cache Miss
    A->>O: Generate Songs
    O-->>A: 曲一覧
    A->>DB: Cache保存
end

loop 各楽曲
    A->>DB: Song検索
    alt 未登録
        A->>S: Search API
        S-->>A: URI
        A->>DB: 保存
    end
end

A-->>R: 候補一覧
R->>A: Playlist作成
A->>S: Create Playlist
S-->>R: 完了
```

# 7. ER図

``` mermaid
erDiagram

Song ||--o{ SpotifySearchCache : cached

Song {
 int id
 string title
 string artist
 string spotifyTrackId
 string spotifyUri
}

PlaylistCache {
 int id
 string cacheKey
 json responseJson
}

SpotifySearchCache {
 int id
 string title
 string artist
 int songId
}
```

# 8. キャッシュ戦略

## AIキャッシュ

キー: - scene - genre - decade - popularity - count

TTL: 30日（初期案）

## Spotifyキャッシュ

TTLなし（必要時のみ更新）

# 9. テスト方針

-   Unit: Service, Utility
-   Integration: API
-   E2E: Playwright
-   手動: Spotify連携

# 10. CI/CD

GitHub ↓ GitHub Actions ↓ Build ↓ Test ↓ Deploy

# 11. セキュリティ

-   APIキーはサーバーのみ保持
-   HTTPS必須
-   OAuthトークン暗号化
-   Rate Limit
-   CORS
-   入力値バリデーション

# 12. 今後の拡張

-   BPM検索
-   Audio Features
-   お気に入り
-   プレイリスト共有
-   Apple Music対応
-   YouTube Music対応
-   独自楽曲マスタ育成
-   管理画面
-   楽曲メタデータ更新バッチ
