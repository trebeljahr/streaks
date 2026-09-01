/**
 * Handoff between the running screen and the close-out screen.
 *
 * sessionStorage rather than a route param: the figures are the user's own,
 * they should not sit in a URL, and a reload of the close-out screen should
 * still show what just happened.
 */

export type FinishedSession = {
  serverId?: string;
  /** Always present; the server id may still be in flight. */
  clientId: string;
  practiceId: string;
  practiceName: string;
  color: string;
  elapsedMs: number;
  secured: boolean;
  startMomentum: number;
  startStreak: number;
};

const KEY = "streaks.lastFinished";

export function writeLastFinished(session: FinishedSession): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage denied — the close-out screen falls back to a plain summary */
  }
}

export function readLastFinished(): FinishedSession | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FinishedSession) : null;
  } catch {
    return null;
  }
}

export function clearLastFinished(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
