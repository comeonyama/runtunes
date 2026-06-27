import { Music2, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
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
  const [selectedAiTrack, setSelectedAiTrack] =
    useState<CandidateTrack | null>(() => tracks[0] ?? null);
  const [previousTracks, setPreviousTracks] = useState(tracks);
  const playerRef = useRef<HTMLDivElement>(null);

  if (tracks !== previousTracks) {
    setPreviousTracks(tracks);
    setSelectedAiTrack(tracks[0] ?? null);
  }

  const handleSelectTrack = (track: CandidateTrack) => {
    setSelectedAiTrack(track);
    requestAnimationFrame(() => {
      playerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

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
      <div className="mb-4 px-1">
        <h2
          className="flex items-center gap-2 text-xl font-bold text-white"
          id="ai-selection-title"
        >
          <Sparkles aria-hidden="true" className="size-5 text-run-green" />
          Your Playlist
        </h2>
        <p className="mt-1 text-xs font-semibold tracking-wide text-neutral-500">
          Curated by OpenAI
        </p>
        {selection?.summary && (
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            {selection.summary}
          </p>
        )}
      </div>

      {tracks.length ? (
        <>
          {selectedAiTrack && (
            <div className="mb-4" ref={playerRef}>
              <iframe
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className="block border-0"
                height="80"
                loading="lazy"
                src={selectedAiTrack.embedUrl}
                style={{ borderRadius: "12px" }}
                title={`${selectedAiTrack.name} by ${selectedAiTrack.artists.join(", ")} on Spotify`}
                width="100%"
              />
            </div>
          )}

          <ul className="grid gap-3 sm:grid-cols-2">
            {tracks.map((track) => {
              const isSelected = track.id === selectedAiTrack?.id;

              return (
                <li className="min-w-0" key={track.id}>
                  <button
                    aria-pressed={isSelected}
                    className={`w-full rounded-2xl border p-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green ${
                      isSelected
                        ? "border-run-green/50 bg-run-elevated"
                        : "border-run-green/20 bg-run-surface hover:border-run-green/35 hover:bg-run-elevated"
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

          <div className="mt-5 flex flex-col items-start gap-3 border-t border-white/8 pt-5">
            {playlistStatus !== "success" && (
              <button
                className="rounded-full bg-run-green px-5 py-2.5 text-sm font-bold text-black transition hover:bg-run-green-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green focus-visible:ring-offset-2 focus-visible:ring-offset-run-bg"
                disabled={playlistStatus === "pending"}
                onClick={onSave}
                type="button"
              >
                {playlistStatus === "pending"
                  ? "Creating playlist..."
                  : "Save to Spotify"}
              </button>
            )}

            {playlistStatus === "success" && (
              <p className="text-sm text-run-green" role="status">
                Playlist created successfully.
              </p>
            )}
            {playlistStatus === "error" && (
              <p className="text-sm text-red-300" role="alert">
                Spotify playlist creation failed.
              </p>
            )}

            {playlistStatus === "success" && playlist && (
              <a
                className="rounded-full border border-run-green/40 bg-run-green/10 px-5 py-2.5 text-sm font-bold text-run-green transition hover:border-run-green/60 hover:bg-run-green/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green focus-visible:ring-offset-2 focus-visible:ring-offset-run-bg"
                href={playlist.playlistUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open Playlist
              </a>
            )}
          </div>
        </>
      ) : (
        <p className="rounded-2xl border border-white/10 bg-run-surface p-5 text-sm text-neutral-400">
          AI did not select any candidate tracks.
        </p>
      )}
    </section>
  );
}

export default AISelectionResults;
