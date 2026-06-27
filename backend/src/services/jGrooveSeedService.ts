import { readFile } from "node:fs/promises";

export type JGrooveSeedArtist = {
  name: string;
  weight: number;
};

type JGrooveSeedArtistInput =
  | string
  | {
      name?: unknown;
      weight?: unknown;
    };

function normalizeArtist(value: unknown): JGrooveSeedArtist | null {
  const input: JGrooveSeedArtistInput =
    typeof value === "string"
      ? value
      : typeof value === "object" && value !== null
        ? value
        : {};
  const name =
    typeof input === "string"
      ? input.trim()
      : typeof input.name === "string"
        ? input.name.trim()
        : "";
  const weight =
    typeof input === "object" &&
    typeof input.weight === "number" &&
    Number.isFinite(input.weight) &&
    input.weight > 0
      ? input.weight
      : 1;

  return name ? { name, weight } : null;
}

export async function loadJGrooveSeedArtists(): Promise<JGrooveSeedArtist[]> {
  const seedUrl = new URL("../../data/jgroove-seed.json", import.meta.url);
  const contents = await readFile(seedUrl, "utf8");
  const data: unknown = JSON.parse(contents);

  if (
    typeof data !== "object" ||
    data === null ||
    !("artists" in data) ||
    !Array.isArray(data.artists)
  ) {
    throw new Error("J-Groove seed JSON must contain an artists array.");
  }

  return data.artists.flatMap((artist) => {
    const normalized = normalizeArtist(artist);
    return normalized ? [normalized] : [];
  });
}
