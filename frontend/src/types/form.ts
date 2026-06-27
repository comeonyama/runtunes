import type { GENRE_OPTIONS } from "../constants/genres";
import type { MOOD_OPTIONS } from "../constants/moods";

export type Genre = (typeof GENRE_OPTIONS)[number]["value"];
export type Mood = (typeof MOOD_OPTIONS)[number]["value"];

export type PlaylistFormData = {
  distanceKm: number;
  paceSeconds: number;
  genre: Genre;
  mood: Mood;
};
