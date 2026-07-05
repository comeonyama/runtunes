import type { SpotifyUserProfile } from "./types";
import { getApiUrl } from "../api";

export async function fetchCurrentUserProfile() {
  const response = await fetch(getApiUrl("/api/spotify/profile"), {
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Could not load Spotify profile.");
  }

  const data = (await response.json()) as SpotifyUserProfile;

  const { id, display_name, product, images } = data;

  return { id, display_name, product, images };
}
