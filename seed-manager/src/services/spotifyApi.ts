import type {
  SpotifyArtist,
  SpotifyPlaylistItemsPage,
} from "../types/spotify";
import { getValidAccessToken } from "./spotifyAuth";

const API_BASE_URL = "https://api.spotify.com/v1";

export class SpotifyApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SpotifyApiError";
  }
}

async function fetchPage(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const messages: Record<number, string> = {
      401: "Spotify の接続期限が切れました。再接続してください。",
      403: "このプレイリストは取得できません。現在の Spotify API では、自分が所有するか共同編集しているプレイリストが対象です。",
      404: "プレイリストが見つかりません。URL とアクセス権を確認してください。",
      429: "Spotify API の利用上限に達しました。少し待ってから再実行してください。",
    };

    throw new SpotifyApiError(
      messages[response.status] ?? "Spotify からプレイリストを取得できませんでした。",
      response.status,
    );
  }

  return (await response.json()) as SpotifyPlaylistItemsPage;
}

export async function fetchPlaylistArtists(playlistId: string) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new SpotifyApiError(
      "Spotify に接続してからプレイリストを読み込んでください。",
      401,
    );
  }

  const fields = "items(item(type,artists(id,name))),next,total";
  let nextUrl: string | null = `${API_BASE_URL}/playlists/${encodeURIComponent(
    playlistId,
  )}/items?limit=50&offset=0&fields=${encodeURIComponent(fields)}`;
  const artists: SpotifyArtist[] = [];

  while (nextUrl) {
    const page = await fetchPage(nextUrl, accessToken);

    for (const playlistItem of page.items) {
      const track = playlistItem.item ?? playlistItem.track;
      if (track?.type === "track") artists.push(...track.artists);
    }

    nextUrl = page.next;
  }

  return artists;
}
