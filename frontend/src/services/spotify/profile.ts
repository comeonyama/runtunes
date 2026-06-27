import type { SpotifyUserProfile } from "./types";
import { getStoredAccessToken } from "./auth";
import { spotifyClient } from "./client";

export async function fetchCurrentUserProfile() {
  const accessToken = getStoredAccessToken();

  if (!accessToken) {
    throw new Error("Spotify access token is not available.");
  }

  const { data } = await spotifyClient.get<SpotifyUserProfile>("/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const { id, display_name, product, images } = data;

  return { id, display_name, product, images };
}
