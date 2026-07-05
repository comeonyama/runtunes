export type CandidateTrack = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  album: string;
  imageUrl: string | null;
  embedUrl: string;
  externalUrl: string | null;
  isPlayable: boolean;
};
