import { readFile } from "node:fs/promises";
import type { SpotifySearchGenre } from "./spotifySearchTypes.js";

export type Seed = {
  type: "artist" | "keyword";
  value: string;
  weight: number;
};

type SeedInput =
  | string
  | {
      name?: unknown;
      value?: unknown;
      weight?: unknown;
    };

const SEED_FILE_NAMES: Record<SpotifySearchGenre, string> = {
  global: "global-seed.json",
  jgroove: "jgroove-seed.json",
  kpop: "kpop-seed.json",
};

function normalizeSeed(value: unknown, type: Seed["type"]): Seed | null {
  const input: SeedInput =
    typeof value === "string"
      ? value
      : typeof value === "object" && value !== null
        ? value
        : {};
  const seedValue =
    typeof input === "string"
      ? input.trim()
      : type === "artist" && typeof input.name === "string"
        ? input.name.trim()
        : typeof input.value === "string"
          ? input.value.trim()
          : "";
  const weight =
    typeof input === "object" &&
    typeof input.weight === "number" &&
    Number.isFinite(input.weight) &&
    input.weight > 0
      ? input.weight
      : 1;

  return seedValue ? { type, value: seedValue, weight } : null;
}

export async function loadSeeds(genre: SpotifySearchGenre): Promise<Seed[]> {
  const seedUrl = new URL(
    `../../data/${SEED_FILE_NAMES[genre]}`,
    import.meta.url,
  );
  const contents = await readFile(seedUrl, "utf8");
  const data: unknown = JSON.parse(contents);

  if (typeof data !== "object" || data === null) {
    throw new Error(`${genre} seed JSON must be an object.`);
  }
  if (!("artists" in data) || !Array.isArray(data.artists)) {
    throw new Error(`${genre} seed JSON must contain an artists array.`);
  }

  const keywords =
    genre !== "kpop" && "keywords" in data && Array.isArray(data.keywords)
      ? data.keywords
      : [];

  return [
    ...data.artists.flatMap((artist) => {
      const normalized = normalizeSeed(artist, "artist");
      return normalized ? [normalized] : [];
    }),
    ...keywords.flatMap((keyword) => {
      const normalized = normalizeSeed(keyword, "keyword");
      return normalized ? [normalized] : [];
    }),
  ];
}
