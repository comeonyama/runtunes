export type SpotifyImage = {
  url: string;
  height: number | null;
  width: number | null;
};

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
