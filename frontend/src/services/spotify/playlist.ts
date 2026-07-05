import { getStoredAccessToken } from "./auth";
import { getApiUrl } from "../api";

export type CreateSpotifyPlaylistRequest = {
  selectedTrackIds: string[];
  playlistTitle: string;
  playlistDescription: string;
};

export type CreateSpotifyPlaylistResponse = {
  playlistId: string;
  playlistUrl: string;
};

function isCreateSpotifyPlaylistResponse(
  value: unknown,
): value is CreateSpotifyPlaylistResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "playlistId" in value &&
    typeof value.playlistId === "string" &&
    value.playlistId.length > 0 &&
    "playlistUrl" in value &&
    typeof value.playlistUrl === "string" &&
    value.playlistUrl.length > 0
  );
}

export async function createSpotifyPlaylist(
  request: CreateSpotifyPlaylistRequest,
): Promise<CreateSpotifyPlaylistResponse> {
  const accessToken = getStoredAccessToken();

  if (!accessToken) {
    throw new Error("Spotify access token is not available.");
  }

  if (!request.selectedTrackIds.length) {
    throw new Error("No tracks were selected.");
  }

  const response = await fetch(getApiUrl("/api/spotify/playlists"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error("Spotify playlist creation failed.");
  }

  const data: unknown = await response.json();

  if (!isCreateSpotifyPlaylistResponse(data)) {
    throw new Error("Spotify returned an invalid playlist.");
  }

  return data;
}
