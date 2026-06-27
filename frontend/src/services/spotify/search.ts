import axios from "axios";
import type { CandidateTrack } from "../../types/candidateTrack";
import type { PlaylistFormData } from "../../types/form";
import { getStoredAccessToken } from "./auth";
import { spotifyClient } from "./client";

export type TrackSearchCriteria = Pick<
  PlaylistFormData,
  "distanceKm" | "genre" | "mood"
>;

const SPOTIFY_SEARCH_MIN_LIMIT = 10;
const SPOTIFY_SEARCH_MAX_LIMIT = 50;

export function calculateSpotifySearchLimit(distanceKm?: number): number {
  if (
    typeof distanceKm !== "number" ||
    !Number.isFinite(distanceKm) ||
    distanceKm <= 5
  ) {
    return SPOTIFY_SEARCH_MIN_LIMIT;
  }

  if (distanceKm <= 10) return 15;
  if (distanceKm <= 20) return 25;
  if (distanceKm <= 30) return 35;

  return SPOTIFY_SEARCH_MAX_LIMIT;
}

const SPOTIFY_MOOD_SEARCH_TERMS: Record<TrackSearchCriteria["mood"], string> = {
  motivation: "running workout",
  happy: "upbeat running",
  relax: "easy run",
};

export function buildSpotifySearchQuery({
  genre,
  mood,
}: Pick<TrackSearchCriteria, "genre" | "mood">): string {
  return `${genre} ${SPOTIFY_MOOD_SEARCH_TERMS[mood]}`;
}

type SpotifySearchResponse = {
  tracks: {
    items: SpotifyTrack[];
  };
};

type SpotifyLinkedTrack = {
  external_urls: {
    spotify: string;
  };
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
  external_urls?: {
    spotify?: string;
  };
};

export function mapSpotifySearchResponseToCandidateTracks(
  response: SpotifySearchResponse,
): CandidateTrack[] {
  return response.tracks.items
    .filter((track) => track.is_playable !== false)
    .map((track) => ({
      id: track.id,
      uri: track.uri,
      name: track.name,
      artists: track.artists.map((artist) => artist.name),
      album: track.album.name,
      imageUrl: track.album.images[0]?.url ?? null,
      embedUrl: `https://open.spotify.com/embed/track/${encodeURIComponent(track.id)}`,
      externalUrl: track.external_urls?.spotify ?? null,
      isPlayable: track.is_playable ?? true,
    }));
}

export async function searchTracks({
  distanceKm,
  genre,
  mood,
}: TrackSearchCriteria): Promise<CandidateTrack[]> {
  const accessToken = getStoredAccessToken();

  if (!accessToken) {
    throw new Error("Spotify access token is not available.");
  }

  const { data } = await spotifyClient.get<SpotifySearchResponse>("/search", {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      q: buildSpotifySearchQuery({ genre, mood }),
      type: "track",
      limit: calculateSpotifySearchLimit(distanceKm),
      market: "JP",
    },
  });

  return mapSpotifySearchResponseToCandidateTracks(data);
}

export function isSpotifyUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}
