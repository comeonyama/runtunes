import { SpotifyApiError } from "./spotifyService.js";
import type { SpotifySearchTrack } from "./spotifySearchTypes.js";

const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";

type SpotifySearchResponse = {
  tracks: {
    items: SpotifySearchTrack[];
  };
};

export interface SpotifySearchApi {
  searchTracks(
    accessToken: string,
    query: string,
    limit: number,
  ): Promise<SpotifySearchTrack[]>;
}

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

export class SpotifyWebSearchApi implements SpotifySearchApi {
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
    const response = await fetch(
      `${SPOTIFY_API_BASE_URL}/search?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

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
