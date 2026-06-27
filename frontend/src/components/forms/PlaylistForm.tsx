import {
  Clock3,
  Flame,
  Globe2,
  MicVocal,
  Moon,
  Music2,
  Ruler,
  Smile,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState, type CSSProperties } from "react";
import { GENRE_OPTIONS } from "../../constants/genres";
import { MOOD_OPTIONS } from "../../constants/moods";
import type { Genre, Mood, PlaylistFormData } from "../../types/form";

const DISTANCE_RANGE = {
  min: 1,
  max: 50,
  step: 0.5,
  defaultValue: 10,
} as const;

const PACE_RANGE = {
  min: 3 * 60,
  max: 8 * 60,
  step: 5,
  defaultValue: 5 * 60 + 30,
} as const;

type ChoiceOption<T extends string> = {
  icon: LucideIcon;
  label: string;
  value: T;
};

const genreIcons: Record<Genre, LucideIcon> = {
  global: Globe2,
  jpop: Music2,
  kpop: MicVocal,
};

const moodIcons: Record<Mood, LucideIcon> = {
  motivation: Flame,
  happy: Smile,
  relax: Moon,
};

const genreChoices: readonly ChoiceOption<Genre>[] = GENRE_OPTIONS.map(
  (option) => ({ ...option, icon: genreIcons[option.value] }),
);

const moodChoices: readonly ChoiceOption<Mood>[] = MOOD_OPTIONS.map(
  (option) => ({ ...option, icon: moodIcons[option.value] }),
);

const choiceGridClassName = {
  2: "grid-cols-2",
  3: "grid-cols-3",
} as const;

export type PlaylistFormProps = {
  isLoading?: boolean;
  isSpotifyConnected?: boolean;
  onSubmit: (formData: PlaylistFormData) => void;
};

type RangeControlProps = {
  disabled?: boolean;
  endLabel: string;
  formatValue: (value: number) => string;
  icon: LucideIcon;
  id: string;
  label: string;
  max: number;
  min: number;
  name: string;
  onChange: (value: number) => void;
  startLabel: string;
  step: number;
  value: number;
};

function RangeControl({
  disabled,
  endLabel,
  formatValue,
  icon: Icon,
  id,
  label,
  max,
  min,
  name,
  onChange,
  startLabel,
  step,
  value,
}: RangeControlProps) {
  const progress = ((value - min) / (max - min)) * 100;
  const displayValue = formatValue(value);
  const sliderStyle = {
    "--range-progress": `${progress}%`,
  } as CSSProperties;

  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 transition-colors duration-200 hover:border-white/15 sm:p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
        <Icon
          aria-hidden="true"
          className="size-[18px] text-run-green"
          strokeWidth={1.75}
        />
        <label htmlFor={id}>{label}</label>
      </div>

      <output
        className="mt-3 block text-3xl font-bold tracking-tight text-white tabular-nums sm:text-4xl"
        htmlFor={id}
      >
        {displayValue}
      </output>

      <input
        aria-valuetext={displayValue}
        className="range-slider mt-7 w-full"
        disabled={disabled}
        id={id}
        max={max}
        min={min}
        name={name}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        step={step}
        style={sliderStyle}
        type="range"
        value={value}
      />

      <div className="mt-3 flex justify-between text-xs font-medium text-neutral-500">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </section>
  );
}

type ChoiceGroupProps<T extends string> = {
  columns?: 2 | 3;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  name: string;
  onChange: (value: T) => void;
  options: readonly ChoiceOption<T>[];
  value: T;
};

function ChoiceGroup<T extends string>({
  columns = 3,
  disabled,
  icon: GroupIcon,
  label,
  name,
  onChange,
  options,
  value,
}: ChoiceGroupProps<T>) {
  return (
    <fieldset className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
      <legend className="sr-only">{label}</legend>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-300">
        <GroupIcon
          aria-hidden="true"
          className="size-[18px] text-run-green"
          strokeWidth={1.75}
        />
        <span aria-hidden="true">{label}</span>
      </div>

      <div className={`grid gap-2 ${choiceGridClassName[columns]}`}>
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const OptionIcon = option.icon;

          return (
            <div key={option.value}>
              <input
                checked={value === option.value}
                className="peer sr-only"
                disabled={disabled}
                id={id}
                name={name}
                onChange={() => onChange(option.value)}
                type="radio"
                value={option.value}
              />
              <label
                className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-run-elevated px-2 py-3 text-xs font-semibold text-neutral-400 transition duration-200 hover:border-white/25 hover:text-white peer-checked:border-run-green peer-checked:bg-run-green/10 peer-checked:text-run-green peer-focus-visible:ring-2 peer-focus-visible:ring-run-green peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-run-surface peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                htmlFor={id}
              >
                <OptionIcon
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={1.75}
                />
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function formatPace(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
}

function LoadingSpinner() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        d="M4 12a8 8 0 0 1 8-8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  );
}

function PlaylistForm({
  isLoading = false,
  isSpotifyConnected = false,
  onSubmit,
}: PlaylistFormProps) {
  const [formData, setFormData] = useState<PlaylistFormData>({
    distanceKm: DISTANCE_RANGE.defaultValue,
    paceSeconds: PACE_RANGE.defaultValue,
    genre: GENRE_OPTIONS[0].value,
    mood: MOOD_OPTIONS[0].value,
  });

  return (
    <form
      aria-busy={isLoading}
      className="w-full rounded-2xl border border-white/10 bg-run-surface p-4 shadow-2xl shadow-black/40 sm:rounded-3xl sm:p-6 md:p-8"
      onSubmit={(event) => {
        event.preventDefault();

        if (isSpotifyConnected && !isLoading) {
          onSubmit(formData);
        }
      }}
    >
      <div className="mb-7 px-1 sm:mb-8">
        <p className="text-xs font-bold tracking-[0.2em] text-run-green uppercase">
          New playlist
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Set your run. Find your rhythm.
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">
          Tune the distance, pace, and energy for a playlist made to move with
          you.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        <RangeControl
          disabled={isLoading}
          endLabel="50 km"
          formatValue={(value) => `${value.toFixed(1)} km`}
          icon={Ruler}
          id="distance"
          label="Distance"
          max={DISTANCE_RANGE.max}
          min={DISTANCE_RANGE.min}
          name="distance"
          onChange={(distanceKm) =>
            setFormData((current) => ({ ...current, distanceKm }))
          }
          startLabel="1 km"
          step={DISTANCE_RANGE.step}
          value={formData.distanceKm}
        />

        <RangeControl
          disabled={isLoading}
          endLabel="8:00 · Easy"
          formatValue={formatPace}
          icon={Clock3}
          id="pace"
          label="Pace"
          max={PACE_RANGE.max}
          min={PACE_RANGE.min}
          name="pace"
          onChange={(paceSeconds) =>
            setFormData((current) => ({ ...current, paceSeconds }))
          }
          startLabel="Fast · 3:00"
          step={PACE_RANGE.step}
          value={formData.paceSeconds}
        />

        <ChoiceGroup
          disabled={isLoading}
          icon={Music2}
          label="Genre"
          name="genre"
          onChange={(genre) =>
            setFormData((current) => ({ ...current, genre }))
          }
          options={genreChoices}
          value={formData.genre}
        />

        <ChoiceGroup
          disabled={isLoading}
          icon={Zap}
          label="Mood"
          name="mood"
          onChange={(mood) => setFormData((current) => ({ ...current, mood }))}
          options={moodChoices}
          value={formData.mood}
        />
      </div>

      <button
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-run-green px-6 py-4 text-sm font-bold text-black transition duration-200 enabled:hover:scale-[1.01] enabled:hover:bg-run-green-hover enabled:hover:shadow-lg enabled:hover:shadow-run-green/10 enabled:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green focus-visible:ring-offset-2 focus-visible:ring-offset-run-surface disabled:cursor-not-allowed disabled:bg-neutral-600 disabled:text-neutral-300 sm:mt-8"
        disabled={isLoading || !isSpotifyConnected}
        title={isSpotifyConnected ? undefined : "Connect Spotify to continue"}
        type="submit"
      >
        {isLoading && <LoadingSpinner />}
        <span aria-live="polite">
          {isLoading ? "Generating..." : "Generate Playlist"}
        </span>
      </button>
    </form>
  );
}

export default PlaylistForm;
