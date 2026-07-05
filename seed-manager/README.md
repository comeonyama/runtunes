# RunTunes Seed Manager

Spotify プレイリストの全 Track から Artist を抽出し、RunTunes Seed JSON を生成する独立管理ツールです。

## セットアップ

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) でアプリを作成します。
2. Redirect URI に `http://127.0.0.1:5174/` を登録します。
3. `.env.example` を `.env.local` にコピーし、Spotify Client ID を設定します。
4. 依存パッケージをインストールし、開発サーバーを起動します。

```sh
cp .env.example .env.local
npm install
npm run dev
```

ブラウザで `http://127.0.0.1:5174/` を開きます。

## Spotify API の制約

現在の Get Playlist Items API では、ログインユーザーが所有するプレイリスト、または共同編集者になっているプレイリストを取得できます。

## コマンド

```sh
npm run build
npm run lint
npm run preview
```
