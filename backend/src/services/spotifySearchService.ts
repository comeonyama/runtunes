import { SpotifyApiError } from "./spotifyService.js";
import type { SpotifySearchTrack } from "./spotifySearchTypes.js";

const SPOTIFY_SEARCH_URL = "https://api.spotify.com/v1/search";

type SpotifySearchResponse = {
  tracks: {
    items: SpotifySearchTrack[];
  };
};

function isSpotifySearchResponse(
  value: unknown,
): value is SpotifySearchResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "tracks" in value &&
    typeof value.tracks === "object" &&
    value.tracks !== null &&
    "items" in value.tracks &&
    Array.isArray(value.tracks.items)
  );
}

/** The single backend entry point that executes Spotify Search requests. */
export class SpotifySearchService {
  async searchTracks(
    accessToken: string,
    query: string,
    limit: number,
  ): Promise<SpotifySearchTrack[]> {
    const params = new URLSearchParams({
      q: query,
      type: "track",
      limit: String(limit),
      market: "JP",
    });
    const response = await fetch(`${SPOTIFY_SEARCH_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new SpotifyApiError(
        "Spotify search API request failed.",
        response.status,
        response.headers.get("retry-after") ?? undefined,
      );
    }

    const data: unknown = await response.json();
    if (!isSpotifySearchResponse(data)) {
      throw new Error("Spotify returned an invalid search response.");
    }

    return data.tracks.items;
  }
}
