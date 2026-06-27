import { ExternalLink, Music2 } from "lucide-react";
import { isSpotifyUnauthorizedError } from "../../services/spotify/search";
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
        Searching Spotify...
      </section>
    );
  }

  if (status === "error") {
    const message = isSpotifyUnauthorizedError(error)
      ? "Your Spotify session has expired. Disconnect and connect Spotify again."
      : "Couldn’t search Spotify. Please try again.";

    return (
      <section
        className="mt-5 w-full rounded-2xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-300"
        role="alert"
      >
        {message}
      </section>
    );
  }

  if (!tracks?.length) {
    return (
      <section
        aria-live="polite"
        className="mt-5 w-full rounded-2xl border border-white/10 bg-run-surface p-6 text-center text-sm text-neutral-400"
      >
        No tracks found. Try another genre or mood.
      </section>
    );
  }

  return (
    <section className="mt-5 w-full" aria-labelledby="track-results-title">
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-run-green uppercase">
            Spotify Search
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

      <ul className="grid gap-3 sm:grid-cols-2">
        {tracks.map((track) => {
          return (
            <li
              className="flex min-w-0 gap-3 rounded-2xl border border-white/8 bg-run-surface p-3 transition-colors duration-200 hover:border-white/15 hover:bg-run-elevated"
              key={track.id}
            >
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

              <div className="min-w-0 flex-1 py-0.5">
                <p className="truncate text-sm font-bold text-white">
                  {track.name}
                </p>
                <p className="mt-1 truncate text-xs text-neutral-400">
                  {track.artists.join(", ")}
                </p>
                <p className="mt-0.5 truncate text-xs text-neutral-600">
                  {track.album}
                </p>
                {track.externalUrl && (
                  <a
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-run-green transition-colors hover:text-run-green-hover focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green"
                    href={track.externalUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open in Spotify
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default TrackSearchResults;
