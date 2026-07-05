import type { GENRE_OPTIONS } from "../constants/genres";

export type Genre = (typeof GENRE_OPTIONS)[number]["value"];

export type Pace = "easy" | "middle" | "hard";

export type PlaylistFormData = {
  durationMinutes: number;
  pace: Pace;
  genre: Genre;
};
