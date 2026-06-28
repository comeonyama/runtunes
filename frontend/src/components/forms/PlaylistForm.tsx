import {
  Activity,
  Clock3,
  Gauge,
  Globe2,
  MicVocal,
  Music2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState, type CSSProperties } from "react";
import { GENRE_OPTIONS } from "../../constants/genres";
import type { Genre, Pace, PlaylistFormData } from "../../types/form";

const DURATION_RANGE = {
  min: 30,
  max: 2 * 60,
  step: 5,
  defaultValue: 60,
} as const;

type ChoiceOption<T extends string> = {
  icon: LucideIcon;
  label: string;
  value: T;
};

const genreIcons: Record<Genre, LucideIcon> = {
  global: Globe2,
  J_GROOVE: Music2,
  kpop: MicVocal,
};

const genreChoices: readonly ChoiceOption<Genre>[] = GENRE_OPTIONS.map(
  (option) => ({ ...option, icon: genreIcons[option.value] }),
);

const paceChoices: readonly ChoiceOption<Pace>[] = [
  { icon: Activity, label: "Easy", value: "easy" },
  { icon: Gauge, label: "Middle", value: "middle" },
  { icon: Zap, label: "Hard", value: "hard" },
];

const choiceGridClassName = {
  2: "grid-cols-2",
  3: "grid-cols-3",
} as const;

export type PlaylistFormProps = {
  isLoading?: boolean;
  isRateLimited?: boolean;
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

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr`;

  return `${hours} hr ${minutes} min`;
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
  isRateLimited = false,
  isSpotifyConnected = false,
  onSubmit,
}: PlaylistFormProps) {
  const [formData, setFormData] = useState<PlaylistFormData>({
    durationMinutes: DURATION_RANGE.defaultValue,
    pace: "middle",
    genre: GENRE_OPTIONS[0].value,
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
          Tune the running time, pace, and genre for a playlist made to move
          with you.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        <RangeControl
          disabled={isLoading}
          endLabel="2 hr"
          formatValue={formatDuration}
          icon={Clock3}
          id="duration"
          label="Running time"
          max={DURATION_RANGE.max}
          min={DURATION_RANGE.min}
          name="duration"
          onChange={(durationMinutes) =>
            setFormData((current) => ({ ...current, durationMinutes }))
          }
          startLabel="30 min"
          step={DURATION_RANGE.step}
          value={formData.durationMinutes}
        />

        <ChoiceGroup
          disabled={isLoading}
          icon={Gauge}
          label="Pace"
          name="pace"
          onChange={(pace) => setFormData((current) => ({ ...current, pace }))}
          options={paceChoices}
          value={formData.pace}
        />

        <div className="md:col-span-2">
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
        </div>
      </div>

      <button
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-run-green px-6 py-4 text-sm font-bold text-black transition duration-200 enabled:hover:scale-[1.01] enabled:hover:bg-run-green-hover enabled:hover:shadow-lg enabled:hover:shadow-run-green/10 enabled:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green focus-visible:ring-offset-2 focus-visible:ring-offset-run-surface disabled:cursor-not-allowed disabled:bg-neutral-600 disabled:text-neutral-300 sm:mt-8"
        disabled={isLoading || isRateLimited || !isSpotifyConnected}
        title={
          !isSpotifyConnected
            ? "Connect Spotify to continue"
            : isRateLimited
              ? "Spotify search is temporarily rate limited"
              : undefined
        }
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
