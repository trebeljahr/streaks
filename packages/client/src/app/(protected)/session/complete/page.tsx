"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { formatDuration } from "@/lib/format";
import { MoodPicker } from "@/components/mood-picker";
import {
  type FinishedSession,
  clearLastFinished,
  readLastFinished,
} from "@/lib/last-session";
import type { Mood } from "@starter/shared";

export default function SessionCompletePage() {
  const router = useRouter();
  const [finished, setFinished] = useState<FinishedSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [mood, setMood] = useState<Mood | undefined>();
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  const utils = trpc.useUtils();
  const setMoodMutation = trpc.sessions.setMood.useMutation();

  useEffect(() => {
    setFinished(readLastFinished());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !finished) router.replace("/today");
  }, [hydrated, finished, router]);

  const statsQuery = trpc.stats.forPractice.useQuery(
    { practiceId: finished?.practiceId ?? "", days: 90 },
    { enabled: !!finished },
  );

  if (!finished) return null;

  function handleMood(next: Mood): void {
    setMood(next);
    if (!finished) return;
    setMoodMutation.mutate({
      id: finished.serverId,
      clientId: finished.clientId,
      mood: next,
      note: note.trim() || undefined,
    });
  }

  async function handleDone(): Promise<void> {
    clearLastFinished();
    // Make sure Today reflects the session that just happened rather than
    // the figures it was showing when the timer started.
    await utils.stats.overview.invalidate();
    router.replace("/today");
  }

  const stats = statsQuery.data;
  const headline = finished.secured
    ? stats && stats.streak > 1
      ? `That's ${stats.streak} days in a row.`
      : "That counts. The day is yours."
    : "Logged. Every minute is on the board.";

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(110%_45%_at_50%_12%,#2a2340_0%,#1b1827_48%,#16141f_100%)]">
      <div className="flex grow flex-col gap-6 px-5 pt-14">
        <header className="flex flex-col gap-2">
          <p className="tabular text-[10.5px] tracking-[0.12em] text-periwinkle uppercase">
            {finished.practiceName} · {formatDuration(finished.elapsedMs)}
          </p>
          <h1 className="text-[30px] leading-[1.12] font-semibold tracking-[-0.02em] text-balance">
            {headline}
          </h1>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-[10.5px] tracking-[0.12em] text-ink-faint uppercase">
            How was it?
          </h2>
          <MoodPicker value={mood} onPick={handleMood} />
        </section>

        <div className="flex gap-2.5">
          <DeltaCard
            label="Streak"
            from={finished.startStreak}
            to={stats?.streak ?? finished.startStreak}
            unit="days"
          />
          <DeltaCard
            label="Momentum"
            from={finished.startMomentum}
            to={stats?.momentum ?? finished.startMomentum}
            unit="of 100"
          />
        </div>

        {(stats?.repairTokens ?? 0) > 0 && (
          <div
            className="flex items-center gap-3.5 rounded-2xl border border-repair/30 bg-repair/[0.08] p-4"
            data-testid="repair-bank"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--repair)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.4 14.5A9 9 0 1 1 9 3.6" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
            <div className="flex grow flex-col gap-0.5">
              <p className="text-[14.5px] font-medium text-repair-ink">
                {stats?.repairTokens === 1
                  ? "One repair token banked"
                  : `${stats?.repairTokens} repair tokens banked`}
              </p>
              <p className="text-[12.5px] font-light text-ink-muted">
                Enough for a rough week.
              </p>
            </div>
          </div>
        )}

        {showNote ? (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              if (!mood) return;
              setMoodMutation.mutate({
                id: finished.serverId,
                clientId: finished.clientId,
                mood,
                note: note.trim() || undefined,
              });
            }}
            rows={3}
            placeholder="Anything worth remembering?"
            data-testid="session-note"
            className="rounded-[14px] border border-line bg-surface p-3.5 text-[13.5px] font-light placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            data-testid="add-note"
            className="flex min-h-11 items-center gap-2.5 rounded-[14px] border border-dashed border-line-dashed p-3.5"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ink-faint)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            <span className="text-[13.5px] font-light text-ink-soft">
              Add a note (optional)
            </span>
          </button>
        )}

        <div className="grow" />
      </div>

      <div className="px-5 pb-[max(2.1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => void handleDone()}
          data-testid="done"
          className="flex h-[54px] w-full items-center justify-center rounded-[15px] bg-periwinkle text-[15px] font-semibold text-ground"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function DeltaCard({
  label,
  from,
  to,
  unit,
}: {
  label: string;
  from: number;
  to: number;
  unit: string;
}) {
  const moved = to !== from;
  return (
    <div className="flex grow flex-col gap-1.5 rounded-2xl border border-line bg-surface p-4">
      <p className="text-[10.5px] tracking-[0.12em] text-ink-faint uppercase">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        {moved && (
          <span className="tabular text-[15px] text-ink-faint line-through">
            {from}
          </span>
        )}
        <span className="text-[30px] leading-none font-semibold tracking-[-0.02em] text-glow">
          {to}
        </span>
      </div>
      <p className="text-xs font-light text-ink-muted">{unit}</p>
    </div>
  );
}
