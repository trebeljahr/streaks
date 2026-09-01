"use client";

import type { DayFlag } from "@starter/shared";
import { daysAgo } from "@/lib/format";

const WEEKS = 13;
const DAYS = WEEKS * 7;

function cellStyle(day: DayFlag, minimumMinutes: number): React.CSSProperties {
  if (day.repaired) {
    return {
      background: "rgba(224, 164, 88, 0.18)",
      border: "1px dashed var(--repair)",
    };
  }
  if (!day.credited) return { background: "var(--day-blank)" };

  // Three steps of solidity by how long the session ran. A short day is not
  // a lesser day — it is simply a lighter mark.
  const ratio = day.minutes / Math.max(1, minimumMinutes * 6);
  if (ratio >= 1) return { background: "#c9a5f0" };
  if (ratio >= 0.4) return { background: "rgba(201, 165, 240, 0.52)" };
  return { background: "rgba(201, 165, 240, 0.22)" };
}

/**
 * Thirteen weeks at a glance. Columns are weeks, so the eye reads a rhythm
 * rather than a wall — and blank days are neutral grey, never a red mark.
 */
export function HeatGrid({
  days,
  minimumMinutes,
  today,
  onPickBlankDay,
}: {
  days: DayFlag[];
  minimumMinutes: number;
  today: string;
  onPickBlankDay?: (day: DayFlag) => void;
}) {
  const window = days.slice(-DAYS);

  return (
    <div
      className="grid grid-flow-col grid-rows-7 gap-[5px]"
      data-testid="heat-grid"
    >
      {window.map((day) => {
        const age = daysAgo(day.day, today);
        const repairable = !day.credited && age > 0 && age <= 7;
        const style = cellStyle(day, minimumMinutes);

        if (repairable && onPickBlankDay) {
          return (
            <button
              key={day.day}
              type="button"
              onClick={() => onPickBlankDay(day)}
              aria-label={`Repair ${day.day}`}
              data-testid={`day-${day.day}`}
              className="aspect-square rounded-[3px] ring-1 ring-line-strong ring-inset"
              style={style}
            />
          );
        }
        return (
          <div
            key={day.day}
            aria-hidden="true"
            data-testid={`day-${day.day}`}
            className="aspect-square rounded-[3px]"
            style={style}
          />
        );
      })}
    </div>
  );
}
