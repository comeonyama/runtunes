import { readFile } from "node:fs/promises";
import { parse } from "dotenv";
import {
  BatchStateRepository,
  type BatchState,
} from "../repositories/batchStateRepository.js";
import { CandidateRepository } from "../repositories/candidateRepository.js";
import { loadSeeds, type Seed } from "./seedService.js";
import { SpotifySearchService } from "./spotifySearchService.js";
import type {
  CandidateTrack,
  SpotifySearchGenre,
  SpotifySearchTrack,
} from "./spotifySearchTypes.js";
import { getRetryAfterSeconds, SpotifyApiError } from "./spotifyService.js";

type BatchSeed = {
  label: string;
  query: string;
  limit: number;
};

type BatchServiceDependencies = {
  candidateRepository: CandidateRepository;
  stateRepository: BatchStateRepository;
  spotifySearchService: SpotifySearchService;
  requestIntervalMs: number;
  getAccessToken: () => Promise<string>;
  loadSeeds: (genre: SpotifySearchGenre) => Promise<Seed[]>;
  log: (message: string) => void;
  sleep: (milliseconds: number) => Promise<void>;
};

export type BatchRunResult =
  | { status: "completed"; processedSeeds: number }
  | { status: "rate-limited"; nextAllowedAt: string }
  | { status: "waiting"; nextAllowedAt: string };

const ARTIST_QUERY_LIMIT = 5;
const KEYWORD_QUERY_LIMIT = 20;
const EXCLUDED_COMPILATION_TERMS = [
  "playlist",
  "workout",
  "fitness",
  "gym",
  "compilation",
] as const;

export class BatchService {
  private readonly dependencies: BatchServiceDependencies;

  constructor(dependencies: Partial<BatchServiceDependencies> = {}) {
    this.dependencies = {
      candidateRepository: new CandidateRepository(),
      stateRepository: new BatchStateRepository(),
      spotifySearchService: new SpotifySearchService(),
      requestIntervalMs: getRequestIntervalMs(),
      getAccessToken: loadBatchAccessToken,
      loadSeeds,
      log: console.log,
      sleep: (milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)),
      ...dependencies,
    };
  }

  async run(genre: SpotifySearchGenre): Promise<BatchRunResult> {
    const runStartedAt = new Date().toISOString();
    this.dependencies.log(`[batch] 開始 genre=${genre}`);

    const state = await this.dependencies.stateRepository.load();
    const activeNextAllowedAt = getActiveNextAllowedAt(state);
    if (activeNextAllowedAt) {
      this.dependencies.log(
        `[batch] Retry-After 待機中 nextAllowedAt=${activeNextAllowedAt}`,
      );
      return { status: "waiting", nextAllowedAt: activeNextAllowedAt };
    }

    const seeds = await this.loadSeeds(genre);
    const startIndex =
      state.lastGenre === genre && state.lastSeedIndex < seeds.length
        ? state.lastSeedIndex
        : 0;
    const accessToken = await this.dependencies.getAccessToken();
    let processedSeeds = 0;

    for (let seedIndex = startIndex; seedIndex < seeds.length; seedIndex += 1) {
      const seed = seeds[seedIndex];
      if (!seed) continue;
      this.dependencies.log(
        `[batch] Seed ${seedIndex + 1}/${seeds.length}: ${seed.label}`,
      );

      try {
        const tracks =
          await this.dependencies.spotifySearchService.searchTracks(
            accessToken,
            seed.query,
            seed.limit,
          );
        this.dependencies.log(`[batch] Search件数=${tracks.length}`);
        const candidates = tracks
          .filter(isCandidateEligible)
          .map(mapSpotifyTrackToCandidate);
        const result = await this.dependencies.candidateRepository.add(
          genre,
          candidates,
        );
        this.dependencies.log(`[batch] Candidate追加件数=${result.addedCount}`);
        this.dependencies.log(`[batch] 重複件数=${result.duplicateCount}`);
        processedSeeds += 1;

        await this.dependencies.stateRepository.save({
          lastGenre: genre,
          lastSeedIndex: seedIndex + 1,
          nextAllowedAt: null,
          lastRunAt: runStartedAt,
        });
      } catch (error) {
        if (error instanceof SpotifyApiError && error.status === 429) {
          const retryAfterSeconds = getRetryAfterSeconds(error.retryAfter);
          const nextAllowedAt = new Date(
            Date.now() + retryAfterSeconds * 1_000,
          ).toISOString();
          await this.dependencies.stateRepository.save({
            lastGenre: genre,
            lastSeedIndex: seedIndex,
            nextAllowedAt,
            lastRunAt: runStartedAt,
          });
          this.dependencies.log(
            `[batch] Retry-After=${retryAfterSeconds}秒 nextAllowedAt=${nextAllowedAt}`,
          );
          return { status: "rate-limited", nextAllowedAt };
        }

        await this.dependencies.stateRepository.save({
          lastGenre: genre,
          lastSeedIndex: seedIndex,
          nextAllowedAt: null,
          lastRunAt: runStartedAt,
        });
        throw error;
      }

      if (seedIndex < seeds.length - 1) {
        this.dependencies.log(
          `[batch] 待機時間=${this.dependencies.requestIntervalMs}ms`,
        );
        await this.dependencies.sleep(this.dependencies.requestIntervalMs);
      }
    }

    await this.dependencies.stateRepository.save({
      lastGenre: genre,
      lastSeedIndex: 0,
      nextAllowedAt: null,
      lastRunAt: runStartedAt,
    });
    this.dependencies.log(`[batch] 完了 processedSeeds=${processedSeeds}`);
    return { status: "completed", processedSeeds };
  }

  private async loadSeeds(genre: SpotifySearchGenre): Promise<BatchSeed[]> {
    return (await this.dependencies.loadSeeds(genre)).map((seed) => ({
      label: `${seed.type}: ${seed.value}`,
      query:
        seed.type === "artist"
          ? `artist:"${seed.value.replaceAll('"', '\\"')}"`
          : seed.value,
      limit: seed.type === "artist" ? ARTIST_QUERY_LIMIT : KEYWORD_QUERY_LIMIT,
    }));
  }
}

function isCandidateEligible(track: SpotifySearchTrack): boolean {
  if (track.is_playable === false) return false;
  const searchableText = `${track.name} ${track.album.name}`.toLowerCase();
  return !EXCLUDED_COMPILATION_TERMS.some((term) =>
    searchableText.includes(term),
  );
}

function mapSpotifyTrackToCandidate(track: SpotifySearchTrack): CandidateTrack {
  return {
    spotifyTrackId: track.id,
    uri: track.uri,
    name: track.name,
    artists: track.artists.map((artist) => artist.name),
    album: track.album.name,
    imageUrl: track.album.images[0]?.url ?? null,
    embedUrl: `https://open.spotify.com/embed/track/${encodeURIComponent(track.id)}`,
    externalUrl: track.external_urls?.spotify ?? null,
    isPlayable: track.is_playable ?? true,
  };
}

function getActiveNextAllowedAt(state: BatchState): string | null {
  if (!state.nextAllowedAt) return null;
  const nextAllowedAt = Date.parse(state.nextAllowedAt);
  return Number.isFinite(nextAllowedAt) && nextAllowedAt > Date.now()
    ? state.nextAllowedAt
    : null;
}

function getRequestIntervalMs(): number {
  const value = Number(process.env.REQUEST_INTERVAL_MS ?? "1000");
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("REQUEST_INTERVAL_MS must be a non-negative number.");
  }
  return Math.floor(value);
}

async function loadBatchAccessToken(): Promise<string> {
  const environmentToken = process.env.SPOTIFY_BATCH_ACCESS_TOKEN?.trim();
  if (environmentToken) return environmentToken;

  try {
    const envFile = parse(
      await readFile(new URL("../../.env", import.meta.url), "utf8"),
    );
    const fileToken = envFile.SPOTIFY_BATCH_ACCESS_TOKEN?.trim();
    if (fileToken) return fileToken;
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }

  throw new Error(
    "SPOTIFY_BATCH_ACCESS_TOKEN is not set in the environment or backend/.env.",
  );
}
