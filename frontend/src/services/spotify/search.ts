import axios from "axios";
import type { CandidateTrack } from "../../types/candidateTrack";
import type { PlaylistFormData } from "../../types/form";
import { getStoredAccessToken } from "./auth";
import { spotifyClient } from "./client";

export type TrackSearchCriteria = Pick<
  PlaylistFormData,
  "distanceKm" | "genre" | "mood"
>;

const SPOTIFY_SEARCH_DEFAULT_LIMIT = 10;
const SPOTIFY_SEARCH_MAX_LIMIT = 50;
const SPOTIFY_SEARCH_PAGE_MAX_LIMIT = 10;

export function normalizeSpotifySearchLimit(limit?: number | null): number {
  const integerLimit =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.floor(limit)
      : SPOTIFY_SEARCH_DEFAULT_LIMIT;

  return Math.min(Math.max(integerLimit, 1), SPOTIFY_SEARCH_MAX_LIMIT);
}

export function calculateSpotifySearchLimit(
  distanceKm?: number | null,
): number {
  if (
    typeof distanceKm !== "number" ||
    !Number.isFinite(distanceKm) ||
    distanceKm <= 5
  ) {
    return SPOTIFY_SEARCH_DEFAULT_LIMIT;
  }

  if (distanceKm <= 10) return 15;
  if (distanceKm <= 20) return 25;
  if (distanceKm <= 30) return 35;

  return SPOTIFY_SEARCH_MAX_LIMIT;
}

const SPOTIFY_SEARCH_QUERIES: Record<
  TrackSearchCriteria["genre"],
  Record<TrackSearchCriteria["mood"], string>
> = {
  global: {
    motivation: "running workout hits",
    happy: "upbeat running hits",
    relax: "easy running playlist",
  },
  jpop: {
    motivation: "j-pop hits",
    happy: "j-pop upbeat",
    relax: "j-pop chill",
  },
  kpop: {
    motivation: "k-pop hits",
    happy: "k-pop upbeat",
    relax: "k-pop chill",
  },
};

export function buildSpotifySearchQuery({
  genre,
  mood,
}: Pick<TrackSearchCriteria, "genre" | "mood">): string {
  return SPOTIFY_SEARCH_QUERIES[genre][mood];
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

export function dedupeCandidateTracks(
  tracks: CandidateTrack[],
): CandidateTrack[] {
  const seenIds = new Set<string>();
  const seenUris = new Set<string>();

  return tracks.filter((track) => {
    if (
      (track.id && seenIds.has(track.id)) ||
      (track.uri && seenUris.has(track.uri))
    ) {
      return false;
    }

    if (track.id) seenIds.add(track.id);
    if (track.uri) seenUris.add(track.uri);

    return true;
  });
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

  const targetLimit = normalizeSpotifySearchLimit(
    calculateSpotifySearchLimit(distanceKm),
  );
  const query = buildSpotifySearchQuery({ genre, mood });
  const tracks: SpotifyTrack[] = [];

  for (
    let offset = 0;
    offset < targetLimit;
    offset += SPOTIFY_SEARCH_PAGE_MAX_LIMIT
  ) {
    const pageLimit = Math.min(
      SPOTIFY_SEARCH_PAGE_MAX_LIMIT,
      targetLimit - offset,
    );
    const params = new URLSearchParams({
      q: query,
      type: "track",
      limit: String(pageLimit),
      offset: String(offset),
      market: "JP",
    });
    const { data } = await spotifyClient.get<SpotifySearchResponse>("/search", {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });

    tracks.push(...data.tracks.items);

    if (data.tracks.items.length < pageLimit) break;
  }

  return dedupeCandidateTracks(
    mapSpotifySearchResponseToCandidateTracks({
      tracks: { items: tracks },
    }),
  );
}

export function isSpotifyUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}
