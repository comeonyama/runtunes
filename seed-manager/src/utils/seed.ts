import type { SpotifyArtist } from "../types/spotify";

export interface ArtistOption {
  key: string;
  name: string;
  selected: boolean;
}

export interface SeedJson {
  name: string;
  artists: string[];
}

export function extractPlaylistId(value: string) {
  const trimmedValue = value.trim();

  try {
    const url = new URL(trimmedValue);
    if (url.hostname !== "open.spotify.com") return null;

    const segments = url.pathname.split("/").filter(Boolean);
    const playlistIndex = segments.indexOf("playlist");
    const id = playlistIndex >= 0 ? segments[playlistIndex + 1] : undefined;

    return id && /^[A-Za-z0-9]+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function toUniqueArtistOptions(artists: SpotifyArtist[]) {
  const seenNames = new Set<string>();
  const options: ArtistOption[] = [];

  for (const artist of artists) {
    const name = artist.name.trim();
    const normalizedName = name.normalize("NFKC").toLocaleLowerCase();
    if (!name || seenNames.has(normalizedName)) continue;

    seenNames.add(normalizedName);
    options.push({
      key: normalizedName,
      name,
      selected: true,
    });
  }

  return options;
}

export function createSeedJson(name: string, artists: ArtistOption[]): SeedJson {
  return {
    name: name.trim(),
    artists: artists.filter((artist) => artist.selected).map((artist) => artist.name),
  };
}

export function serializeSeed(seed: SeedJson) {
  return `${JSON.stringify(seed, null, 2)}\n`;
}

export function createSeedFilename(name: string) {
  const slug = name
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "runtunes-seed"}.json`;
}
