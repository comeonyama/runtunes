# Codex タスク: Spotify 埋め込みプレイヤーの自動再生対応

## 目的

曲カードをクリックしたとき、Spotify 埋め込みプレイヤーで自動的に再生が始まるようにする。
現状はカードをクリックしても iframe がリロードされるだけで、ユーザーが手動で再生ボタンを押す必要がある。

---

## 変更対象ファイル

- `frontend/src/components/spotify/TrackSearchResults.tsx`
- `frontend/src/components/spotify/AISelectionResults.tsx`

2 ファイルとも同じパターンで実装されている。

---

## 現在の実装

```tsx
const [selectedTrack, setSelectedTrack] = useState<CandidateTrack | null>(() => tracks[0] ?? null);
const playerRef = useRef<HTMLDivElement>(null);

const handleSelectTrack = (track: CandidateTrack) => {
  setSelectedTrack(track);
  requestAnimationFrame(() => {
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};

// JSX:
{selectedTrack && (
  <div className="mb-4" ref={playerRef}>
    <iframe
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      className="block border-0"
      height="80"
      loading="lazy"
      src={selectedTrack.embedUrl}
      style={{ borderRadius: "12px" }}
      title={`${selectedTrack.name} by ${selectedTrack.artists.join(", ")} on Spotify`}
      width="100%"
    />
  </div>
)}
```

カード選択 → `selectedTrack` state 更新 → iframe の `src` が変わり全リロード → プレーヤーは停止状態で表示される。

---

## 実装方針: Spotify IFrame API（EmbedController）

### API の仕様

| 項目 | 内容 |
|------|------|
| スクリプト URL | `https://open.spotify.com/embed/iframe-api/v1` |
| 初期化コールバック | `window.onSpotifyIframeApiReady(IFrameAPI)` |
| コントローラー生成 | `IFrameAPI.createController(element, options, callback)` |
| 曲の切り替え | `controller.loadUri(uri)` |
| 再生 | `controller.play()` |
| URI 形式 | `spotify:track:XXXX`（`CandidateTrack.uri` がこの形式） |
| options | `{ uri: string, height?: number }` |

### 実装手順

1. コンポーネントのマウント時に Spotify IFrame API スクリプトを動的に挿入する（多重挿入を防ぐガードを入れること）
2. `window.onSpotifyIframeApiReady` コールバック内で `createController` を呼び、最初のトラックを初期表示する
3. `EmbedController` インスタンスを `useRef` で保持する
4. `handleSelectTrack` 内で `controllerRef.current.loadUri(track.uri)` → `controllerRef.current.play()` を呼ぶ
5. `tracks` prop が変わったとき（新しい検索結果が来たとき）は、コントローラーを最初のトラックで再初期化する

### TypeScript 型定義

以下の ambient 型を `frontend/src/types/spotify-embed.d.ts` に新規作成すること:

```ts
interface SpotifyEmbedController {
  loadUri(uri: string): void;
  play(): void;
  pause(): void;
  destroy(): void;
}

interface SpotifyIFrameAPI {
  createController(
    element: HTMLElement,
    options: { uri: string; height?: number },
    callback: (controller: SpotifyEmbedController) => void,
  ): void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
    SpotifyIframeApi?: SpotifyIFrameAPI;
  }
}
```

---

## 制約

- **見た目は変えない**: CSS クラスやレイアウトは現状のまま維持すること
- **スクロール動作を維持する**: カードクリック時の `scrollIntoView` は引き続き動作させること
- **`playerRef` の div を残す**: スクロールのターゲットとして使うため、`<div ref={playerRef}>` は維持すること（中の `<iframe>` を `<div>` に差し替える形になる）
- **2 ファイルを一貫して修正する**: 同じロジックになる場合はカスタムフック（例: `frontend/src/hooks/useSpotifyEmbedController.ts`）に切り出すこと
- **変更範囲は `frontend/src/` 以内**に限定すること
