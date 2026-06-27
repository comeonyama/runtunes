import { useEffect, useMemo, useRef, useState } from "react";
import { fetchPlaylistArtists, SpotifyApiError } from "./services/spotifyApi";
import {
  clearSpotifySession,
  finishSpotifyLogin,
  hasSpotifySession,
  startSpotifyLogin,
} from "./services/spotifyAuth";
import {
  createSeedFilename,
  createSeedJson,
  extractPlaylistId,
  serializeSeed,
  toUniqueArtistOptions,
  type ArtistOption,
} from "./utils/seed";

type LoadStatus = "idle" | "loading" | "success" | "error";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "予期しないエラーが発生しました。";
}

function App() {
  const callbackStarted = useRef(false);
  const [isConnected, setIsConnected] = useState(hasSpotifySession);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [seedName, setSeedName] = useState("");
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (callbackStarted.current) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    if (!code && !error) return;

    callbackStarted.current = true;
    window.history.replaceState({}, document.title, window.location.pathname);

    void Promise.resolve().then(async () => {
      if (error) {
        setAuthError("Spotify への接続がキャンセルされました。");
        return;
      }

      if (!code || !state) {
        setAuthError("Spotify からの認証結果が不完全です。もう一度お試しください。");
        return;
      }

      setIsAuthenticating(true);

      try {
        await finishSpotifyLogin(code, state);
        setIsConnected(true);
        setAuthError(null);
      } catch (loginError) {
        setIsConnected(false);
        setAuthError(getErrorMessage(loginError));
      } finally {
        setIsAuthenticating(false);
      }
    });
  }, []);

  const seed = useMemo(() => createSeedJson(seedName, artists), [seedName, artists]);
  const jsonPreview = useMemo(() => serializeSeed(seed), [seed]);
  const selectedCount = seed.artists.length;

  async function handleConnect() {
    setAuthError(null);
    setIsAuthenticating(true);

    try {
      await startSpotifyLogin();
    } catch (error) {
      setAuthError(getErrorMessage(error));
      setIsAuthenticating(false);
    }
  }

  function handleDisconnect() {
    clearSpotifySession();
    setIsConnected(false);
    setArtists([]);
    setStatus("idle");
    setLoadError(null);
  }

  async function handleLoad(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const playlistId = extractPlaylistId(playlistUrl);

    if (!playlistId) {
      setStatus("error");
      setLoadError("Spotify Playlist URL を正しい形式で入力してください。");
      return;
    }

    setStatus("loading");
    setLoadError(null);

    try {
      const spotifyArtists = await fetchPlaylistArtists(playlistId);
      const options = toUniqueArtistOptions(spotifyArtists);
      setArtists(options);
      setStatus("success");

      if (!options.length) {
        setLoadError("このプレイリストには利用できる Artist がありませんでした。");
      }
    } catch (error) {
      if (error instanceof SpotifyApiError && error.status === 401) {
        clearSpotifySession();
        setIsConnected(false);
      }
      setArtists([]);
      setStatus("error");
      setLoadError(getErrorMessage(error));
    }
  }

  function toggleArtist(key: string) {
    setArtists((current) =>
      current.map((artist) =>
        artist.key === key ? { ...artist, selected: !artist.selected } : artist,
      ),
    );
  }

  function setAllArtists(selected: boolean) {
    setArtists((current) => current.map((artist) => ({ ...artist, selected })));
  }

  function handleDownload() {
    const blob = new Blob([jsonPreview], { type: "application/json;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = createSeedFilename(seed.name);
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <main className="app-shell">
      <div className="page-container">
        <header className="brand-header">
          <div className="brand-line">
            <h1 className="brand">Run<span>Tunes</span></h1>
            <span className="manager-badge">Seed Manager</span>
          </div>
          <p>Spotify プレイリストから Seed JSON をつくる管理ツール</p>
        </header>

        <section className="connection-card" aria-label="Spotify connection">
          <div className="connection-copy">
            <span className={`status-dot ${isConnected ? "connected" : ""}`} />
            <div>
              <strong>{isConnected ? "Spotify Connected" : "Spotify に接続"}</strong>
              <p>
                {isConnected
                  ? "プレイリストを読み込めます"
                  : "Playlist API の利用に必要です"}
              </p>
            </div>
          </div>
          {isConnected ? (
            <button className="button button-ghost" onClick={handleDisconnect} type="button">
              Disconnect
            </button>
          ) : (
            <button
              className="button button-primary button-small"
              disabled={isAuthenticating}
              onClick={() => void handleConnect()}
              type="button"
            >
              {isAuthenticating ? "Connecting…" : "Connect Spotify"}
            </button>
          )}
          {authError && <p className="inline-error full-row" role="alert">{authError}</p>}
        </section>

        <section className="panel input-panel">
          <div className="step-heading">
            <span>1</span>
            <div>
              <h2>プレイリストを読み込む</h2>
              <p>Spotify の Playlist URL と Seed 名を入力してください。</p>
            </div>
          </div>

          <form onSubmit={(event) => void handleLoad(event)}>
            <label htmlFor="playlist-url">Spotify Playlist URL</label>
            <div className="url-row">
              <input
                id="playlist-url"
                inputMode="url"
                onChange={(event) => setPlaylistUrl(event.target.value)}
                placeholder="https://open.spotify.com/playlist/xxxxxxxx"
                type="url"
                value={playlistUrl}
              />
              <button
                className="button button-primary"
                disabled={!isConnected || status === "loading" || !playlistUrl.trim()}
                type="submit"
              >
                {status === "loading" ? "Loading…" : "Load Artists"}
              </button>
            </div>

            <label htmlFor="seed-name">Seed name</label>
            <input
              id="seed-name"
              maxLength={100}
              onChange={(event) => setSeedName(event.target.value)}
              placeholder="Japan Rhythm"
              type="text"
              value={seedName}
            />
          </form>

          {loadError && <p className="message-error" role="alert">{loadError}</p>}
        </section>

        {artists.length > 0 && (
          <section className="panel artist-panel">
            <div className="step-heading artist-heading">
              <span>2</span>
              <div>
                <h2>Artist を選ぶ</h2>
                <p>JSON に含めない Artist のチェックを外してください。</p>
              </div>
            </div>

            <div className="artist-toolbar">
              <p><strong>{selectedCount}</strong> / {artists.length} artists selected</p>
              <div>
                <button onClick={() => setAllArtists(true)} type="button">Select all</button>
                <span aria-hidden="true">/</span>
                <button onClick={() => setAllArtists(false)} type="button">Clear</button>
              </div>
            </div>

            <div className="artist-grid">
              {artists.map((artist) => (
                <label className="artist-option" key={artist.key}>
                  <input
                    checked={artist.selected}
                    onChange={() => toggleArtist(artist.key)}
                    type="checkbox"
                  />
                  <span className="custom-checkbox" aria-hidden="true">✓</span>
                  <span>{artist.name}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {artists.length > 0 && (
          <section className="panel output-panel">
            <div className="step-heading">
              <span>3</span>
              <div>
                <h2>JSON を生成</h2>
                <p>内容を確認して RunTunes Seed をダウンロードします。</p>
              </div>
            </div>

            <pre aria-label="Seed JSON preview"><code>{jsonPreview}</code></pre>
            <button
              className="button button-primary download-button"
              disabled={!seed.name || selectedCount === 0}
              onClick={handleDownload}
              type="button"
            >
              <span aria-hidden="true">↓</span> Download JSON
            </button>
            {(!seed.name || selectedCount === 0) && (
              <p className="download-hint">Seed 名と 1 件以上の Artist が必要です。</p>
            )}
          </section>
        )}

        <footer>RunTunes Seed Manager · Admin Tool</footer>
      </div>
    </main>
  );
}

export default App;
