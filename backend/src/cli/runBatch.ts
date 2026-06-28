import { BatchService } from "../services/batchService.js";
import type { SpotifySearchGenre } from "../services/spotifySearchTypes.js";

const genre = process.argv[2];

if (!isSpotifySearchGenre(genre)) {
  console.error("Usage: runBatch <global|jgroove|kpop>");
  process.exitCode = 1;
} else {
  try {
    await new BatchService().run(genre);
  } catch (error) {
    console.error(
      `[batch] 失敗: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}

function isSpotifySearchGenre(value: unknown): value is SpotifySearchGenre {
  return ["global", "jgroove", "kpop"].includes(String(value));
}
