"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { practiceHex } from "@/lib/practice-colors";
import { formatDuration } from "@/lib/format";
import { MomentumRing } from "@/components/momentum-ring";
import { PracticeIcon } from "@/components/practice-icon";
import { BottomNav } from "@/components/bottom-nav";
import type { Practice, PracticeStats } from "@starter/shared";

const QUIET_MOMENTUM = 40;
const QUIET_DAYS = 5;

const DATE_LABEL = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** Days since the most recent credited day, or null if there never was one. */
function daysSinceCredited(stats: PracticeStats | undefined): number | null {
  if (!stats) return null;
  for (let i = stats.days.length - 1; i >= 0; i -= 1) {
    if (stats.days[i].credited) return stats.days.length - 1 - i;
  }
  return null;
}

/**
 * How long this practice has been silent. A practice that has never run is
 * measured from when it was created — something set up an hour ago has not
 * "gone quiet", it simply has not started, and filing it under a lapse
 * heading on day one would be exactly the wrong first impression.
 */
function silentDays(practice: Practice, stats: PracticeStats | undefined): number {
  const sinceCredited = daysSinceCredited(stats);
  if (sinceCredited !== null) return sinceCredited;
  const created = new Date(practice.createdAt).getTime();
  return Math.floor((Date.now() - created) / 86_400_000);
}

function subtitleFor(stats: PracticeStats | undefined, practice: Practice): string {
  if (!stats) return `${practice.minimumMinutes} min keeps it`;
  const todayMinutes = stats.days[stats.days.length - 1]?.minutes ?? 0;
  if (todayMinutes >= practice.minimumMinutes) {
    return `Done today · ${formatDuration(todayMinutes * 60_000)}`;
  }
  if (stats.streak > 0) {
    return `${stats.streak} days · ${practice.minimumMinutes} min keeps it`;
  }
  return `${practice.minimumMinutes} min starts it`;
}

export default function TodayPage() {
  const router = useRouter();
  const timer = useSessionTimer();

  const practicesQuery = trpc.practices.list.useQuery({});
  const statsQuery = trpc.stats.overview.useQuery(undefined);
  const startMutation = trpc.sessions.start.useMutation();

  const practices = practicesQuery.data ?? [];
  const statsById = new Map(
    (statsQuery.data?.stats ?? []).map((s) => [s.practiceId, s]),
  );

  function handleStart(practice: Practice): void {
    const before = statsById.get(practice.id);
    const started = timer.start({
      practiceId: practice.id,
      practiceName: practice.name,
      minimumMinutes: practice.minimumMinutes,
      targetMinutes: practice.targetMinutes,
      color: practiceHex(practice.color),
      startMomentum: before?.momentum ?? 0,
      startStreak: before?.streak ?? 0,
    });
    router.push("/session");
    // The session already exists locally and durably, so the screen can move
    // immediately. If this request never lands, nothing is lost.
    startMutation.mutate(
      { practiceId: practice.id, clientId: started.clientId },
      { onSuccess: (session) => timer.attachServerId(session.id) },
    );
  }

  const isQuiet = (practice: Practice): boolean => {
    const stats = statsById.get(practice.id);
    if (!stats) return false;
    return (
      stats.momentum < QUIET_MOMENTUM &&
      silentDays(practice, stats) >= QUIET_DAYS
    );
  };
  const activePractices = practices.filter((p) => !isQuiet(p));
  const quietPractices = practices.filter(isQuiet);

  return (
    <>
      <div className="flex grow flex-col gap-6 px-5 pt-9">
        <header className="flex flex-col gap-1.5">
          <p className="tabular text-[10.5px] tracking-[0.12em] text-ink-faint uppercase">
            {DATE_LABEL.format(new Date())}
          </p>
          <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.02em] text-balance">
            Ready when you are.
          </h1>
          <p className="text-sm font-light text-ink-muted">
            Two minutes counts. That&rsquo;s the whole rule.
          </p>
        </header>

        {practicesQuery.isLoading ? (
          <p className="text-sm font-light text-ink-muted">Loading…</p>
        ) : practices.length === 0 ? (
          <div
            className="flex flex-col gap-4 rounded-2xl border border-dashed border-line-dashed p-5"
            data-testid="no-practices"
          >
            <p className="text-[15px] font-light text-pretty text-ink-muted">
              Nothing set up yet. Pick a couple of things you&rsquo;d like to come
              back to.
            </p>
            <Link
              href="/onboarding"
              className="flex h-12 items-center justify-center rounded-[15px] bg-periwinkle text-[15px] font-semibold text-ground"
            >
              Choose your practices
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5" data-testid="practice-list">
            {activePractices.map((practice) => (
              <PracticeCard
                key={practice.id}
                practice={practice}
                stats={statsById.get(practice.id)}
                onStart={() => handleStart(practice)}
              />
            ))}
          </div>
        )}

        {quietPractices.length > 0 && (
          <section className="flex flex-col gap-2.5" data-testid="quiet-section">
            <h2 className="text-[10.5px] tracking-[0.12em] text-ink-faint uppercase">
              Gone quiet
            </h2>
            {quietPractices.map((practice) => {
              const stats = statsById.get(practice.id);
              const everStarted = daysSinceCredited(stats) !== null;
              const since = silentDays(practice, stats);
              return (
                <button
                  key={practice.id}
                  type="button"
                  onClick={() => handleStart(practice)}
                  data-testid={`start-${practice.id}`}
                  className="flex items-center gap-3.5 rounded-2xl border border-dashed border-line-dashed p-3.5 text-left"
                >
                  <span className="flex size-[46px] shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong">
                    <PracticeIcon
                      icon={practice.icon}
                      color={practiceHex(practice.color)}
                    />
                  </span>
                  <span className="flex grow flex-col gap-0.5">
                    <span className="text-base font-medium">{practice.name}</span>
                    <span className="text-[12.5px] font-light text-ink-muted">
                      {everStarted
                        ? `Quiet for ${since} days. Two minutes?`
                        : "Not started yet. Two minutes?"}
                    </span>
                  </span>
                  <PlayBadge color={practiceHex(practice.color)} />
                </button>
              );
            })}
          </section>
        )}

        <div className="grow" />
      </div>
      <BottomNav />
    </>
  );
}

function PlayBadge({ color }: { color: string }) {
  return (
    <span className="flex size-[46px] shrink-0 items-center justify-center rounded-full border border-line-strong bg-raised">
      <svg width="16" height="16" viewBox="0 0 24 24" fill={color} aria-hidden="true">
        <polygon points="7 4 20 12 7 20" />
      </svg>
    </span>
  );
}

function PracticeCard({
  practice,
  stats,
  onStart,
}: {
  practice: Practice;
  stats?: PracticeStats;
  onStart: () => void;
}) {
  const color = practiceHex(practice.color);
  const doneToday =
    (stats?.days[stats.days.length - 1]?.minutes ?? 0) >= practice.minimumMinutes;

  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-3.5">
      <Link
        href={`/practice?id=${practice.id}`}
        aria-label={`${practice.name} history`}
        className="flex min-h-11 items-center"
      >
        <MomentumRing value={stats?.momentum ?? 0} color={color} />
      </Link>
      <div className="flex grow flex-col gap-0.5">
        <span className="text-base font-medium">{practice.name}</span>
        <span className="text-[12.5px] font-light text-ink-muted">
          {subtitleFor(stats, practice)}
        </span>
      </div>
      <button
        type="button"
        onClick={onStart}
        data-testid={`start-${practice.id}`}
        aria-label={`Start ${practice.name}`}
        className={`flex size-[46px] shrink-0 items-center justify-center rounded-full border ${
          doneToday ? "border-line bg-surface" : "border-line-strong bg-raised"
        }`}
      >
        {doneToday ? (
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--secured)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill={color} aria-hidden="true">
            <polygon points="7 4 20 12 7 20" />
          </svg>
        )}
      </button>
    </div>
  );
}
