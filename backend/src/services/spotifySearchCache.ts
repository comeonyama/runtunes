import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SpotifySearchCacheEntry } from "./spotifySearchTypes.js";

export interface SpotifySearchCache {
  get(key: string): Promise<SpotifySearchCacheEntry | null>;
  set(entry: SpotifySearchCacheEntry): Promise<void>;
}

function isSpotifySearchCacheEntry(
  value: unknown,
): value is SpotifySearchCacheEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "key" in value &&
    typeof value.key === "string" &&
    "cachedAt" in value &&
    typeof value.cachedAt === "string" &&
    "tracks" in value &&
    Array.isArray(value.tracks)
  );
}

function getCacheFileName(key: string): string {
  const slug = key
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  const hash = createHash("sha256").update(key).digest("hex").slice(0, 12);
  if (slug) return `${slug}-${hash}.json`;

  return `search-${hash}.json`;
}

export class FileSpotifySearchCache implements SpotifySearchCache {
  private readonly directoryPath: string;

  constructor(directoryUrl: URL) {
    this.directoryPath = fileURLToPath(directoryUrl);
  }

  async get(key: string): Promise<SpotifySearchCacheEntry | null> {
    const filePath = this.getFilePath(key);

    try {
      const contents = await readFile(filePath, "utf8");
      const data: unknown = JSON.parse(contents);

      if (!isSpotifySearchCacheEntry(data)) {
        throw new Error(`Invalid Spotify cache file: ${filePath}`);
      }

      if (data.key !== key) {
        throw new Error(`Spotify cache key mismatch: ${filePath}`);
      }

      return data;
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

  async set(entry: SpotifySearchCacheEntry): Promise<void> {
    await mkdir(this.directoryPath, { recursive: true });

    const filePath = this.getFilePath(entry.key);
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(entry, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, filePath);
  }

  private getFilePath(key: string): string {
    return join(this.directoryPath, getCacheFileName(key));
  }
}
