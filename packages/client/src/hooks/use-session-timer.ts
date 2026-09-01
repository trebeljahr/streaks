"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ActiveSession,
  clearActiveSession,
  elapsedMsOf,
  newClientId,
  readActiveSession,
  writeActiveSession,
} from "@/lib/session-store";

const TICK_MS = 250;

export type StartSessionInput = {
  practiceId: string;
  practiceName: string;
  minimumMinutes: number;
  targetMinutes: number;
  color: string;
  roomId?: string;
  startMomentum: number;
  startStreak: number;
};

export type SessionTimer = {
  /** Null until hydrated from storage, then null when nothing is running. */
  session: ActiveSession | null;
  /** True until the first read from storage has happened. */
  isHydrating: boolean;
  elapsedMs: number;
  isPaused: boolean;
  hasSecuredDay: boolean;
  start: (input: StartSessionInput) => ActiveSession;
  attachServerId: (id: string) => void;
  pause: () => void;
  resume: () => void;
  /** Returns the finished session and clears it from storage. */
  finish: () => ActiveSession | null;
  discard: () => void;
};

/**
 * The running-session primitive.
 *
 * The interval exists only to repaint. Every elapsed figure is recomputed
 * from `Date.now()`, so backgrounding, sleeping or force-quitting the app
 * cannot drift the clock — worst case the display is stale until the next
 * paint, and foregrounding repaints immediately.
 */
export function useSessionTimer(): SessionTimer {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const sessionRef = useRef<ActiveSession | null>(null);

  const commit = useCallback((next: ActiveSession | null) => {
    sessionRef.current = next;
    setSession(next);
    if (next) writeActiveSession(next);
    else clearActiveSession();
  }, []);

  // Hydrate after mount: the page is prerendered at build time, so storage
  // must not be touched during render.
  useEffect(() => {
    const stored = readActiveSession();
    sessionRef.current = stored;
    setSession(stored);
    setNow(Date.now());
    setIsHydrating(false);
  }, []);

  // Repaint ticker. Runs only while something is actually running.
  useEffect(() => {
    if (!session || session.pausedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [session]);

  // Foregrounding, tab focus and Capacitor resume all land here. Recomputing
  // `now` is enough — the elapsed value was never wrong, only unpainted.
  useEffect(() => {
    const resync = (): void => setNow(Date.now());
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("focus", resync);
    window.addEventListener("streaks:resume", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("focus", resync);
      window.removeEventListener("streaks:resume", resync);
    };
  }, []);

  const start = useCallback(
    (input: StartSessionInput): ActiveSession => {
      const next: ActiveSession = {
        clientId: newClientId(),
        practiceId: input.practiceId,
        practiceName: input.practiceName,
        startedAt: Date.now(),
        pausedMs: 0,
        minimumMinutes: input.minimumMinutes,
        targetMinutes: input.targetMinutes,
        color: input.color,
        roomId: input.roomId,
        startMomentum: input.startMomentum,
        startStreak: input.startStreak,
      };
      commit(next);
      setNow(Date.now());
      return next;
    },
    [commit],
  );

  const attachServerId = useCallback(
    (id: string) => {
      const current = sessionRef.current;
      if (!current || current.id === id) return;
      commit({ ...current, id });
    },
    [commit],
  );

  const pause = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.pausedAt) return;
    commit({ ...current, pausedAt: Date.now() });
  }, [commit]);

  const resume = useCallback(() => {
    const current = sessionRef.current;
    if (!current || !current.pausedAt) return;
    commit({
      ...current,
      pausedMs: current.pausedMs + (Date.now() - current.pausedAt),
      pausedAt: undefined,
    });
    setNow(Date.now());
  }, [commit]);

  const finish = useCallback((): ActiveSession | null => {
    const current = sessionRef.current;
    if (!current) return null;
    commit(null);
    return current;
  }, [commit]);

  const discard = useCallback(() => commit(null), [commit]);

  const elapsedMs = session ? elapsedMsOf(session, now) : 0;

  return {
    session,
    isHydrating,
    elapsedMs,
    isPaused: !!session?.pausedAt,
    hasSecuredDay: !!session && elapsedMs >= session.minimumMinutes * 60_000,
    start,
    attachServerId,
    pause,
    resume,
    finish,
    discard,
  };
}
