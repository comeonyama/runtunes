import { useMutation } from "@tanstack/react-query";
import { requestAITrackSelection } from "../services/openaiService";

export function useAITrackSelection() {
  return useMutation({ mutationFn: requestAITrackSelection });
}
