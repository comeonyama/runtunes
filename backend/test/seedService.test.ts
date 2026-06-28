import assert from "node:assert/strict";
import test from "node:test";
import { loadSeeds } from "../src/services/seedService.js";
import type { SpotifySearchGenre } from "../src/services/spotifySearchTypes.js";

const GENRES: readonly SpotifySearchGenre[] = ["global", "jgroove", "kpop"];

test("loads seeds for every candidate genre", async () => {
  for (const genre of GENRES) {
    const seeds = await loadSeeds(genre);

    assert.ok(seeds.length > 0, `${genre} must have at least one seed`);
    assert.ok(
      seeds.every(({ value, weight }) => value.trim().length > 0 && weight > 0),
    );
  }
});

test("loads both artist and keyword seeds for K-Pop", async () => {
  const seeds = await loadSeeds("kpop");

  assert.ok(seeds.some((seed) => seed.type === "artist"));
  assert.ok(seeds.some((seed) => seed.type === "keyword"));
});
