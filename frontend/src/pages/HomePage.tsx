import { useState } from "react";
import { Link } from "react-router-dom";
import PlaylistForm from "../components/forms/PlaylistForm";
import {
  isAuthenticated,
  loginWithSpotify,
  logout,
} from "../services/spotify/auth";

function HomePage() {
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(isAuthenticated);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  async function handleConnect() {
    setConnectionError(null);
    setIsConnecting(true);

    try {
      await loginWithSpotify();
    } catch (error) {
      setConnectionError(
        error instanceof Error
          ? error.message
          : "Could not start Spotify login.",
      );
      setIsConnecting(false);
    }
  }

  function handleDisconnect() {
    logout();
    setIsSpotifyConnected(false);
    setConnectionError(null);
  }

  return (
    <main className="min-h-screen bg-run-bg px-3 py-7 text-white sm:px-6 sm:py-12 md:py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        <header className="mb-8 text-center sm:mb-10">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            <Link
              aria-label="RunTunes home"
              className="inline-block rounded-md transition-opacity duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green focus-visible:ring-offset-4 focus-visible:ring-offset-run-bg"
              to="/"
            >
              Run<span className="text-run-green">Tunes</span>
            </Link>
          </h1>
          <p className="mt-3 text-sm text-neutral-400 sm:text-base">
            Find the soundtrack for your next run.
          </p>
        </header>

        <section className="mb-4 flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-run-surface px-4 py-3 sm:mb-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          {isSpotifyConnected ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-run-green/10 px-3 py-1.5 text-xs font-bold text-run-green ring-1 ring-run-green/25">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full bg-run-green shadow-[0_0_10px_var(--color-run-green)]"
                  />
                  Spotify Connected
                </span>
                <p className="text-xs text-neutral-500">
                  Ready to generate your running mix
                </p>
              </div>
              <button
                className="self-start rounded-full px-3 py-2 text-xs font-semibold text-neutral-400 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green sm:self-auto"
                onClick={handleDisconnect}
                type="button"
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm font-semibold text-white">
                  Connect your Spotify account
                </p>
                <p className="text-xs text-neutral-500">
                  Required before generating a playlist
                </p>
              </div>
              <button
                className="rounded-full bg-run-green px-5 py-2.5 text-sm font-bold text-black transition duration-200 hover:scale-[1.02] hover:bg-run-green-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green focus-visible:ring-offset-2 focus-visible:ring-offset-run-surface disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isConnecting}
                onClick={() => void handleConnect()}
                type="button"
              >
                {isConnecting ? "Connecting…" : "Connect Spotify"}
              </button>
            </>
          )}
          {connectionError && (
            <p className="text-xs text-red-400 sm:basis-full" role="alert">
              {connectionError}
            </p>
          )}
        </section>

        <PlaylistForm isSpotifyConnected={isSpotifyConnected} />
      </div>
    </main>
  );
}

export default HomePage;
