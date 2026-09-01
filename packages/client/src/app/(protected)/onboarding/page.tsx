"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { practiceHex } from "@/lib/practice-colors";
import { PracticeIcon } from "@/components/practice-icon";

const MIN_FLOOR = 1;
const MIN_CEILING = 30;

export default function OnboardingPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const presetsQuery = trpc.practices.presets.useQuery();
  const createMany = trpc.practices.createMany.useMutation({
    onSuccess: async () => {
      await utils.practices.list.invalidate();
      await utils.stats.overview.invalidate();
      router.replace("/today");
    },
  });

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [minimumMinutes, setMinimumMinutes] = useState(2);

  const presets = presetsQuery.data ?? [];

  function toggle(key: string): void {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleContinue(): void {
    const chosen = presets.filter((p) => picked.has(p.key));
    if (chosen.length === 0) return;
    createMany.mutate({
      practices: chosen.map((p) => ({
        name: p.name,
        icon: p.icon,
        color: p.color,
        minimumMinutes,
        targetMinutes: p.targetMinutes,
        cadence: p.cadence,
      })),
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex grow flex-col gap-6 px-5 pt-14">
        <header className="flex flex-col gap-2">
          <p className="tabular text-[10.5px] tracking-[0.12em] text-ink-faint uppercase">
            Step 1 of 1
          </p>
          <h1 className="text-[27px] leading-[1.14] font-semibold tracking-[-0.02em] text-balance">
            What do you want to practice?
          </h1>
          <p className="text-sm font-light text-ink-muted">
            Pick a few. Nothing here is permanent.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2.5" data-testid="preset-grid">
          {presets.map((preset) => {
            const active = picked.has(preset.key);
            const hex = practiceHex(preset.color);
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => toggle(preset.key)}
                aria-pressed={active}
                data-testid={`preset-${preset.key}`}
                className={`flex min-h-11 flex-col gap-3 rounded-2xl border p-4 text-left transition-colors ${
                  active ? "border-[1.5px]" : "border-line bg-surface"
                }`}
                style={
                  active
                    ? { borderColor: hex, backgroundColor: `${hex}1a` }
                    : undefined
                }
              >
                <PracticeIcon
                  icon={preset.icon}
                  color={active ? hex : "var(--ink-soft)"}
                  size={22}
                />
                <span
                  className={`text-[15px] font-medium ${
                    active ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>

        <section className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[15px] font-medium">How little still counts?</h2>
            <p className="text-[12.5px] font-light text-pretty text-ink-muted">
              Hit this and the day is yours. Keep it embarrassingly small.
            </p>
          </div>
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              aria-label="Fewer minutes"
              data-testid="minimum-down"
              onClick={() =>
                setMinimumMinutes((m) => Math.max(MIN_FLOOR, m - 1))
              }
              className="flex size-11 items-center justify-center rounded-[13px] border border-line-strong"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ink-muted)"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <div className="flex grow items-baseline justify-center gap-1.5">
              <span
                className="text-[30px] leading-none font-semibold tracking-[-0.02em] text-glow"
                data-testid="minimum-value"
              >
                {minimumMinutes}
              </span>
              <span className="text-sm font-light text-ink-muted">
                {minimumMinutes === 1 ? "minute" : "minutes"}
              </span>
            </div>
            <button
              type="button"
              aria-label="More minutes"
              data-testid="minimum-up"
              onClick={() =>
                setMinimumMinutes((m) => Math.min(MIN_CEILING, m + 1))
              }
              className="flex size-11 items-center justify-center rounded-[13px] border border-line-strong"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ink-muted)"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </section>

        <div className="grow" />
      </div>

      <div className="flex flex-col gap-3.5 px-5 pb-[max(2.1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleContinue}
          disabled={picked.size === 0 || createMany.isPending}
          data-testid="onboarding-continue"
          className="flex h-[54px] items-center justify-center rounded-[15px] bg-periwinkle text-[15px] font-semibold text-ground disabled:opacity-40"
        >
          {createMany.isPending
            ? "Setting up…"
            : picked.size === 0
              ? "Pick at least one"
              : `Continue with ${picked.size}`}
        </button>
        <p className="text-center text-[12.5px] font-light text-ink-faint">
          No targets to set. No schedule to build.
        </p>
      </div>
    </div>
  );
}
