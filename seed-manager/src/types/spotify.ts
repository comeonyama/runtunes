export interface SpotifyTokenResponse {
  access_token: string;
  token_type: "Bearer";
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

export interface SpotifyArtist {
  id: string | null;
  name: string;
}

export interface SpotifyTrack {
  type: "track";
  artists: SpotifyArtist[];
}

export interface SpotifyPlaylistItem {
  item?: SpotifyTrack | null;
  track?: SpotifyTrack | null;
}

export interface SpotifyPlaylistItemsPage {
  items: SpotifyPlaylistItem[];
  next: string | null;
  total: number;
}
