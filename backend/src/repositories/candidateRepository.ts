import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  CandidateTrack,
  SpotifySearchGenre,
} from "../services/spotifySearchTypes.js";

type CandidateDatabase = {
  updatedAt: string | null;
  tracks: CandidateTrack[];
};

export type AddCandidatesResult = {
  addedCount: number;
  duplicateCount: number;
};

const FILE_NAMES: Record<SpotifySearchGenre, string> = {
  global: "global.json",
  jgroove: "j-groove.json",
  kpop: "k-pop.json",
};

function isCandidateTrack(value: unknown): value is CandidateTrack {
  return (
    typeof value === "object" &&
    value !== null &&
    "spotifyTrackId" in value &&
    typeof value.spotifyTrackId === "string" &&
    value.spotifyTrackId.length > 0 &&
    "uri" in value &&
    typeof value.uri === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "artists" in value &&
    Array.isArray(value.artists) &&
    value.artists.every((artist) => typeof artist === "string") &&
    "album" in value &&
    typeof value.album === "string" &&
    "imageUrl" in value &&
    (typeof value.imageUrl === "string" || value.imageUrl === null) &&
    "embedUrl" in value &&
    typeof value.embedUrl === "string" &&
    "externalUrl" in value &&
    (typeof value.externalUrl === "string" || value.externalUrl === null) &&
    "isPlayable" in value &&
    typeof value.isPlayable === "boolean"
  );
}

function isCandidateDatabase(value: unknown): value is CandidateDatabase {
  return (
    typeof value === "object" &&
    value !== null &&
    "updatedAt" in value &&
    (typeof value.updatedAt === "string" || value.updatedAt === null) &&
    "tracks" in value &&
    Array.isArray(value.tracks) &&
    value.tracks.every(isCandidateTrack)
  );
}

export class CandidateRepository {
  private readonly directoryPath: string;

  constructor(
    directoryUrl = new URL("../../data/candidates/", import.meta.url),
  ) {
    this.directoryPath = fileURLToPath(directoryUrl);
  }

  async findAll(genre: SpotifySearchGenre): Promise<CandidateTrack[]> {
    return [...(await this.load(genre)).tracks];
  }

  async search(
    genre: SpotifySearchGenre,
    limit = 50,
  ): Promise<CandidateTrack[]> {
    const tracks = await this.findAll(genre);

    for (let index = tracks.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const current = tracks[index];
      const random = tracks[randomIndex];
      if (!current || !random) continue;
      tracks[index] = random;
      tracks[randomIndex] = current;
    }

    return tracks.slice(0, Math.max(0, limit));
  }

  async add(
    genre: SpotifySearchGenre,
    candidates: readonly CandidateTrack[],
  ): Promise<AddCandidatesResult> {
    const database = await this.load(genre);
    const spotifyTrackIds = new Set(
      database.tracks.map((track) => track.spotifyTrackId),
    );
    let addedCount = 0;
    let duplicateCount = 0;

    for (const candidate of candidates) {
      if (spotifyTrackIds.has(candidate.spotifyTrackId)) {
        duplicateCount += 1;
        continue;
      }

      spotifyTrackIds.add(candidate.spotifyTrackId);
      database.tracks.push(candidate);
      addedCount += 1;
    }

    if (addedCount > 0) {
      database.updatedAt = new Date().toISOString();
      await this.save(genre, database);
    }

    return { addedCount, duplicateCount };
  }

  private async load(genre: SpotifySearchGenre): Promise<CandidateDatabase> {
    const filePath = this.getFilePath(genre);

    try {
      const value: unknown = JSON.parse(await readFile(filePath, "utf8"));
      if (!isCandidateDatabase(value)) {
        throw new Error(`Invalid candidate database: ${filePath}`);
      }
      return value;
    } catch (error) {
      if (isFileNotFoundError(error)) {
        return { updatedAt: null, tracks: [] };
      }
      throw error;
    }
  }

  private async save(
    genre: SpotifySearchGenre,
    database: CandidateDatabase,
  ): Promise<void> {
    await mkdir(this.directoryPath, { recursive: true });
    const filePath = this.getFilePath(genre);
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(database, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, filePath);
  }

  private getFilePath(genre: SpotifySearchGenre): string {
    return join(this.directoryPath, FILE_NAMES[genre]);
  }
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
