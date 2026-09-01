"use client";

import type { Mood } from "@starter/shared";

const MOODS: readonly { value: Mood; label: string }[] = [
  { value: 1, label: "Rough" },
  { value: 2, label: "Flat" },
  { value: 3, label: "Fine" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
];

function Face({ mood, active }: { mood: Mood; active: boolean }) {
  const stroke = active ? "var(--glow)" : "var(--ink-faint)";
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: active ? 1.9 : 1.7,
    strokeLinecap: "round" as const,
    "aria-hidden": true,
  };
  const eyes = (
    <>
      <line x1="9" y1="9.5" x2="9.01" y2="9.5" />
      <line x1="15" y1="9.5" x2="15.01" y2="9.5" />
    </>
  );

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      {mood === 1 && <path d="M8.5 15.5c1-1.2 5-1.2 7 0" />}
      {mood === 2 && <line x1="8.5" y1="15" x2="15.5" y2="15" />}
      {mood === 3 && <path d="M8.5 14c1 1.2 5 1.2 7 0" />}
      {mood === 4 && <path d="M8 13.5c1.2 1.8 6.8 1.8 8 0" />}
      {mood === 5 && <path d="M7.6 12.8h8.8a4.4 4.4 0 0 1-8.8 0z" />}
      {eyes}
    </svg>
  );
}

/**
 * One tap logs the session. There is no separate save step — a close-out
 * flow with two interactions is a close-out flow that gets abandoned.
 */
export function MoodPicker({
  value,
  onPick,
}: {
  value?: Mood;
  onPick: (mood: Mood) => void;
}) {
  return (
    <div className="flex gap-2.5" role="radiogroup" aria-label="How was it?">
      {MOODS.map((mood) => {
        const active = value === mood.value;
        return (
          <button
            key={mood.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={mood.label}
            data-testid={`mood-${mood.value}`}
            onClick={() => onPick(mood.value)}
            className={`flex aspect-square grow items-center justify-center rounded-[14px] border transition-colors ${
              active
                ? "border-periwinkle bg-periwinkle/15"
                : "border-line hover:border-line-strong"
            }`}
          >
            <Face mood={mood.value} active={active} />
          </button>
        );
      })}
    </div>
  );
}
