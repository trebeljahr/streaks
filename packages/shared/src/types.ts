/** Metadata about a room member. */
export type RoomMember = {
  userId: string;
  displayName: string;
  joinedAt: string;
};

/** User theme preference. */
export type ThemePreference = "light" | "dark" | "system";

/** Shape of a user profile (extends better-auth's User). */
export type UserProfile = {
  userId: string;
  avatarUrl?: string;
  bio?: string;
  preferences: {
    theme: ThemePreference;
    notifications: boolean;
    /** IANA zone, e.g. "Europe/Berlin". Streak days are resolved in it. */
    timezone: string;
    /**
     * Hour (0-23, local) at which a new day begins. Default 4, so a 1am
     * session still credits the previous day — night owls are the norm,
     * not the exception.
     */
    dayStartHour: number;
  };
};

/** Palette slots from the Soft Dusk design tokens. */
export type PracticeColor = "blue" | "periwinkle" | "teal" | "violet" | "amber";

/** Icon keys drawn by the client's icon set. */
export type PracticeIcon =
  | "writing"
  | "deepWork"
  | "learning"
  | "piano"
  | "drawing"
  | "custom";

/**
 * How often a practice is meant to happen. `perWeek` is deliberately
 * flexible: which days is never the point, only how many.
 */
export type Cadence = { kind: "daily" } | { kind: "perWeek"; times: number };

/** A thing you practice. */
export type Practice = {
  id: string;
  ownerId: string;
  name: string;
  icon: PracticeIcon;
  color: PracticeColor;
  /** Minutes that credit the day. Small on purpose — starting is the win. */
  minimumMinutes: number;
  /** Aspirational only. Never a failure line. */
  targetMinutes: number;
  cadence: Cadence;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionState = "running" | "paused" | "completed" | "abandoned";

/** One-tap close-out rating, 1 (rough) to 5 (great). */
export type Mood = 1 | 2 | 3 | 4 | 5;

/** One timed instance of practising. */
export type Session = {
  id: string;
  ownerId: string;
  practiceId: string;
  startedAt: string;
  endedAt?: string;
  /** Accumulated paused time, excluded from the credited duration. */
  pausedMs: number;
  state: SessionState;
  durationMs?: number;
  mood?: Mood;
  note?: string;
  roomId?: string;
  /** `YYYY-MM-DD`, resolved from the owner's timezone and dayStartHour. */
  creditedDay?: string;
};

/** Per-practice streak bookkeeping. Server-owned. */
export type StreakState = {
  practiceId: string;
  current: number;
  longest: number;
  /** Spendable tokens, capped at MAX_REPAIR_TOKENS. */
  repairTokens: number;
  /** Lifetime earned, used to compute how many new tokens a session earned. */
  tokensEarnedTotal: number;
  lastCreditedDay?: string;
};

/** One day of history for a practice. */
export type DayFlag = {
  /** `YYYY-MM-DD` */
  day: string;
  minutes: number;
  credited: boolean;
  /** Credited by spending a repair token rather than by practising. */
  repaired: boolean;
};

/** Cached recency-weighted score for a practice on a given day. */
export type MomentumSnapshot = {
  practiceId: string;
  day: string;
  score: number;
};

/** Everything the Practice Detail screen needs. */
export type PracticeStats = {
  practiceId: string;
  momentum: number;
  streak: number;
  longestStreak: number;
  repairTokens: number;
  days: DayFlag[];
};
