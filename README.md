# 🏃 RunTunes

**AI-assisted Spotify playlist generator for runners**
**AIがランニングシーンに合わせたSpotifyプレイリストを提案・生成するWebアプリケーション**

## 概要 / Overview

### 🇯🇵 日本語

RunTunes は、ランナー向けに開発している AI プレイリスト生成サービスです。

ランニングシーン（ジョグ、レース、トレイルなど）や年代・ジャンル・人気度などを指定すると、AI が条件に合った楽曲を提案します。ユーザーは候補曲を自由に編集し、Spotify プレイリストとして保存できます。

本プロジェクトは、React・TypeScript・Fastify・Prisma・OpenAI API・Spotify Web API を用いたフルスタック開発のポートフォリオとして制作しています。

### 🇺🇸 English

RunTunes is an AI-assisted web application that helps runners create Spotify playlists tailored to their running sessions.

Users can select a running scene, music genre, decade, popularity, and playlist length. AI recommends tracks, which can be reviewed, reordered, and saved directly to Spotify.

This project is being developed as a full-stack portfolio using React, TypeScript, Fastify, Prisma, OpenAI API, and Spotify Web API.

## このプロジェクトについて

RunTunes は、単なるSpotify API連携アプリではありません。

本プロジェクトでは、以下の技術テーマに取り組んでいます。

- AIを活用したプレイリスト生成
- React + FastifyによるSPA構成
- Spotify OAuth認証
- Prismaによる型安全なデータアクセス
- APIキャッシュによるパフォーマンス最適化
- WordPressとの共存アーキテクチャ
- 設計書主導の開発プロセス
  
---

## 主な機能 / Features

- 🏃 ランニングシーン別プレイリスト生成
- 🤖 OpenAIによる楽曲提案
- 🎵 年代・ジャンル・人気度による絞り込み
- ✏ 候補曲の削除・並び替え
- 🎧 Spotifyプレイリスト作成
- ⚡ Spotify APIキャッシュによる高速検索

---

## 技術スタック / Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Fastify |
| ORM | Prisma |
| Database | MySQL |
| AI | OpenAI API |
| Music | Spotify Web API |
| Authentication | Spotify OAuth 2.0 |

---

## アーキテクチャ

```text
Browser
      │
React SPA
      │
REST API (Fastify)
      │
├── OpenAI API
├── Spotify Web API
└── MySQL (Prisma)
```

---

## ドキュメント / Documentation

- 要件定義書
- 機能設計書
- 技術設計書
- API設計書
- DB設計書
- UI設計書
- アーキテクチャガイド

---

## 開発状況 / Development Status

- [x] 要件定義
- [x] 設計
- [ ] フロントエンド実装
- [ ] バックエンド実装
- [ ] Spotify OAuth
- [ ] OpenAI API連携
- [ ] MVPリリース

---

## ライセンス / License

MIT License
---

# Author

Ken Yamamoto

