import type { JGrooveSeedArtist } from "./jGrooveSeedService.js";
import type { FileSpotifyRateLimitStore } from "./spotifyRateLimitStore.js";
import type { SpotifySearchApi } from "./spotifySearchApi.js";
import type { SpotifySearchCache } from "./spotifySearchCache.js";
import type {
  SpotifySearchGenre,
  SpotifySearchTrack,
  SpotifyTrackSearchResult,
} from "./spotifySearchTypes.js";
import { SpotifyApiError } from "./spotifyService.js";

type SpotifySearchServiceDependencies = {
  cache: SpotifySearchCache;
  loadJGrooveSeedArtists: () => Promise<JGrooveSeedArtist[]>;
  log: (message: string) => void;
  rateLimitStore: FileSpotifyRateLimitStore;
  spotifyApi: SpotifySearchApi;
};

type SearchPlan = {
  cacheKey: string;
  label: string;
  limit: number;
  query: string;
};

const SEARCH_QUERIES: Record<"global" | "kpop", readonly string[]> = {
  global: ["pop", "rock", "hip hop"],
  kpop: ["k-pop", "kpop", "korean pop"],
};
const J_GROOVE_ARTIST_LIMIT = 10;
const MIN_TRACK_COUNT = 5;
const STANDARD_QUERY_LIMIT = 5;
const ARTIST_QUERY_LIMIT = 3;

export class SpotifySearchService {
  private apiQueue: Promise<void> = Promise.resolve();
  private readonly inFlightSearches = new Map<
    string,
    Promise<SpotifySearchTrack[]>
  >();
  private rateLimitedUntil = 0;

  constructor(
    private readonly dependencies: SpotifySearchServiceDependencies,
  ) {}

  async initialize(): Promise<void> {
    const state = await this.dependencies.rateLimitStore.load();

    if (!state) return;

    this.rateLimitedUntil = state.rateLimitedUntil;
    if (this.rateLimitedUntil > Date.now()) {
      this.dependencies.log(
        `rate limit active until: ${new Date(this.rateLimitedUntil).toISOString()}`,
      );
    }
  }

  async searchTracks(
    accessToken: string,
    genre: SpotifySearchGenre,
  ): Promise<SpotifyTrackSearchResult> {
    const plans = await this.buildSearchPlans(genre);
    const tracks: SpotifySearchTrack[] = [];
    const cacheMisses: SearchPlan[] = [];
    let cachedTrackCount = 0;

    for (const plan of plans) {
      const cached = await this.dependencies.cache.get(plan.cacheKey);

      if (cached) {
        this.dependencies.log(`cache hit: ${plan.label}`);
        tracks.push(...cached.tracks);
        cachedTrackCount += cached.tracks.length;
      } else {
        this.dependencies.log(`cache miss: ${plan.label}`);
        cacheMisses.push(plan);
      }
    }

    this.dependencies.log(`returned cached tracks count: ${cachedTrackCount}`);

    let rateLimitError: SpotifyApiError | null = null;

    for (const plan of cacheMisses) {
      try {
        tracks.push(...(await this.searchAndCache(accessToken, plan)));
      } catch (error) {
        if (error instanceof SpotifyApiError && error.status === 429) {
          rateLimitError = error;
          break;
        }

        throw error;
      }
    }

    const finalTracks = dedupeTracks(tracks);
    this.dependencies.log(`returned final tracks count: ${finalTracks.length}`);

    if (rateLimitError && finalTracks.length < MIN_TRACK_COUNT) {
      throw rateLimitError;
    }

    if (finalTracks.length < MIN_TRACK_COUNT) {
      const remainingSeconds = this.getRemainingRateLimitSeconds();
      if (remainingSeconds > 0) {
        throw new SpotifyApiError(
          "Spotify rate limit exceeded.",
          429,
          String(remainingSeconds),
        );
      }

      throw new SpotifyApiError(
        "Not enough Spotify track candidates are available.",
        503,
      );
    }

    return { tracks: finalTracks };
  }

  getRemainingRateLimitSeconds(): number {
    const remainingSeconds = Math.ceil(
      (this.rateLimitedUntil - Date.now()) / 1_000,
    );

    if (remainingSeconds > 0) {
      this.dependencies.log(
        `rate limit active until: ${new Date(this.rateLimitedUntil).toISOString()}`,
      );
    }

    return Math.max(0, remainingSeconds);
  }

  async recordRateLimit(retryAfter: string | undefined): Promise<number> {
    const retryAfterSeconds = getRetryAfterSeconds(retryAfter);
    this.rateLimitedUntil = Date.now() + retryAfterSeconds * 1_000;
    this.dependencies.log(
      `spotify rate limited: retry after ${retryAfterSeconds} seconds`,
    );
    this.dependencies.log(
      `rate limit active until: ${new Date(this.rateLimitedUntil).toISOString()}`,
    );
    await this.dependencies.rateLimitStore.save({
      rateLimitedUntil: this.rateLimitedUntil,
      retryAfterSeconds,
      updatedAt: new Date().toISOString(),
    });
    return retryAfterSeconds;
  }

  private async buildSearchPlans(
    genre: SpotifySearchGenre,
  ): Promise<SearchPlan[]> {
    if (genre !== "jgroove") {
      return SEARCH_QUERIES[genre].map((query) => ({
        cacheKey: `${genre}:query:${query}`,
        label: query,
        limit: STANDARD_QUERY_LIMIT,
        query,
      }));
    }

    return shuffle(await this.dependencies.loadJGrooveSeedArtists())
      .slice(0, J_GROOVE_ARTIST_LIMIT)
      .map(({ name }) => ({
        cacheKey: `jgroove:artist:${name.normalize("NFKC").toLocaleLowerCase("en-US")}`,
        label: name,
        limit: ARTIST_QUERY_LIMIT,
        query: `artist:"${name.replaceAll('"', '\\"')}"`,
      }));
  }

  private async searchAndCache(
    accessToken: string,
    plan: SearchPlan,
  ): Promise<SpotifySearchTrack[]> {
    const existingSearch = this.inFlightSearches.get(plan.cacheKey);
    if (existingSearch) return existingSearch;

    const search = this.fetchAndCache(accessToken, plan);
    this.inFlightSearches.set(plan.cacheKey, search);

    try {
      return await search;
    } finally {
      this.inFlightSearches.delete(plan.cacheKey);
    }
  }

  private async fetchAndCache(
    accessToken: string,
    plan: SearchPlan,
  ): Promise<SpotifySearchTrack[]> {
    const previousSearch = this.apiQueue;
    let releaseQueue: () => void = () => undefined;
    this.apiQueue = new Promise((resolve) => {
      releaseQueue = resolve;
    });

    await previousSearch;

    try {
      const remainingSeconds = this.getRemainingRateLimitSeconds();

      if (remainingSeconds > 0) {
        throw new SpotifyApiError(
          "Spotify rate limit exceeded.",
          429,
          String(remainingSeconds),
        );
      }

      this.dependencies.log(`spotify api call: ${plan.label}`);
      let tracks: SpotifySearchTrack[];

      try {
        tracks = await this.dependencies.spotifyApi.searchTracks(
          accessToken,
          plan.query,
          plan.limit,
        );
      } catch (error) {
        if (error instanceof SpotifyApiError && error.status === 429) {
          const retryAfterSeconds = await this.recordRateLimit(
            error.retryAfter,
          );
          throw new SpotifyApiError(
            "Spotify rate limit exceeded.",
            429,
            String(retryAfterSeconds),
          );
        }

        throw error;
      }

      await this.dependencies.cache.set({
        key: plan.cacheKey,
        cachedAt: new Date().toISOString(),
        tracks,
      });

      return tracks;
    } finally {
      releaseQueue();
    }
  }
}

export function getRetryAfterSeconds(retryAfter: string | undefined): number {
  const seconds = Number(retryAfter);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(1, Math.ceil(seconds));
  }

  if (retryAfter) {
    const retryDate = Date.parse(retryAfter);
    if (Number.isFinite(retryDate)) {
      return Math.max(1, Math.ceil((retryDate - Date.now()) / 1_000));
    }
  }

  return 60;
}

function dedupeTracks(tracks: SpotifySearchTrack[]): SpotifySearchTrack[] {
  const seenIds = new Set<string>();

  return tracks.filter(({ id }) => {
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
}

function shuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const item = shuffled[index];
    const randomItem = shuffled[randomIndex];

    if (item === undefined || randomItem === undefined) continue;

    shuffled[index] = randomItem;
    shuffled[randomIndex] = item;
  }

  return shuffled;
}
