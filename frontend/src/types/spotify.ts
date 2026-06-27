export type Image = {
  url: string;
  height: number | null;
  width: number | null;
};

export type SpotifyImage = Image;

export type SpotifyExternalUrls = {
  spotify: string;
};

export type SpotifyTokenResponse = {
  access_token: string;
  token_type: "Bearer";
  scope: string;
  expires_in: number;
  refresh_token: string;
};

export type SpotifyUserProfile = {
  id: string;
  display_name: string | null;
  product?: string;
  images: SpotifyImage[];
};

export type Artist = {
  id: string;
  name: string;
  external_urls?: SpotifyExternalUrls;
};

export type Album = {
  id: string;
  name: string;
  images: Image[];
};

export type Track = {
  id: string;
  name: string;
  artists: Artist[];
  album: Album;
  external_urls?: Partial<SpotifyExternalUrls>;
};

export type SearchResponse = {
  tracks: {
    items: Track[];
    total: number;
    limit: number;
    offset: number;
    next: string | null;
    previous: string | null;
  };
};
