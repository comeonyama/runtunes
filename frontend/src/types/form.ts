import type { GENRE_OPTIONS } from "../constants/genres";

export type Genre = (typeof GENRE_OPTIONS)[number]["value"];

export type PlaylistFormData = {
  distanceKm: number;
  paceSeconds: number;
  genre: Genre;
};
