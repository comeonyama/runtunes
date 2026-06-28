import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import PlaylistForm from "../components/forms/PlaylistForm";
import AISelectionResults from "../components/spotify/AISelectionResults";
import TrackSearchResults from "../components/spotify/TrackSearchResults";
import { useAITrackSelection } from "../hooks/useAITrackSelection";
import { useCreateSpotifyPlaylist } from "../hooks/useCreateSpotifyPlaylist";
import {
  spotifyProfileQueryKey,
  useSpotifyProfile,
} from "../hooks/useSpotifyProfile";
import { useSpotifyTrackSearch } from "../hooks/useSpotifyTrackSearch";
import { resolveSelectedTracks } from "../services/openaiService";
import {
  isAuthenticated,
  loginWithSpotify,
  logout,
} from "../services/spotify/auth";

const SHOW_DEBUG = false;

function getProductLabel(product?: string) {
  switch (product?.toLowerCase()) {
    case "premium":
      return "Premium";
    case "free":
    case "open":
      return "Free";
    default:
      return null;
  }
}

function HomePage() {
  const queryClient = useQueryClient();
  const isTrackSearchSubmittingRef = useRef(false);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(isAuthenticated);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const spotifyProfile = useSpotifyProfile(isSpotifyConnected);
  const trackSearch = useSpotifyTrackSearch();
  const aiSelection = useAITrackSelection();
  const playlistCreation = useCreateSpotifyPlaylist();

  const connectedName =
    spotifyProfile.data?.display_name?.trim() || "Spotify user";
  const productLabel = getProductLabel(spotifyProfile.data?.product);

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
    isTrackSearchSubmittingRef.current = false;
    logout();
    queryClient.removeQueries({ queryKey: spotifyProfileQueryKey });
    trackSearch.reset();
    aiSelection.reset();
    playlistCreation.reset();
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
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-neutral-400">
                    {spotifyProfile.isLoading
                      ? "Loading profile..."
                      : spotifyProfile.isError
                        ? "Connected, but failed to load profile"
                        : `Connected as ${connectedName}`}
                  </p>
                  {productLabel && !spotifyProfile.isLoading && (
                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold tracking-wide text-neutral-300 uppercase ring-1 ring-white/10">
                      {productLabel}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="self-start rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-neutral-200 shadow-sm transition duration-200 hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green focus-visible:ring-offset-2 focus-visible:ring-offset-run-surface sm:self-auto"
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

        <PlaylistForm
          isLoading={trackSearch.isPending || aiSelection.isPending}
          isRateLimited={false}
          isSpotifyConnected={isSpotifyConnected}
          onSubmit={(criteria) => {
            if (isTrackSearchSubmittingRef.current) return;

            isTrackSearchSubmittingRef.current = true;
            aiSelection.reset();
            playlistCreation.reset();
            trackSearch.mutate(
              {
                genre: criteria.genre,
              },
              {
                onSuccess: (tracks) => {
                  if (tracks.length) {
                    aiSelection.mutate({ criteria, tracks });
                  }
                },
                onSettled: () => {
                  isTrackSearchSubmittingRef.current = false;
                },
              },
            );
          }}
        />

        {(import.meta.env.DEV && SHOW_DEBUG) ||
        trackSearch.isError ||
        (trackSearch.isSuccess && !trackSearch.data.length) ? (
          <TrackSearchResults
            error={trackSearch.error}
            status={trackSearch.status}
            tracks={trackSearch.data}
          />
        ) : null}

        <AISelectionResults
          onSave={() => {
            if (!aiSelection.data?.selectedTrackIds.length) return;

            playlistCreation.mutate({
              selectedTrackIds: aiSelection.data.selectedTrackIds,
              playlistTitle: aiSelection.data.playlistTitle,
              playlistDescription: aiSelection.data.playlistDescription,
            });
          }}
          playlist={playlistCreation.data}
          playlistStatus={playlistCreation.status}
          selection={aiSelection.data}
          status={aiSelection.status}
          tracks={resolveSelectedTracks(aiSelection.data, trackSearch.data)}
        />
      </div>
    </main>
  );
}

export default HomePage;
