export type PlaylistTrack = {
  id: string;
  name: string;
  artists: string[];
  durationMs: number;
  albumImageUrl: string | null;
};

export type GeneratedPlaylist = {
  id: string;
  name: string;
  description: string;
  tracks: PlaylistTrack[];
};
