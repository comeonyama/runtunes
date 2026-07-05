import { useMutation } from "@tanstack/react-query";
import { createSpotifyPlaylist } from "../services/spotify/playlist";

export function useCreateSpotifyPlaylist() {
  return useMutation({ mutationFn: createSpotifyPlaylist });
}
