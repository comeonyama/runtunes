const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";

export type CreateSpotifyPlaylistRequest = {
  accessToken: string;
  selectedTrackIds: string[];
  playlistTitle: string;
  playlistDescription: string;
};

export type CreateSpotifyPlaylistResult = {
  playlistId: string;
  playlistUrl: string;
};

export class SpotifyApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter?: string,
  ) {
    super(message);
    this.name = "SpotifyApiError";
  }
}

async function requestSpotify(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(`${SPOTIFY_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new SpotifyApiError(
      "Spotify API request failed.",
      response.status,
      response.headers.get("retry-after") ?? undefined,
    );
  }

  return response;
}

async function getCurrentUserId(accessToken: string): Promise<string> {
  const response = await requestSpotify("/me", accessToken);
  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("id" in data) ||
    typeof data.id !== "string" ||
    !data.id
  ) {
    throw new Error("Spotify returned an invalid user profile.");
  }

  return data.id;
}

async function createPrivatePlaylist(
  accessToken: string,
  name: string,
  description: string,
): Promise<string> {
  const response = await requestSpotify("/me/playlists", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, public: false }),
  });
  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("id" in data) ||
    typeof data.id !== "string" ||
    !data.id
  ) {
    throw new Error("Spotify returned an invalid playlist.");
  }

  return data.id;
}

async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  trackIds: string[],
): Promise<void> {
  await requestSpotify(
    `/playlists/${encodeURIComponent(playlistId)}/items`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uris: trackIds.map((id) => `spotify:track:${id}`),
      }),
    },
  );
}

export async function createSpotifyPlaylist({
  accessToken,
  selectedTrackIds,
  playlistTitle,
  playlistDescription,
}: CreateSpotifyPlaylistRequest): Promise<CreateSpotifyPlaylistResult> {
  await getCurrentUserId(accessToken);

  const playlistId = await createPrivatePlaylist(
    accessToken,
    playlistTitle,
    playlistDescription,
  );
  await addTracksToPlaylist(accessToken, playlistId, selectedTrackIds);

  return {
    playlistId,
    playlistUrl: `https://open.spotify.com/playlist/${encodeURIComponent(playlistId)}`,
  };
}
