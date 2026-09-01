import type { Cadence, PracticeColor, PracticeIcon } from "./types.js";

/** A starting point offered during onboarding. */
export type PracticePreset = {
  key: string;
  name: string;
  icon: PracticeIcon;
  color: PracticeColor;
  minimumMinutes: number;
  targetMinutes: number;
  cadence: Cadence;
};

/**
 * Minimums are deliberately tiny. The preset that asks for twenty minutes
 * is the preset nobody starts.
 */
export const PRACTICE_PRESETS: readonly PracticePreset[] = [
  {
    key: "writing",
    name: "Writing",
    icon: "writing",
    color: "blue",
    minimumMinutes: 2,
    targetMinutes: 25,
    cadence: { kind: "perWeek", times: 5 },
  },
  {
    key: "finishing",
    name: "Finishing things",
    icon: "deepWork",
    color: "periwinkle",
    minimumMinutes: 5,
    targetMinutes: 45,
    cadence: { kind: "perWeek", times: 5 },
  },
  {
    key: "learning",
    name: "Learning",
    icon: "learning",
    color: "teal",
    minimumMinutes: 2,
    targetMinutes: 30,
    cadence: { kind: "perWeek", times: 4 },
  },
  {
    key: "piano",
    name: "Piano",
    icon: "piano",
    color: "violet",
    minimumMinutes: 2,
    targetMinutes: 25,
    cadence: { kind: "perWeek", times: 4 },
  },
  {
    key: "drawing",
    name: "Drawing",
    icon: "drawing",
    color: "amber",
    minimumMinutes: 2,
    targetMinutes: 20,
    cadence: { kind: "perWeek", times: 3 },
  },
] as const;
