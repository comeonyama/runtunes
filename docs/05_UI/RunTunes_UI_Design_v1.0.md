# RunTunes UI設計書

## 1. 方針

- AIによるプレイリスト生成を主役にする。
- Spotify Search候補は内部データとして扱い、通常は表示しない。
- Spotify接続、条件入力、結果確認、保存を1本の縦方向フローにする。
- モバイルからデスクトップまで同じ操作順を保つ。

## 2. ホーム画面

```text
RunTunes header
Spotify connection panel
Playlist condition form
AI selection result
Save result / Spotify link
```

### Spotify connection panel

- 未接続: 接続が必要な説明と `Connect Spotify`
- 接続中: ローディング状態
- 接続済み: 表示名、Free/Premium、`Disconnect`
- プロフィール取得失敗時も接続状態は維持し、状態文で通知する

### Playlist condition form

- Running time: 30〜120分のrange slider
- Pace: Easy / Middle / Hard のradio card
- Genre: J-Groove / K-Pop / Global のradio card
- `Generate Playlist`: 未接続時と実行中はdisabled

### AI selection result

- AI生成のsummary
- プレイリスト名と説明
- 選択曲ごとの曲名、artist、Spotify Embed
- AI選曲成功後だけ `Save to Spotify` を表示
- 保存成功後は作成したプレイリスト情報を表示

## 3. OAuthコールバック画面

- 処理中、成功、失敗を明確に表示する。
- `state` 不一致やPKCE session消失を認証エラーとして扱う。
- 成功後はホームへ遷移する。

## 4. フィードバック

- 非同期処理中はボタンをdisabledにしてspinnerを表示する。
- エラーは関連する操作の近くにテキストで表示し、`role="alert"` を用いる。
- Spotify 429では再試行までの目安を表示する。
- 保存失敗時も生成結果は消さない。

## 5. アクセシビリティ

- フォーム入力にはlabelまたはlegendを関連付ける。
- iconだけに意味を依存しない。
- keyboard focusを視覚的に表示する。
- radio cardの見た目とネイティブinputの状態を同期する。
- loading、error、disabledを色だけで伝えない。
