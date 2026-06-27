# RunTunes UI設計書 v1.0

## 画面一覧

1.  ホーム
2.  候補曲編集
3.  完了

## ホーム

``` text
RunTunes
[Scene]
[Decade]
[Genre]
[Count]
[Popularity]
[Generate Playlist]
```

### 入力項目

-   Scene
-   Decade
-   Genre
-   Count
-   Popularity

## 候補曲編集

-   曲削除
-   ドラッグ&ドロップ並び替え
-   Spotifyへ保存

## コンポーネント

-   Header
-   ChipGroup
-   PopularitySlider
-   SongList
-   SongItem
-   GenerateButton
-   SavePlaylistButton

## バリデーション

-   必須項目未選択時はGenerate不可
-   APIエラーはトースト表示
-   Spotify未ログイン時はログイン画面へ誘導
