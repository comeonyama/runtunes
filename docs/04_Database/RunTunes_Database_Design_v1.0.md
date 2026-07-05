# RunTunes データ設計書

RunTunesは現時点でRDBMSやPrismaを使用しない。候補曲と管理バッチ状態をJSONファイルとして管理する。

## 1. Candidate DB

保存先:

- `backend/data/candidates/global.json`
- `backend/data/candidates/j-groove.json`
- `backend/data/candidates/k-pop.json`

```json
{
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "tracks": [
    {
      "spotifyTrackId": "...",
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

- `spotifyTrackId` を一意キーとして追記時に重複排除する。
- 保存は一時ファイルへ書き込んだ後にrenameし、途中書き込みを避ける。
- 読み取りAPIは配列をシャッフルして最大50件を返す。
- Lambdaではpackageに同梱したファイルを読み取り専用で使用する。

## 2. Batch state

保存先: `backend/data/batch-state.json`

ジャンルごとに処理中のseed位置と `nextAllowedAt` を保存する。Spotifyが429を返した場合、バッチは長時間sleepせず状態を保存して終了する。再実行時は待機期限を確認し、期限後に保存位置から再開する。

## 3. Seed data

- `backend/data/jgroove-seed.json`: J-Grooveのartist seed
- `backend/data/global-seed.json`: OpenAI生成のGlobal artist / keyword seed
- `backend/data/kpop-seed.json`: OpenAI生成のK-Pop artist / keyword seed

seed生成とCandidate収集は分離する。バッチ実行中はOpenAIを呼び出さず、保存済みseedだけを利用する。

## 4. 保持しないデータ

- Spotifyユーザーアクセストークン
- ユーザープロフィール
- ユーザーが生成したプレイリスト履歴
- OpenAI選曲結果のキャッシュ
