import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export type SpotifyRateLimitState = {
  rateLimitedUntil: number;
  retryAfterSeconds: number;
  updatedAt: string;
};

function isSpotifyRateLimitState(
  value: unknown,
): value is SpotifyRateLimitState {
  return (
    typeof value === "object" &&
    value !== null &&
    "rateLimitedUntil" in value &&
    typeof value.rateLimitedUntil === "number" &&
    Number.isFinite(value.rateLimitedUntil) &&
    "retryAfterSeconds" in value &&
    typeof value.retryAfterSeconds === "number" &&
    Number.isFinite(value.retryAfterSeconds) &&
    "updatedAt" in value &&
    typeof value.updatedAt === "string"
  );
}

export class FileSpotifyRateLimitStore {
  private readonly filePath: string;

  constructor(fileUrl: URL) {
    this.filePath = fileURLToPath(fileUrl);
  }

  async load(): Promise<SpotifyRateLimitState | null> {
    try {
      const value: unknown = JSON.parse(await readFile(this.filePath, "utf8"));

      if (!isSpotifyRateLimitState(value)) {
        throw new Error(`Invalid Spotify rate limit file: ${this.filePath}`);
      }

      return value;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return null;
      }

      throw error;
    }
  }

  async save(state: SpotifyRateLimitState): Promise<void> {
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
