"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { practiceHex } from "@/lib/practice-colors";
import { formatDuration } from "@/lib/format";
import { MomentumRing } from "@/components/momentum-ring";
import { BottomNav } from "@/components/bottom-nav";

export default function ProgressPage() {
  const practicesQuery = trpc.practices.list.useQuery({});
  const statsQuery = trpc.stats.overview.useQuery(undefined);

  const practices = practicesQuery.data ?? [];
  const statsById = new Map(
    (statsQuery.data?.stats ?? []).map((s) => [s.practiceId, s]),
  );

  const weekMinutes = [...statsById.values()].reduce((total, stats) => {
    const lastSeven = stats.days.slice(-7);
    return total + lastSeven.reduce((sum, day) => sum + day.minutes, 0);
  }, 0);
  const weekDays = new Set(
    [...statsById.values()].flatMap((stats) =>
      stats.days.slice(-7).filter((d) => d.credited).map((d) => d.day),
    ),
  ).size;

  return (
    <>
      <div className="flex grow flex-col gap-6 px-5 pt-9">
        <header className="flex flex-col gap-1.5">
          <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.02em]">
            Progress
          </h1>
          <p className="text-sm font-light text-ink-muted">
            {weekDays === 0
              ? "This week is still open."
              : `${formatDuration(weekMinutes * 60_000)} across ${weekDays} ${
                  weekDays === 1 ? "day" : "days"
                } this week.`}
          </p>
        </header>

        <div className="flex flex-col gap-2.5">
          {practices.map((practice) => {
            const stats = statsById.get(practice.id);
            return (
              <Link
                key={practice.id}
                href={`/practice?id=${practice.id}`}
                data-testid={`progress-${practice.id}`}
                className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-3.5"
              >
                <MomentumRing
                  value={stats?.momentum ?? 0}
                  color={practiceHex(practice.color)}
                />
                <span className="flex grow flex-col gap-0.5">
                  <span className="text-base font-medium">{practice.name}</span>
                  <span className="text-[12.5px] font-light text-ink-muted">
                    {stats && stats.streak > 0
                      ? `${stats.streak} day streak · longest ${stats.longestStreak}`
                      : "No streak running yet"}
                  </span>
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ink-faint)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            );
          })}
        </div>

        <div className="grow" />
      </div>
      <BottomNav />
    </>
  );
}
