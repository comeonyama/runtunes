import assert from "node:assert/strict";
import test from "node:test";
import {
  getTrackSelectionCounts,
  mergeTrackSelections,
  selectRandomSurpriseTracks,
  type TrackSelectionCandidate,
} from "../src/services/openaiService.js";

function createTrack(id: string, artist: string): TrackSelectionCandidate {
  return {
    id,
    name: `Track ${id}`,
    artists: [artist],
    album: `Album ${id}`,
  };
}

test("allocates approximately 80 percent rule-based and 20 percent surprise tracks", () => {
  assert.deepEqual(getTrackSelectionCounts(5), {
    ruleBasedTrackCount: 4,
    surpriseTrackCount: 1,
  });
  assert.deepEqual(getTrackSelectionCounts(8), {
    ruleBasedTrackCount: 6,
    surpriseTrackCount: 2,
  });
  assert.deepEqual(getTrackSelectionCounts(20), {
    ruleBasedTrackCount: 16,
    surpriseTrackCount: 4,
  });
});

test("random surprise selection spreads picks across artists", () => {
  const tracks = [
    createTrack("a1", "Artist A"),
    createTrack("a2", "Artist A"),
    createTrack("b1", "Artist B"),
    createTrack("c1", "Artist C"),
  ];
  const selected = selectRandomSurpriseTracks(tracks, 3, () => 0.5);

  assert.equal(selected.length, 3);
  assert.equal(new Set(selected.map((track) => track.artists[0])).size, 3);
});

test("distributes surprise tracks through the AI-selected sequence", () => {
  assert.deepEqual(
    mergeTrackSelections(["a", "b", "c", "d", "e", "f"], ["x", "y"]),
    ["a", "b", "x", "c", "d", "y", "e", "f"],
  );
});
