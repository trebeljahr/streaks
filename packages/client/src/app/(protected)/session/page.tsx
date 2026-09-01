"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { formatElapsed } from "@/lib/format";
import { ElapsedRing } from "@/components/elapsed-ring";
import { writeLastFinished } from "@/lib/last-session";

export default function SessionPage() {
  const router = useRouter();
  const timer = useSessionTimer();
  const utils = trpc.useUtils();
  const finishMutation = trpc.sessions.finish.useMutation({
    // The day may have just been credited, so anything showing streaks or
    // momentum is now stale — including the Today cards behind this screen.
    onSuccess: () => {
      void utils.stats.overview.invalidate();
      void utils.stats.forPractice.invalidate();
    },
  });
  const pauseMutation = trpc.sessions.pause.useMutation();
  const resumeMutation = trpc.sessions.resume.useMutation();

  const { session, isHydrating } = timer;

  // Finishing clears the session, which would otherwise trip the guard below
  // and bounce past the close-out screen straight to Today.
  const [isFinishing, setIsFinishing] = useState(false);

  // Nothing running — either a stale link or a session that already ended.
  useEffect(() => {
    if (isFinishing) return;
    if (!isHydrating && !session) router.replace("/today");
  }, [isFinishing, isHydrating, session, router]);

  if (!session) return null;

  function handlePause(): void {
    if (!session) return;
    if (timer.isPaused) {
      timer.resume();
      if (session.id) {
        resumeMutation.mutate({ id: session.id, pausedMs: session.pausedMs });
      }
      return;
    }
    timer.pause();
    if (session.id) {
      pauseMutation.mutate({ id: session.id, pausedMs: session.pausedMs });
    }
  }

  function handleFinish(): void {
    const elapsedMs = timer.elapsedMs;
    const secured = timer.hasSecuredDay;
    setIsFinishing(true);
    const finished = timer.finish();
    if (!finished) {
      setIsFinishing(false);
      return;
    }

    writeLastFinished({
      serverId: finished.id,
      clientId: finished.clientId,
      practiceId: finished.practiceId,
      practiceName: finished.practiceName,
      color: finished.color,
      elapsedMs,
      secured,
      startMomentum: finished.startMomentum,
      startStreak: finished.startStreak,
    });
    router.replace("/session/complete");

    finishMutation.mutate({
      id: finished.id,
      clientId: finished.clientId,
      pausedMs: finished.pausedMs,
    });
  }

  const targetLabel = `counting up · aiming at ${session.targetMinutes}`;

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(120%_55%_at_50%_34%,#241f38_0%,#1a1726_45%,#16141f_100%)]">
      <header className="flex items-center gap-3 px-5 pt-9">
        <button
          type="button"
          onClick={() => router.push("/today")}
          aria-label="Back to today"
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
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <div className="flex grow flex-col items-center gap-0.5">
          <p className="text-[15px] font-medium">{session.practiceName}</p>
          <p className="tabular text-[10.5px] tracking-[0.1em] text-ink-faint uppercase">
            {timer.isPaused ? "Paused" : "In progress"}
          </p>
        </div>
        <span className="size-11" />
      </header>

      <div className="flex grow flex-col items-center justify-center gap-7 px-5">
        <div className="relative">
          <ElapsedRing
            elapsedMs={timer.elapsedMs}
            targetMinutes={session.targetMinutes}
            minimumMinutes={session.minimumMinutes}
            color={session.color}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <p
              className="tabular text-[54px] leading-none font-medium tracking-[-0.02em]"
              data-testid="elapsed"
            >
              {formatElapsed(timer.elapsedMs)}
            </p>
            <p className="text-[12.5px] font-light text-ink-soft">{targetLabel}</p>
          </div>
        </div>

        {timer.hasSecuredDay ? (
          <div
            className="animate-secured flex items-center gap-2.5 rounded-full border border-secured/30 bg-secured/10 px-4 py-2.5"
            data-testid="day-secured"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--secured)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p className="text-[13.5px] font-medium text-secured-ink">
              Day secured at {session.minimumMinutes}:00
            </p>
          </div>
        ) : (
          <p className="text-[13.5px] font-light text-ink-soft">
            {session.minimumMinutes} minutes and the day is yours.
          </p>
        )}
      </div>

      <div className="flex gap-3 px-5 pb-[max(2.1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handlePause}
          data-testid="pause"
          className="flex h-[54px] grow items-center justify-center gap-2.5 rounded-[15px] border border-line-strong"
        >
          {timer.isPaused ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--ink-button)" aria-hidden="true">
              <polygon points="7 4 20 12 7 20" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--ink-muted)" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          )}
          <span className="text-[15px] font-medium text-ink-button">
            {timer.isPaused ? "Resume" : "Pause"}
          </span>
        </button>
        <button
          type="button"
          onClick={handleFinish}
          data-testid="finish"
          className="flex h-[54px] grow items-center justify-center rounded-[15px] bg-periwinkle text-[15px] font-semibold text-ground"
        >
          Finish
        </button>
      </div>
    </div>
  );
}
