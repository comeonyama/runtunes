import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SpotifySearchGenre } from "../services/spotifySearchTypes.js";

export type BatchState = {
  lastGenre: SpotifySearchGenre | null;
  lastSeedIndex: number;
  nextAllowedAt: string | null;
  lastRunAt: string | null;
};

const EMPTY_STATE: BatchState = {
  lastGenre: null,
  lastSeedIndex: 0,
  nextAllowedAt: null,
  lastRunAt: null,
};

function isBatchState(value: unknown): value is BatchState {
  return (
    typeof value === "object" &&
    value !== null &&
    "lastGenre" in value &&
    (value.lastGenre === null ||
      ["global", "jgroove", "kpop"].includes(String(value.lastGenre))) &&
    "lastSeedIndex" in value &&
    typeof value.lastSeedIndex === "number" &&
    Number.isInteger(value.lastSeedIndex) &&
    value.lastSeedIndex >= 0 &&
    "nextAllowedAt" in value &&
    (typeof value.nextAllowedAt === "string" || value.nextAllowedAt === null) &&
    "lastRunAt" in value &&
    (typeof value.lastRunAt === "string" || value.lastRunAt === null)
  );
}

export class BatchStateRepository {
  private readonly filePath: string;

  constructor(
    fileUrl = new URL("../../data/batch-state.json", import.meta.url),
  ) {
    this.filePath = fileURLToPath(fileUrl);
  }

  async load(): Promise<BatchState> {
    try {
      const value: unknown = JSON.parse(await readFile(this.filePath, "utf8"));
      if (!isBatchState(value)) {
        throw new Error(`Invalid batch state: ${this.filePath}`);
      }
      return value;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return { ...EMPTY_STATE };
      }
      throw error;
    }
  }

  async save(state: BatchState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(state, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, this.filePath);
  }
}
