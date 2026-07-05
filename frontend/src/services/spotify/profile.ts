import type { SpotifyUserProfile } from "./types";
import { getStoredAccessToken } from "./auth";
import { getApiUrl } from "../api";

export async function fetchCurrentUserProfile() {
  const accessToken = getStoredAccessToken();

  if (!accessToken) {
    throw new Error("Spotify access token is not available.");
  }

  const response = await fetch(getApiUrl("/api/spotify/profile"), {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Could not load Spotify profile.");
  }

  const data = (await response.json()) as SpotifyUserProfile;

  const { id, display_name, product, images } = data;

  return { id, display_name, product, images };
}
