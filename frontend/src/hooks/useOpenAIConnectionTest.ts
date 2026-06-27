import { useMutation } from "@tanstack/react-query";
import { requestOpenAIConnectionTest } from "../services/openaiService";

export function useOpenAIConnectionTest() {
  return useMutation({ mutationFn: requestOpenAIConnectionTest });
}
