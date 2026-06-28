import { Music2 } from "lucide-react";
import { useRef, useState } from "react";
import useSpotifyEmbedController from "../../hooks/useSpotifyEmbedController";
import { getSpotifySearchErrorMessage } from "../../services/spotify/search";
import type { CandidateTrack } from "../../types/candidateTrack";

type TrackSearchResultsProps = {
  error: unknown;
  status: "idle" | "pending" | "error" | "success";
  tracks?: CandidateTrack[];
};

function TrackSearchResults({
  error,
  status,
  tracks,
}: TrackSearchResultsProps) {
  const [selectedTrack, setSelectedTrack] = useState<CandidateTrack | null>(
    () => tracks?.[0] ?? null,
  );
  const [previousTracks, setPreviousTracks] = useState(tracks);
  const playerRef = useRef<HTMLDivElement>(null);
  const { embedContainerRef, playTrack } = useSpotifyEmbedController(
    status === "success" ? tracks : undefined,
  );

  if (tracks !== previousTracks) {
    setPreviousTracks(tracks);
    setSelectedTrack(tracks?.[0] ?? null);
  }

  const handleSelectTrack = (track: CandidateTrack) => {
    setSelectedTrack(track);
    playTrack(track.uri);
    requestAnimationFrame(() => {
      playerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  if (status === "idle") {
    return null;
  }

  if (status === "pending") {
    return (
      <section
        aria-live="polite"
        className="mt-5 w-full rounded-2xl border border-white/10 bg-run-surface p-6 text-center text-sm text-neutral-400"
      >
        <span
          aria-hidden="true"
          className="mx-auto mb-3 block size-6 animate-spin rounded-full border-2 border-neutral-700 border-t-run-green"
        />
        Loading track candidates...
      </section>
    );
  }

  if (status === "error") {
    return (
      <section
        className="mt-5 w-full rounded-2xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-300"
        role="alert"
      >
        {getSpotifySearchErrorMessage(error)}
      </section>
    );
  }

  if (!tracks?.length) {
    return (
      <section
        aria-live="polite"
        className="mt-5 w-full rounded-2xl border border-white/10 bg-run-surface p-6 text-center text-sm text-neutral-400"
      >
        No tracks found. Try another genre.
      </section>
    );
  }

  return (
    <section className="mt-5 w-full" aria-labelledby="track-results-title">
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-run-green uppercase">
            Candidate DB
          </p>
          <h2
            className="mt-1 text-xl font-bold text-white"
            id="track-results-title"
          >
            Track candidates
          </h2>
        </div>
        <span className="text-xs text-neutral-500">{tracks.length} tracks</span>
      </div>

      {selectedTrack && (
        <div className="mb-4" ref={playerRef}>
          <div
            className="block border-0"
            ref={embedContainerRef}
            style={{ borderRadius: "12px" }}
            title={`${selectedTrack.name} by ${selectedTrack.artists.join(", ")} on Spotify`}
          />
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {tracks.map((track) => {
          const isSelected = track.id === selectedTrack?.id;

          return (
            <li className="min-w-0" key={track.id}>
              <button
                aria-pressed={isSelected}
                className={`w-full rounded-2xl border p-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green ${
                  isSelected
                    ? "border-run-green/50 bg-run-elevated"
                    : "border-white/8 bg-run-surface hover:border-white/15 hover:bg-run-elevated"
                }`}
                onClick={() => handleSelectTrack(track)}
                type="button"
              >
                <span className="flex min-w-0 gap-3">
                  {track.imageUrl ? (
                    <img
                      alt={`${track.album} album cover`}
                      className="size-16 shrink-0 rounded-lg object-cover"
                      height="64"
                      loading="lazy"
                      src={track.imageUrl}
                      width="64"
                    />
                  ) : (
                    <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-white/5 text-neutral-500">
                      <Music2 aria-hidden="true" className="size-5" />
                    </span>
                  )}

                  <span className="min-w-0 flex-1 py-0.5">
                    <span className="block truncate text-sm font-bold text-white">
                      {track.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-neutral-400">
                      {track.artists.join(", ")}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-600">
                      {track.album}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default TrackSearchResults;
