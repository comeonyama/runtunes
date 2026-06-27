import axios from "axios";
import type { PlaylistFormData } from "../../types/form";
import type { SearchResponse } from "../../types/spotify";
import { getStoredAccessToken } from "./auth";
import { spotifyClient } from "./client";

export type TrackSearchCriteria = Pick<PlaylistFormData, "genre" | "mood">;

export async function searchTracks({ genre, mood }: TrackSearchCriteria) {
  const accessToken = getStoredAccessToken();

  if (!accessToken) {
    throw new Error("Spotify access token is not available.");
  }

  const { data } = await spotifyClient.get<SearchResponse>("/search", {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      q: `genre:${genre} ${mood}`,
      type: "track",
      limit: 20,
      market: "JP",
    },
  });

  return data;
}

export function isSpotifyUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}
