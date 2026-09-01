/**
 * Durable record of the session in progress.
 *
 * localStorage is the operational source of truth so reads stay
 * synchronous, mirrored to Capacitor Preferences because iOS treats
 * localStorage as evictable web data. A force-quit mid-session must not
 * lose the work — that is the one thing this app cannot do to someone.
 */

import { mirrorRemove, mirrorSet } from "@/mobile/durable";

export const ACTIVE_SESSION_KEY = "streaks.activeSession";

export type ActiveSession = {
  /** Server id, absent until the start mutation lands. */
  id?: string;
  /** Generated locally so a replayed start is deduped server-side. */
  clientId: string;
  practiceId: string;
  practiceName: string;
  /** Epoch ms. Elapsed is always derived from this, never accumulated. */
  startedAt: number;
  /** Completed pause time in ms. */
  pausedMs: number;
  /** Epoch ms the current pause began, if paused right now. */
  pausedAt?: number;
  minimumMinutes: number;
  targetMinutes: number;
  color: string;
  roomId?: string;
  /** Momentum and streak as they stood before this session began. */
  startMomentum: number;
  startStreak: number;
};

export function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function readActiveSession(): ActiveSession | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSession;
    if (typeof parsed?.startedAt !== "number" || !parsed.clientId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeActiveSession(session: ActiveSession): void {
  const raw = JSON.stringify(session);
  try {
    window.localStorage.setItem(ACTIVE_SESSION_KEY, raw);
  } catch {
    /* storage denied — the mirror below is the fallback */
  }
  mirrorSet(ACTIVE_SESSION_KEY, raw);
}

export function clearActiveSession(): void {
  try {
    window.localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    /* nothing to do */
  }
  mirrorRemove(ACTIVE_SESSION_KEY);
}

/**
 * Elapsed practice time. Derived from the wall clock every single time:
 * iOS freezes JS timers on background, so anything that accumulates ticks
 * would quietly under-count a session the moment the phone locks.
 */
export function elapsedMsOf(session: ActiveSession, now = Date.now()): number {
  const pausedSoFar =
    session.pausedMs + (session.pausedAt ? now - session.pausedAt : 0);
  return Math.max(0, now - session.startedAt - pausedSoFar);
}
