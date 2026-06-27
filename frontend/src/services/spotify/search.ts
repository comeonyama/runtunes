import axios from "axios";
import type { CandidateTrack } from "../../types/candidateTrack";
import type { PlaylistFormData } from "../../types/form";
import { getStoredAccessToken } from "./auth";
import { spotifyClient } from "./client";

export type TrackSearchCriteria = Pick<PlaylistFormData, "genre" | "mood">;

type SpotifySearchResponse = {
  tracks: {
    items: SpotifyTrack[];
  };
};

type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  external_urls?: {
    spotify?: string;
  };
};

export function mapSpotifySearchResponseToCandidateTracks(
  response: SpotifySearchResponse,
): CandidateTrack[] {
  return response.tracks.items.map((track) => ({
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: track.artists.map((artist) => artist.name),
    album: track.album.name,
    imageUrl: track.album.images[0]?.url ?? null,
    externalUrl: track.external_urls?.spotify ?? null,
  }));
}

export async function searchTracks({
  genre,
  mood,
}: TrackSearchCriteria): Promise<CandidateTrack[]> {
  const accessToken = getStoredAccessToken();

  if (!accessToken) {
    throw new Error("Spotify access token is not available.");
  }

  const { data } = await spotifyClient.get<SpotifySearchResponse>("/search", {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      q: `genre:${genre} ${mood}`,
      type: "track",
      limit: 10,
      market: "JP",
    },
  });

  return mapSpotifySearchResponseToCandidateTracks(data);
}

export function isSpotifyUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}
