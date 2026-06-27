import axios from "axios";
import type { CandidateTrack } from "../../types/candidateTrack";
import type { PlaylistFormData } from "../../types/form";
import { getStoredAccessToken } from "./auth";
import { spotifyClient } from "./client";

export type TrackSearchCriteria = Pick<PlaylistFormData, "genre">;

const SPOTIFY_SEARCH_TARGET_LIMIT = 50;
const SPOTIFY_SEARCH_PAGE_MAX_LIMIT = 10;
const SPOTIFY_SEARCH_MAX_RESULTS_PER_QUERY = 50;
const J_GROOVE_SEARCH_LIMIT_PER_ARTIST = 5;

const SPOTIFY_SEARCH_QUERIES: Record<
  TrackSearchCriteria["genre"],
  readonly [string, ...string[]]
> = {
  global: [
    "pop",
    "rock",
    "hip hop",
    "edm",
    "dance",
    "electronic",
    "global hits",
  ],
  J_GROOVE: ["j-groove"],
  kpop: ["k-pop", "kpop", "korean pop", "k-pop hits", "korean hits"],
};

const EXCLUDED_COMPILATION_TERMS = [
  "playlist",
  "workout",
  "fitness",
  "gym",
  "compilation",
] as const;

export function buildSpotifySearchQueries({
  genre,
}: TrackSearchCriteria): readonly [string, ...string[]] {
  return SPOTIFY_SEARCH_QUERIES[genre];
}

export function buildSpotifySearchQuery({
  genre,
}: TrackSearchCriteria): string {
  return buildSpotifySearchQueries({ genre })[0];
}

type SpotifySearchResponse = {
  tracks: {
    items: SpotifyTrack[];
  };
};

type JGrooveSeedResponse = {
  artists: Array<{
    name: string;
    weight: number;
  }>;
};

function isJGrooveSeedResponse(value: unknown): value is JGrooveSeedResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "artists" in value &&
    Array.isArray(value.artists) &&
    value.artists.every(
      (artist) =>
        typeof artist === "object" &&
        artist !== null &&
        "name" in artist &&
        typeof artist.name === "string" &&
        artist.name.trim().length > 0 &&
        "weight" in artist &&
        typeof artist.weight === "number",
    )
  );
}

async function loadJGrooveArtistQueries(): Promise<string[]> {
  const response = await fetch("/api/spotify/jgroove-seed");

  if (!response.ok) {
    throw new Error("Could not load J-Groove seed artists.");
  }

  const data: unknown = await response.json();

  if (!isJGrooveSeedResponse(data)) {
    throw new Error("J-Groove seed artists have an unexpected format.");
  }

  return data.artists.map(
    ({ name }) => `artist:"${name.replaceAll('"', '\\"')}"`,
  );
}

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

export function isPlaylistOrWorkoutCompilation(track: SpotifyTrack): boolean {
  const searchableText = `${track.name} ${track.album.name}`.toLowerCase();

  return EXCLUDED_COMPILATION_TERMS.some((term) =>
    searchableText.includes(term),
  );
}

export function mapSpotifySearchResponseToCandidateTracks(
  response: SpotifySearchResponse,
): CandidateTrack[] {
  return response.tracks.items
    .filter(
      (track) =>
        track.is_playable !== false && !isPlaylistOrWorkoutCompilation(track),
    )
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
  genre,
}: TrackSearchCriteria): Promise<CandidateTrack[]> {
  const accessToken = getStoredAccessToken();

  if (!accessToken) {
    throw new Error("Spotify access token is not available.");
  }

  const queries =
    genre === "J_GROOVE"
      ? await loadJGrooveArtistQueries()
      : buildSpotifySearchQueries({ genre });
  const tracks: SpotifyTrack[] = [];

  if (genre === "J_GROOVE") {
    const responses = await Promise.all(
      queries.map((query) => {
        const params = new URLSearchParams({
          q: query,
          type: "track",
          limit: String(J_GROOVE_SEARCH_LIMIT_PER_ARTIST),
          market: "JP",
        });

        return spotifyClient.get<SpotifySearchResponse>("/search", {
          headers: { Authorization: `Bearer ${accessToken}` },
          params,
        });
      }),
    );

    return dedupeCandidateTracks(
      mapSpotifySearchResponseToCandidateTracks({
        tracks: { items: responses.flatMap(({ data }) => data.tracks.items) },
      }),
    ).slice(0, SPOTIFY_SEARCH_TARGET_LIMIT);
  }

  const offsets = new Map(queries.map((query) => [query, 0]));
  const exhaustedQueries = new Set<string>();

  while (exhaustedQueries.size < queries.length) {
    for (const query of queries) {
      if (exhaustedQueries.has(query)) continue;

      const offset = offsets.get(query) ?? 0;
      const pageLimit = Math.min(
        SPOTIFY_SEARCH_PAGE_MAX_LIMIT,
        SPOTIFY_SEARCH_MAX_RESULTS_PER_QUERY - offset,
      );

      if (pageLimit <= 0) {
        exhaustedQueries.add(query);
        continue;
      }

      const params = new URLSearchParams({
        q: query,
        type: "track",
        limit: String(pageLimit),
        offset: String(offset),
        market: "JP",
      });
      const { data } = await spotifyClient.get<SpotifySearchResponse>(
        "/search",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params,
        },
      );

      tracks.push(...data.tracks.items);
      const nextOffset = offset + pageLimit;
      offsets.set(query, nextOffset);

      if (
        data.tracks.items.length < pageLimit ||
        nextOffset >= SPOTIFY_SEARCH_MAX_RESULTS_PER_QUERY
      ) {
        exhaustedQueries.add(query);
      }
    }

    const candidateCount = dedupeCandidateTracks(
      mapSpotifySearchResponseToCandidateTracks({
        tracks: { items: tracks },
      }),
    ).length;

    if (candidateCount >= SPOTIFY_SEARCH_TARGET_LIMIT) break;
  }

  return dedupeCandidateTracks(
    mapSpotifySearchResponseToCandidateTracks({
      tracks: { items: tracks },
    }),
  ).slice(0, SPOTIFY_SEARCH_TARGET_LIMIT);
}

export function isSpotifyUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}
