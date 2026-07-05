# RunTunes 要件定義書

## 1. 目的

ランニング時間、ペース、ジャンルを入力すると、事前収集した候補曲から AI がプレイリストを構成し、ユーザーの Spotify アカウントへ保存できるサービスを提供する。

## 2. 対象ユーザー

- ランニング中に聴く曲を短時間で選びたいユーザー
- Spotify アカウントを持つユーザー
- Candidate DB を保守する管理者

## 3. 機能要件

### FR-01 Spotify接続

- Authorization Code with PKCE を使用する。
- Client Secret はフロントエンドでもバックエンドでも使用しない。
- scope は `user-read-private`、`playlist-modify-public`、`playlist-modify-private` とする。
- Spotify未接続時はプレイリスト生成を開始できない。

### FR-02 条件入力

- ランニング時間: 30〜120分、5分単位
- ペース: Easy / Middle / Hard
- ジャンル: Global / J-Groove / K-Pop

### FR-03 候補曲取得

- API はジャンル別 Candidate DB から最大50曲をランダムに返す。
- ユーザー操作を契機に Spotify Search を実行しない。
- Candidate DB の内部候補一覧は通常UIに表示しない。

### FR-04 AI選曲

- OpenAI は渡された候補曲IDだけを選択する。
- 実行時間から曲数の目安を計算し、自然な曲順を生成する。
- 選曲理由、プレイリスト名、説明文を生成する。
- 候補の一部はランダムな surprise track として選び、多様性を確保する。

### FR-05 結果確認と保存

- AI選曲結果を Spotify Embed で試聴できる。
- 結果表示後に Spotify 保存操作を提供する。
- 保存時にユーザー所有のプレイリストを作成し、選択曲を追加する。

### FR-06 管理者バッチ

- Spotify Search は管理者バッチだけが利用する。
- Global / J-Groove / K-Pop ごとに候補曲を追記し、Spotify Track ID で重複排除する。
- 429応答時は `Retry-After` と次回再開位置を保存する。
- Global / K-Pop の seed は OpenAI で生成したJSONを再利用できる。

## 4. 非機能要件

- OpenAI API key はバックエンドだけで管理する。
- Spotifyアクセストークンは永続サーバー保存せず、必要なAPI呼び出しのAuthorizationヘッダーで受け取る。
- Candidate DB はLambda実行時に読み取り専用とする。
- 入力値と外部API応答を検証する。
- Spotify 429応答ではリトライ時刻をクライアントまたは管理者へ伝える。
- 本番APIは同時実行数、API Gatewayスロットリング、AWS Budgetでコストを制限する。

## 5. 対象外

- ユーザーごとの長期的な嗜好学習
- ユーザー操作中のSpotify Search
- 独自音源の配信
- Candidate DBを更新する管理画面
