import { Music2, Sparkles } from "lucide-react";
import type { AITrackSelectionResponse } from "../../services/openaiService";
import type {
  CreateSpotifyPlaylistResponse,
} from "../../services/spotify/playlist";
import type { CandidateTrack } from "../../types/candidateTrack";

type AISelectionResultsProps = {
  selection?: AITrackSelectionResponse;
  onSave: () => void;
  playlist?: CreateSpotifyPlaylistResponse;
  playlistStatus: "idle" | "pending" | "error" | "success";
  status: "idle" | "pending" | "error" | "success";
  tracks: CandidateTrack[];
};

function AISelectionResults({
  onSave,
  playlist,
  playlistStatus,
  selection,
  status,
  tracks,
}: AISelectionResultsProps) {
  if (status === "idle") return null;

  if (status === "pending") {
    return (
      <section
        aria-live="polite"
        className="mt-5 w-full rounded-2xl border border-run-green/20 bg-run-green/5 p-6 text-center text-sm text-neutral-400"
      >
        <span
          aria-hidden="true"
          className="mx-auto mb-3 block size-6 animate-spin rounded-full border-2 border-neutral-700 border-t-run-green"
        />
        Selecting tracks with AI...
      </section>
    );
  }

  if (status === "error") {
    return (
      <section
        className="mt-5 w-full rounded-2xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-300"
        role="alert"
      >
        Couldn’t generate the AI selection. Please try again.
      </section>
    );
  }

  return (
    <section className="mt-5 w-full" aria-labelledby="ai-selection-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold tracking-[0.18em] text-run-green uppercase">
            <Sparkles aria-hidden="true" className="size-3.5" />
            OpenAI
          </p>
          <h2
            className="mt-1 text-xl font-bold text-white"
            id="ai-selection-title"
          >
            AI Selection
          </h2>
        </div>

        {playlistStatus === "success" && playlist ? (
          <a
            className="rounded-full bg-run-green px-4 py-2 text-xs font-bold text-black transition hover:bg-run-green-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green focus-visible:ring-offset-2 focus-visible:ring-offset-run-bg"
            href={playlist.playlistUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open Playlist
          </a>
        ) : (
          <button
            className="rounded-full bg-run-green px-4 py-2 text-xs font-bold text-black transition hover:bg-run-green-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green focus-visible:ring-offset-2 focus-visible:ring-offset-run-bg"
            disabled={playlistStatus === "pending" || !tracks.length}
            onClick={onSave}
            type="button"
          >
            {playlistStatus === "pending"
              ? "Creating playlist..."
              : "Save to Spotify"}
          </button>
        )}

        <div className="basis-full">
          {selection?.summary && (
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              {selection.summary}
            </p>
          )}
          {playlistStatus === "success" && (
            <p className="mt-2 text-sm text-run-green" role="status">
              Playlist created successfully.
            </p>
          )}
          {playlistStatus === "error" && (
            <p className="mt-2 text-sm text-red-300" role="alert">
              Spotify playlist creation failed.
            </p>
          )}
        </div>
      </div>

      {tracks.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {tracks.map((track) => (
            <li
              className="min-w-0 rounded-2xl border border-run-green/20 bg-run-surface p-3"
              key={track.id}
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
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-white/10 bg-run-surface p-5 text-sm text-neutral-400">
          AI did not select any candidate tracks.
        </p>
      )}
    </section>
  );
}

export default AISelectionResults;
