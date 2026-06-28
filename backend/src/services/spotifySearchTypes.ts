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

export type SpotifySearchGenre = "global" | "kpop" | "jgroove";

export type CandidateTrack = {
  spotifyTrackId: string;
  uri: string;
  name: string;
  artists: string[];
  album: string;
  imageUrl: string | null;
  embedUrl: string;
  externalUrl: string | null;
  isPlayable: boolean;
};

export type SpotifyTrackSearchResult = {
  tracks: Array<Omit<CandidateTrack, "spotifyTrackId"> & { id: string }>;
};
