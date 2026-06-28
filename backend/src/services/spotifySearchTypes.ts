export type SpotifySearchTrack = {
  id: string;
  uri: string;
  name: string;
  is_playable?: boolean;
  linked_from?: {
    external_urls: {
      spotify: string;
    };
    href: string;
    id: string;
    type: "track";
    uri: string;
  };
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  external_urls?: {
    spotify?: string;
  };
};

export type SpotifySearchCacheEntry = {
  key: string;
  cachedAt: string;
  tracks: SpotifySearchTrack[];
};

export type SpotifySearchGenre = "global" | "kpop" | "jgroove";

export type SpotifyTrackSearchResult = {
  tracks: SpotifySearchTrack[];
};
