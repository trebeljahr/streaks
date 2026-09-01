import { describe, expect, it } from "vitest";
import { type ActiveSession, elapsedMsOf } from "./session-store";

const BASE: ActiveSession = {
  clientId: "test-session",
  practiceId: "p1",
  practiceName: "Piano",
  startedAt: 1_000_000,
  pausedMs: 0,
  minimumMinutes: 2,
  targetMinutes: 25,
  color: "#c9a5f0",
  startMomentum: 62,
  startStreak: 11,
};

describe("elapsedMsOf", () => {
  it("derives elapsed time from the wall clock", () => {
    expect(elapsedMsOf(BASE, BASE.startedAt + 90_000)).toBe(90_000);
  });

  it("survives a clock jump while the app is backgrounded", () => {
    // The phone locks at 30s in and comes back ten minutes later. Nothing
    // ticked in between, so anything that accumulated intervals would have
    // lost the gap entirely.
    const beforeBackground = elapsedMsOf(BASE, BASE.startedAt + 30_000);
    const afterForeground = elapsedMsOf(BASE, BASE.startedAt + 630_000);

    expect(beforeBackground).toBe(30_000);
    expect(afterForeground).toBe(630_000);
  });

  it("excludes completed pauses", () => {
    const paused: ActiveSession = { ...BASE, pausedMs: 60_000 };
    expect(elapsedMsOf(paused, paused.startedAt + 300_000)).toBe(240_000);
  });

  it("holds steady while paused, however long the pause runs", () => {
    const paused: ActiveSession = {
      ...BASE,
      pausedMs: 0,
      pausedAt: BASE.startedAt + 120_000,
    };
    const atPause = elapsedMsOf(paused, paused.pausedAt!);
    const muchLater = elapsedMsOf(paused, paused.pausedAt! + 3_600_000);

    expect(atPause).toBe(120_000);
    expect(muchLater).toBe(120_000);
  });

  it("never reports negative time when the clock moves backwards", () => {
    expect(elapsedMsOf(BASE, BASE.startedAt - 5_000)).toBe(0);
  });
});
