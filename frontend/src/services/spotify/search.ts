import type { CandidateTrack } from "../../types/candidateTrack";
import type { PlaylistFormData } from "../../types/form";
import { getApiUrl } from "../api";

export type TrackSearchCriteria = Pick<PlaylistFormData, "genre">;

type CandidateResponse = {
  tracks: CandidateTrack[];
};

type CandidateErrorResponse = {
  message?: string;
};

export class CandidateRequestError extends Error {
  readonly status: number;

  constructor(status: number, message = "Candidate database request failed.") {
    super(message);
    this.name = "CandidateRequestError";
    this.status = status;
  }
}

function isCandidateTrack(value: unknown): value is CandidateTrack {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "uri" in value &&
    typeof value.uri === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "artists" in value &&
    Array.isArray(value.artists) &&
    value.artists.every((artist) => typeof artist === "string") &&
    "album" in value &&
    typeof value.album === "string" &&
    "imageUrl" in value &&
    (typeof value.imageUrl === "string" || value.imageUrl === null) &&
    "embedUrl" in value &&
    typeof value.embedUrl === "string" &&
    "externalUrl" in value &&
    (typeof value.externalUrl === "string" || value.externalUrl === null) &&
    "isPlayable" in value &&
    typeof value.isPlayable === "boolean"
  );
}

function isCandidateResponse(value: unknown): value is CandidateResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "tracks" in value &&
    Array.isArray(value.tracks) &&
    value.tracks.every(isCandidateTrack)
  );
}

function isCandidateErrorResponse(
  value: unknown,
): value is CandidateErrorResponse {
  return typeof value === "object" && value !== null;
}

function toApiGenre(genre: TrackSearchCriteria["genre"]): string {
  return genre === "J_GROOVE" ? "jgroove" : genre;
}

export async function searchTracks({
  genre,
}: TrackSearchCriteria): Promise<CandidateTrack[]> {
  const params = new URLSearchParams({ genre: toApiGenre(genre) });
  const response = await fetch(
    getApiUrl(`/api/spotify/tracks?${params.toString()}`),
    { cache: "no-store" },
  );

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => null);
    const message =
      isCandidateErrorResponse(errorData) &&
      typeof errorData.message === "string"
        ? errorData.message
        : undefined;
    throw new CandidateRequestError(response.status, message);
  }

  const data: unknown = await response.json();
  if (!isCandidateResponse(data)) {
    throw new Error("Candidate tracks have an unexpected format.");
  }

  return data.tracks;
}

export function getSpotifySearchErrorMessage(error: unknown): string {
  if (error instanceof CandidateRequestError) return error.message;
  return "Couldn’t load track candidates. Please try again.";
}
