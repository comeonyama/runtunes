import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUserProfile } from "../services/spotify/profile";

export const spotifyProfileQueryKey = ["spotify", "profile"] as const;

export function useSpotifyProfile(isSpotifyConnected: boolean) {
  return useQuery({
    queryKey: spotifyProfileQueryKey,
    queryFn: fetchCurrentUserProfile,
    enabled: isSpotifyConnected,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
