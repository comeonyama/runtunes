import type { CandidateTrack } from "../../types/candidateTrack";
import type { PlaylistFormData } from "../../types/form";
import { getStoredAccessToken } from "./auth";

export type TrackSearchCriteria = Pick<PlaylistFormData, "genre">;

const SPOTIFY_RATE_LIMIT_MESSAGE =
  "Spotify APIのレート制限に達しました。しばらく待ってから再試行してください。";
const EXCLUDED_COMPILATION_TERMS = [
  "playlist",
  "workout",
  "fitness",
  "gym",
  "compilation",
] as const;

type SpotifyLinkedTrack = {
  external_urls: { spotify: string };
  href: string;
  id: string;
  type: "track";
  uri: string;
};

type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  is_playable?: boolean;
  linked_from?: SpotifyLinkedTrack;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  external_urls?: { spotify?: string };
};

type SpotifyTrackSearchResponse = {
  tracks: SpotifyTrack[];
};

type SpotifyErrorResponse = {
  message?: string;
  retryAfterSeconds?: number;
};

export class SpotifySearchRequestError extends Error {
  readonly retryAfterSeconds?: number;
  readonly status: number;

  constructor(
    status: number,
    message = "Spotify track search failed.",
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "SpotifySearchRequestError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function isSpotifyTrackSearchResponse(
  value: unknown,
): value is SpotifyTrackSearchResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "tracks" in value &&
    Array.isArray(value.tracks)
  );
}

function isSpotifyErrorResponse(value: unknown): value is SpotifyErrorResponse {
  return typeof value === "object" && value !== null;
}

function toApiGenre(genre: TrackSearchCriteria["genre"]): string {
  return genre === "J_GROOVE" ? "jgroove" : genre;
}

export function isPlaylistOrWorkoutCompilation(track: SpotifyTrack): boolean {
  const searchableText = `${track.name} ${track.album.name}`.toLowerCase();
  return EXCLUDED_COMPILATION_TERMS.some((term) =>
    searchableText.includes(term),
  );
}

function mapSpotifyTrackToCandidateTrack(track: SpotifyTrack): CandidateTrack {
  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: track.artists.map((artist) => artist.name),
    album: track.album.name,
    imageUrl: track.album.images[0]?.url ?? null,
    embedUrl: `https://open.spotify.com/embed/track/${encodeURIComponent(track.id)}`,
    externalUrl: track.external_urls?.spotify ?? null,
    isPlayable: track.is_playable ?? true,
  };
}

export async function searchTracks({
  genre,
}: TrackSearchCriteria): Promise<CandidateTrack[]> {
  const accessToken = getStoredAccessToken();

  if (!accessToken) {
    throw new Error("Spotify access token is not available.");
  }

  const params = new URLSearchParams({ genre: toApiGenre(genre) });
  const response = await fetch(`/api/spotify/tracks?${params.toString()}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => null);
    const message =
      isSpotifyErrorResponse(errorData) && typeof errorData.message === "string"
        ? errorData.message
        : undefined;
    const retryAfterSeconds =
      isSpotifyErrorResponse(errorData) &&
      typeof errorData.retryAfterSeconds === "number"
        ? errorData.retryAfterSeconds
        : undefined;

    throw new SpotifySearchRequestError(
      response.status,
      message,
      retryAfterSeconds,
    );
  }

  const data: unknown = await response.json();
  if (!isSpotifyTrackSearchResponse(data)) {
    throw new Error("Spotify tracks have an unexpected format.");
  }

  return data.tracks
    .filter(
      (track) =>
        track.is_playable !== false && !isPlaylistOrWorkoutCompilation(track),
    )
    .map(mapSpotifyTrackToCandidateTrack);
}

export function isSpotifyUnauthorizedError(error: unknown): boolean {
  return error instanceof SpotifySearchRequestError && error.status === 401;
}

export function getSpotifyRetryAfterSeconds(error: unknown): number | null {
  if (!(error instanceof SpotifySearchRequestError) || error.status !== 429) {
    return null;
  }

  return error.retryAfterSeconds ?? null;
}

export function getSpotifySearchErrorMessage(error: unknown): string {
  if (isSpotifyUnauthorizedError(error)) {
    return "Your Spotify session has expired. Disconnect and connect Spotify again.";
  }

  if (error instanceof SpotifySearchRequestError && error.status === 429) {
    const retryMessage = error.retryAfterSeconds
      ? ` Retry after ${error.retryAfterSeconds} seconds.`
      : "";
    return `${SPOTIFY_RATE_LIMIT_MESSAGE}${retryMessage}`;
  }

  if (error instanceof SpotifySearchRequestError) return error.message;

  return "Couldn’t search Spotify. Please try again.";
}
