import type { CandidateTrack } from "../types/candidateTrack";
import type { PlaylistFormData } from "../types/form";

export type OpenAIConnectionResponse = {
  text: string;
};

export type AITrackSelectionResponse = {
  selectedTrackIds: string[];
  summary: string;
  playlistTitle: string;
  playlistDescription: string;
};

export type AITrackSelectionRequest = {
  criteria: PlaylistFormData;
  tracks: CandidateTrack[];
};

function isOpenAIConnectionResponse(
  value: unknown,
): value is OpenAIConnectionResponse {
  if (typeof value !== "object" || value === null) return false;

  return (
    "text" in value &&
    typeof value.text === "string" &&
    value.text.trim().length > 0
  );
}

export async function requestOpenAIConnectionTest(): Promise<OpenAIConnectionResponse> {
  const response = await fetch("/api/openai/test", { method: "POST" });

  if (!response.ok) {
    throw new Error("Could not connect to OpenAI. Please try again.");
  }

  const data: unknown = await response.json();

  if (!isOpenAIConnectionResponse(data)) {
    throw new Error("OpenAI returned an unexpected response.");
  }

  return data;
}

function isAITrackSelectionResponse(
  value: unknown,
): value is AITrackSelectionResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "selectedTrackIds" in value &&
    Array.isArray(value.selectedTrackIds) &&
    value.selectedTrackIds.every((id) => typeof id === "string") &&
    "summary" in value &&
    typeof value.summary === "string" &&
    "playlistTitle" in value &&
    typeof value.playlistTitle === "string" &&
    value.playlistTitle.trim().length > 0 &&
    "playlistDescription" in value &&
    typeof value.playlistDescription === "string" &&
    value.playlistDescription.trim().length > 0
  );
}

export async function requestAITrackSelection({
  criteria,
  tracks,
}: AITrackSelectionRequest): Promise<AITrackSelectionResponse> {
  const response = await fetch("/api/openai/select-tracks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      distance: criteria.distanceKm,
      pace: criteria.paceSeconds,
      genre: criteria.genre,
      mood: criteria.mood,
      tracks: tracks.map(({ id, name, artists, album }) => ({
        id,
        name,
        artists,
        album,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error("Could not generate an AI track selection.");
  }

  const data: unknown = await response.json();

  if (!isAITrackSelectionResponse(data)) {
    throw new Error("AI returned an unexpected track selection.");
  }

  return data;
}

export function resolveSelectedTracks(
  selection: AITrackSelectionResponse | undefined,
  candidates: CandidateTrack[] | undefined,
): CandidateTrack[] {
  if (!selection || !candidates) return [];

  const candidatesById = new Map(candidates.map((track) => [track.id, track]));
  const selectedIds = new Set<string>();

  return selection.selectedTrackIds.flatMap((id) => {
    const track = candidatesById.get(id);

    if (!track || selectedIds.has(id)) return [];

    selectedIds.add(id);
    return [track];
  });
}
