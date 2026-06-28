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

export type SpotifyUserProfile = {
  display_name?: string;
  id: string;
  images?: Array<{ url: string }>;
  product?: string;
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

export function getRetryAfterSeconds(retryAfter: string | undefined): number {
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(1, Math.ceil(seconds));
  }

  if (retryAfter) {
    const retryDate = Date.parse(retryAfter);
    if (Number.isFinite(retryDate)) {
      return Math.max(1, Math.ceil((retryDate - Date.now()) / 1_000));
    }
  }

  return 60;
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

export async function getCurrentUserProfile(
  accessToken: string,
): Promise<SpotifyUserProfile> {
  const response = await requestSpotify("/me", accessToken);
  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("id" in data) ||
    typeof data.id !== "string" ||
    !data.id ||
    ("display_name" in data && typeof data.display_name !== "string") ||
    ("product" in data && typeof data.product !== "string") ||
    ("images" in data && !Array.isArray(data.images))
  ) {
    throw new Error("Spotify returned an invalid user profile.");
  }

  const displayName = "display_name" in data ? data.display_name : undefined;
  const product = "product" in data ? data.product : undefined;
  const images = "images" in data ? data.images : undefined;

  return {
    id: data.id,
    ...(typeof displayName === "string" ? { display_name: displayName } : {}),
    ...(typeof product === "string" ? { product } : {}),
    ...(Array.isArray(images)
      ? {
          images: images.filter(
            (image): image is { url: string } =>
              typeof image === "object" &&
              image !== null &&
              "url" in image &&
              typeof image.url === "string",
          ),
        }
      : {}),
  };
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
  await getCurrentUserProfile(accessToken);

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
