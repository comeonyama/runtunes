# RunTunes API設計書

ベースURLはローカル環境では `http://127.0.0.1:3001`、本番環境では API Gateway のURLを使用する。エラーは原則として `{ "message": string }` を返す。

## エンドポイント一覧

| Method | Path | 認証 | 概要 |
| --- | --- | --- | --- |
| GET | `/api/spotify/tracks?genre=...` | 不要 | Candidate DBから候補曲を取得 |
| GET | `/api/spotify/profile` | Bearer | Spotifyプロフィール取得 |
| POST | `/api/openai/select-tracks` | Bearer | 候補曲からAI選曲 |
| POST | `/api/spotify/playlists` | Bearer | Spotifyプレイリスト作成 |

`POST /api/openai/test` は接続確認用であり、本番API Gatewayでは公開しない。

## GET /api/spotify/tracks

Query `genre` は `global`、`jgroove`、`kpop` のいずれか。Candidate DBをシャッフルし、最大50曲を返す。この処理はSpotify Searchを呼び出さない。

```json
{
  "tracks": [
    {
      "id": "spotifyTrackId",
      "uri": "spotify:track:...",
      "name": "Track name",
      "artists": ["Artist"],
      "album": "Album",
      "imageUrl": "https://...",
      "embedUrl": "https://open.spotify.com/embed/track/...",
      "externalUrl": "https://open.spotify.com/track/...",
      "isPlayable": true
    }
  ]
}
```

## GET /api/spotify/profile

`Authorization: Bearer <spotify_access_token>` が必要。Spotify `/me` のプロフィール情報を返す。

## POST /api/openai/select-tracks

Spotifyトークンの有効性を確認してからOpenAIを呼び出す。候補曲は1〜50曲。

```json
{
  "durationMinutes": 60,
  "pace": "middle",
  "genre": "J_GROOVE",
  "tracks": [
    {
      "id": "spotifyTrackId",
      "name": "Track name",
      "artists": ["Artist"],
      "album": "Album"
    }
  ]
}
```

```json
{
  "selectedTrackIds": ["spotifyTrackId"],
  "summary": "選曲の概要",
  "playlistTitle": "Playlist title",
  "playlistDescription": "Playlist description"
}
```

`pace` は `easy`、`middle`、`hard`、`genre` は `global`、`J_GROOVE`、`kpop` のいずれか。

## POST /api/spotify/playlists

```json
{
  "selectedTrackIds": ["spotifyTrackId"],
  "playlistTitle": "Playlist title",
  "playlistDescription": "Playlist description"
}
```

Spotify上にプレイリストを作成して曲を追加し、成功時は `201` を返す。

## 主なエラー

| Status | 意味 |
| --- | --- |
| 400 | 入力値またはジャンルが不正 |
| 401 | Spotify認証なし、または期限切れ |
| 429 | Spotifyレート制限。`Retry-After` と `retryAfterSeconds` を返す |
| 500 | Candidate DB読み取り失敗 |
| 502 | SpotifyまたはOpenAIとの通信失敗 |
