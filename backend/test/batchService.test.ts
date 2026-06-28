import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { BatchStateRepository } from "../src/repositories/batchStateRepository.js";
import { CandidateRepository } from "../src/repositories/candidateRepository.js";
import { BatchService } from "../src/services/batchService.js";
import { SpotifySearchService } from "../src/services/spotifySearchService.js";
import type { SpotifySearchTrack } from "../src/services/spotifySearchTypes.js";
import { SpotifyApiError } from "../src/services/spotifyService.js";

class FakeSpotifySearchService extends SpotifySearchService {
  calls = 0;
  limits: number[] = [];
  queries: string[] = [];

  constructor(
    private readonly handler: (query: string) => Promise<SpotifySearchTrack[]>,
  ) {
    super();
  }

  override async searchTracks(
    _accessToken: string,
    query: string,
    limit: number,
  ): Promise<SpotifySearchTrack[]> {
    this.calls += 1;
    this.queries.push(query);
    this.limits.push(limit);
    return this.handler(query);
  }
}

const loadTestSeeds = async () => [
  { type: "artist" as const, value: "Artist One", weight: 1 },
  { type: "artist" as const, value: 'Artist "Two"', weight: 1 },
  { type: "keyword" as const, value: "k-pop dance", weight: 1 },
];

async function createRepositories() {
  const directory = await mkdtemp(join(tmpdir(), "runtunes-batch-"));
  const directoryUrl = pathToFileURL(`${directory}/`);
  const candidateRepository = new CandidateRepository(
    new URL("candidates/", directoryUrl),
  );
  const stateRepository = new BatchStateRepository(
    new URL("batch-state.json", directoryUrl),
  );

  return {
    candidateRepository,
    stateRepository,
    cleanup: () => rm(directory, { recursive: true, force: true }),
  };
}

function createTrack(id = "track1"): SpotifySearchTrack {
  return {
    id,
    uri: `spotify:track:${id}`,
    name: "Test Track",
    artists: [{ name: "Test Artist" }],
    album: { name: "Test Album", images: [] },
    external_urls: { spotify: `https://open.spotify.com/track/${id}` },
  };
}

test("adds candidates once and resets progress after completion", async () => {
  const repositories = await createRepositories();

  try {
    const searchService = new FakeSpotifySearchService(async () => [
      createTrack(),
    ]);
    const batch = new BatchService({
      ...repositories,
      spotifySearchService: searchService,
      requestIntervalMs: 0,
      getAccessToken: async () => "token",
      loadSeeds: loadTestSeeds,
      log: () => undefined,
      sleep: async () => undefined,
    });

    const result = await batch.run("global");
    assert.deepEqual(result, { status: "completed", processedSeeds: 3 });
    assert.equal(searchService.calls, 3);
    assert.deepEqual(searchService.queries, [
      'artist:"Artist One"',
      'artist:"Artist \\"Two\\""',
      "k-pop dance",
    ]);
    assert.deepEqual(searchService.limits, [5, 5, 20]);
    assert.equal(
      (await repositories.candidateRepository.findAll("global")).length,
      1,
    );
    const state = await repositories.stateRepository.load();
    assert.equal(state.lastSeedIndex, 0);
    assert.equal(state.nextAllowedAt, null);
  } finally {
    await repositories.cleanup();
  }
});

test("persists Retry-After and the current seed when Spotify returns 429", async () => {
  const repositories = await createRepositories();

  try {
    const searchService = new FakeSpotifySearchService(async () => {
      throw new SpotifyApiError("rate limited", 429, "120");
    });
    const batch = new BatchService({
      ...repositories,
      spotifySearchService: searchService,
      requestIntervalMs: 0,
      getAccessToken: async () => "token",
      loadSeeds: loadTestSeeds,
      log: () => undefined,
      sleep: async () => undefined,
    });

    const result = await batch.run("global");
    assert.equal(result.status, "rate-limited");
    const state = await repositories.stateRepository.load();
    assert.equal(state.lastGenre, "global");
    assert.equal(state.lastSeedIndex, 0);
    assert.ok(state.nextAllowedAt);
    assert.ok(Date.parse(state.nextAllowedAt) > Date.now());
  } finally {
    await repositories.cleanup();
  }
});

test("does not load a token or call Spotify before nextAllowedAt", async () => {
  const repositories = await createRepositories();

  try {
    const nextAllowedAt = new Date(Date.now() + 60_000).toISOString();
    await repositories.stateRepository.save({
      lastGenre: "global",
      lastSeedIndex: 2,
      nextAllowedAt,
      lastRunAt: new Date().toISOString(),
    });
    let tokenLoads = 0;
    const searchService = new FakeSpotifySearchService(async () => [
      createTrack(),
    ]);
    const batch = new BatchService({
      ...repositories,
      spotifySearchService: searchService,
      requestIntervalMs: 0,
      getAccessToken: async () => {
        tokenLoads += 1;
        return "token";
      },
      log: () => undefined,
      sleep: async () => undefined,
    });

    assert.deepEqual(await batch.run("global"), {
      status: "waiting",
      nextAllowedAt,
    });
    assert.equal(tokenLoads, 0);
    assert.equal(searchService.calls, 0);
  } finally {
    await repositories.cleanup();
  }
});
