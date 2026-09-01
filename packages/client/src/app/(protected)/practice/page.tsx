"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { practiceHex } from "@/lib/practice-colors";
import { formatDayKey } from "@/lib/format";
import { MomentumRing } from "@/components/momentum-ring";
import { HeatGrid } from "@/components/heat-grid";
import { MomentumChart } from "@/components/momentum-chart";
import { MAX_REPAIR_TOKENS } from "@starter/shared";
import type { DayFlag } from "@starter/shared";

/*
 * A query param rather than a path segment: the client is a static export,
 * and practice ids are user data that cannot be enumerated at build time.
 */
export default function PracticeDetailPage() {
  return (
    <Suspense fallback={null}>
      <PracticeDetail />
    </Suspense>
  );
}

function PracticeDetail() {
  const router = useRouter();
  const params = useSearchParams();
  const practiceId = params.get("id") ?? "";
  const utils = trpc.useUtils();

  const [repairTarget, setRepairTarget] = useState<DayFlag | null>(null);

  const practicesQuery = trpc.practices.list.useQuery({});
  const statsQuery = trpc.stats.forPractice.useQuery(
    { practiceId, days: 91 },
    { enabled: !!practiceId },
  );
  const spendRepair = trpc.repair.spend.useMutation({
    onSuccess: async () => {
      setRepairTarget(null);
      await utils.stats.forPractice.invalidate({ practiceId, days: 91 });
      await utils.stats.overview.invalidate();
    },
  });

  const practice = practicesQuery.data?.find((p) => p.id === practiceId);
  const stats = statsQuery.data;

  if (!practice || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm font-light text-ink-muted">Loading…</p>
      </div>
    );
  }

  const color = practiceHex(practice.color);
  const today = stats.days[stats.days.length - 1]?.day ?? "";
  const needPerDay =
    practice.cadence.kind === "daily" ? 1 : practice.cadence.times / 7;
  const cadenceLine =
    practice.cadence.kind === "daily"
      ? "Aiming at every day."
      : `Aiming at ${practice.cadence.times} sessions a week. Blank days inside that budget don't break anything.`;

  return (
    <div className="flex min-h-screen flex-col gap-5 px-5 pt-8 pb-10">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/today")}
          aria-label="Back"
          className="flex size-11 items-center justify-center rounded-full border border-line"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ink-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="grow text-xl leading-[1.15] font-semibold tracking-[-0.01em]">
          {practice.name}
        </h1>
      </header>

      <section className="flex items-center gap-4 rounded-[18px] border border-line bg-surface p-4">
        <MomentumRing value={stats.momentum} color={color} size={76} />
        <div className="flex grow flex-col gap-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] leading-none font-semibold">
              {stats.streak}
            </span>
            <span className="text-[13px] font-light text-ink-muted">
              day streak
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="tabular text-sm text-ink-muted">
              {stats.longestStreak}
            </span>
            <span className="text-[13px] font-light text-ink-faint">
              longest so far
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex gap-1">
              {Array.from({ length: MAX_REPAIR_TOKENS }, (_, i) => (
                <span
                  key={i}
                  className={`size-[9px] rounded-full ${
                    i < stats.repairTokens
                      ? "bg-repair"
                      : "border border-[#4a4360]"
                  }`}
                />
              ))}
            </span>
            <span className="text-[13px] font-light text-ink-muted">
              {stats.repairTokens === 1
                ? "1 repair token"
                : `${stats.repairTokens} repair tokens`}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-[18px] border border-line bg-surface p-4">
        <MomentumChart days={stats.days} needPerDay={needPerDay} />
      </section>

      <section className="flex flex-col gap-3.5 rounded-[18px] border border-line bg-surface p-4">
        <h2 className="text-[10.5px] tracking-[0.12em] text-ink-faint uppercase">
          Last 13 weeks
        </h2>
        <HeatGrid
          days={stats.days}
          minimumMinutes={practice.minimumMinutes}
          today={today}
          onPickBlankDay={stats.repairTokens > 0 ? setRepairTarget : undefined}
        />
        <div className="flex items-center gap-2.5">
          <span className="text-[11.5px] font-light text-ink-faint">quiet</span>
          <span className="flex gap-1">
            <span className="size-[11px] rounded-[3px] bg-day-blank" />
            <span className="size-[11px] rounded-[3px] bg-[rgba(201,165,240,0.22)]" />
            <span className="size-[11px] rounded-[3px] bg-[rgba(201,165,240,0.52)]" />
            <span className="size-[11px] rounded-[3px] bg-glow" />
          </span>
          <span className="text-[11.5px] font-light text-ink-faint">long</span>
          <span className="grow" />
          <span className="size-[11px] rounded-[3px] border border-dashed border-repair bg-repair/[0.18]" />
          <span className="text-[11.5px] font-light text-ink-faint">repaired</span>
        </div>
      </section>

      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line-dashed p-4">
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ink-soft)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p className="text-[12.5px] font-light text-pretty text-ink-soft">
          {cadenceLine}
        </p>
      </div>

      {repairTarget && (
        <RepairSheet
          day={repairTarget}
          tokens={stats.repairTokens}
          streak={stats.streak}
          pending={spendRepair.isPending}
          error={spendRepair.error?.message}
          onDismiss={() => setRepairTarget(null)}
          onConfirm={() =>
            spendRepair.mutate({ practiceId, day: repairTarget.day })
          }
        />
      )}
    </div>
  );
}

function RepairSheet({
  day,
  tokens,
  streak,
  pending,
  error,
  onDismiss,
  onConfirm,
}: {
  day: DayFlag;
  tokens: number;
  streak: number;
  pending: boolean;
  error?: string;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  const label = formatDayKey(day.day);
  const weekday = label.split(" ")[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="absolute inset-0 bg-[rgba(11,10,16,0.62)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        data-testid="repair-sheet"
        className="relative mx-auto flex w-full max-w-md flex-col gap-5 rounded-t-[26px] border-t border-line-strong bg-[#201c2c] px-5 pt-3.5 pb-[max(2.1rem,env(safe-area-inset-bottom))]"
      >
        <span className="mx-auto h-1 w-10 rounded-full bg-line-strong" />

        <div className="flex flex-col gap-2">
          <p className="tabular text-[10.5px] tracking-[0.12em] text-ink-faint uppercase">
            {label}
          </p>
          <h2 className="text-[25px] leading-[1.16] font-semibold tracking-[-0.02em] text-balance">
            {weekday} is blank.
          </h2>
          <p className="text-[14.5px] font-light text-pretty text-ink-muted">
            You can spend a repair token to fill it in
            {streak > 0 ? ` and carry the ${streak}-day streak through` : ""}.
            Entirely up to you.
          </p>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-repair/25 bg-repair/[0.07] p-4">
          <span className="flex gap-1.5">
            {Array.from({ length: MAX_REPAIR_TOKENS }, (_, i) => (
              <span
                key={i}
                className={`size-3 rounded-full ${
                  i < tokens ? "bg-repair" : "border border-[#4a4360]"
                }`}
              />
            ))}
          </span>
          <p className="grow text-[13.5px] font-light text-ink-muted">
            {tokens === 1 ? "1 in the bank." : `${tokens} in the bank.`}
          </p>
        </div>

        {error && (
          <p className="text-[13px] font-light text-repair-ink">{error}</p>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            data-testid="repair-confirm"
            className="flex h-[54px] items-center justify-center gap-2.5 rounded-[15px] bg-repair text-[15px] font-semibold text-ground disabled:opacity-50"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ground)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.4 14.5A9 9 0 1 1 9 3.6" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
            {pending ? "Filling in…" : `Fill ${weekday} in`}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            data-testid="repair-dismiss"
            className="flex h-[54px] items-center justify-center rounded-[15px] border border-line-strong text-[15px] font-medium text-ink-button"
          >
            Leave it blank
          </button>
        </div>

        <p className="text-[12.5px] font-light text-pretty text-ink-soft">
          Leaving it blank is fine too. Momentum moves by about two points.
        </p>
      </div>
    </div>
  );
}
