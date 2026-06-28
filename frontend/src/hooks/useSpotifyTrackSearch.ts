import { useMutation } from "@tanstack/react-query";
import { searchTracks } from "../services/spotify/search";

export function useSpotifyTrackSearch() {
  return useMutation({
    mutationFn: searchTracks,
    retry: false,
  });
}
