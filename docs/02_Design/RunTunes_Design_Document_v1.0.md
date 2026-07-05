# RunTunes 機能設計書

## 1. 画面

### ホーム

単一画面でSpotify接続、条件入力、AI選曲結果の確認、プレイリスト保存までを行う。

1. Spotify未接続時は接続案内と `Connect Spotify` を表示する。
2. 接続後は表示名とアカウント種別、`Disconnect` を表示する。
3. ランニング時間、ペース、ジャンルを入力する。
4. `Generate Playlist` で候補取得とAI選曲を連続実行する。
5. AI選曲結果をSpotify Embedで試聴する。
6. `Save to Spotify` でユーザーのSpotifyへ保存する。

候補曲収集は内部処理であり、通常は候補一覧を表示しない。開発時の明示的なデバッグ設定、エラー、候補0件の場合のみ候補取得領域を表示する。

### OAuthコールバック

Spotifyから受け取った `code` と `state` を検証する。PKCE verifierを使ってトークンを取得し、成功後はホームへ戻る。失敗時は再接続可能なエラーを表示する。

## 2. 入力

| 項目 | 値 | 初期値 |
| --- | --- | --- |
| Running time | 30〜120分、5分刻み | 60分 |
| Pace | Easy / Middle / Hard | Middle |
| Genre | J-Groove / K-Pop / Global | J-Groove |

Spotify未接続時または処理中は生成ボタンを無効にする。連打による候補取得の重複実行も抑止する。

## 3. 生成フロー

```text
入力
  → Candidate DBからジャンル別候補を最大50曲取得
  → OpenAIへ条件と候補メタデータを送信
  → 選択IDを候補データへ解決
  → プレイリスト名、説明、概要、試聴UIを表示
  → ユーザー操作でSpotifyへ保存
```

選曲数の目安は `ランニング時間 ÷ 4分`。約20%をartist単位で分散した surprise track としてランダム選択し、残りをOpenAIが選択する。最終曲順には両者を均等に混ぜる。

## 4. 状態とエラー

- Spotifyセッション切れ: ローカル認証情報を破棄し、再接続を促す。
- Candidate DB 0件: プレイリスト生成を停止し、候補がないことを表示する。
- OpenAI失敗: 選曲結果を表示せず、再実行可能なエラーを表示する。
- Spotify 429: `Retry-After` に基づく待機時間を表示する。
- 保存失敗: AI選曲結果を保持したまま、保存のみ再試行可能にする。

## 5. Seed Manager

`seed-manager/` は本体から分離した管理ツールである。Spotify PKCEで接続し、ユーザーがアクセス可能なプレイリストからartistを抽出・選択し、seed JSONとして出力する。本体の一般ユーザーには公開しない。
