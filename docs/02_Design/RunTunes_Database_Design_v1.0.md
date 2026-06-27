# RunTunes DB設計書 v1.0

## テーブル

### songs

  カラム             型             備考
  ------------------ -------------- ----------
  id                 INT PK         自動採番
  title              VARCHAR(255)   INDEX
  artist             VARCHAR(255)   INDEX
  album              VARCHAR(255)   NULL可
  spotify_track_id   VARCHAR(64)    UNIQUE
  spotify_uri        VARCHAR(128)   
  image_url          TEXT           
  duration_ms        INT            
  popularity         INT            
  created_at         DATETIME       
  updated_at         DATETIME       

### playlist_cache

AI生成結果(JSON)を保存。

### spotify_search_cache

検索キーとsongsの対応を保存。

## ER図

``` mermaid
erDiagram
songs ||--o{ spotify_search_cache : references
```

## インデックス

-   songs(title, artist)
-   songs(spotify_track_id UNIQUE)
-   playlist_cache(cache_key UNIQUE)
