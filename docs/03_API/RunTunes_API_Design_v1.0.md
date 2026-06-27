# RunTunes API設計書 v1.0

## エンドポイント一覧

  Method   Path                 概要
  -------- -------------------- -------------------
  POST     /api/generate        候補曲生成
  POST     /api/playlist        プレイリスト作成
  GET      /api/auth/login      Spotifyログイン
  GET      /api/auth/callback   OAuthコールバック
  GET      /api/health          ヘルスチェック

## POST /api/generate

### Request

``` json
{
  "scene":"race",
  "genre":"J-POP",
  "decade":"2020s",
  "count":30,
  "popularity":70
}
```

### Response

``` json
[
  {
    "title":"...",
    "artist":"...",
    "spotifyTrackId":"...",
    "spotifyUri":"spotify:track:..."
  }
]
```

### エラー

-   400 不正な入力
-   401 認証エラー
-   429 レート制限
-   500 サーバーエラー

## POST /api/playlist

Spotify URI一覧を受け取りプレイリストを作成する。
