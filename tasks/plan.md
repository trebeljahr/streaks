# Implementation Plan: Streaks — ADHD Practice-Session Tracker

## Overview

Not a checkbox habit tracker. A **practice-session tracker**: the unit of record is a
timed session (writing/editing, finishing work items, learning, piano, drawing), and the
timer is the primary entry point. The app's job is to lower activation energy to near
zero, then make the record of effort feel good to look at — without ever becoming a
shame machine.

Target: web + iOS (Capacitor) shipping together from v1, on the existing hatchkit
scaffold (Express + tRPC + Mongo + better-auth + `ws`, Next.js static export).

## The Five ADHD Design Laws

These are constraints, not suggestions. Every screen is checked against them.

1. **Opening the app must never show failure.** No red, no ✗, no "you missed 4 days".
   Gaps are neutral gray. Empty state is "not yet", never "failed".
2. **Starting is the win.** Every practice has a `minimumMinutes` (default 2). Hitting
   the minimum credits the day, full stop. The timer counts **up**, so there is no
   failure state — only "more".
3. **Streaks must be repairable and flexible.** Cadence-aware (4×/week means missing
   Tuesday is fine), plus a bank of repair tokens for genuine misses. An all-or-nothing
   streak is an ADHD motivation bomb.
4. **Momentum is the honest number, streak is the hook.** Show both. Momentum is
   recency-weighted so three good days after two dead weeks visibly moves it — recovery
   must be fast and legible.
5. **Capture is one tap.** Ending a session = tap a mood face. Notes optional. Never a
   form.

## Architecture Decisions

- **Sessions are wall-clock derived, never interval-accumulated.** Persist `startedAt`
  as an absolute timestamp; elapsed is always `Date.now() - startedAt - pausedMs`. iOS
  WKWebView freezes JS timers on background — an accumulating `setInterval` would lose
  time. Non-negotiable.
- **Active session is durably persisted client-side** (localStorage + `@capacitor/preferences`
  mirror, via the existing `mobile/durable.ts`). App kill mid-session resumes on relaunch
  rather than losing the work.
- **Offline-first sessions via an outbox.** Session start/finish writes locally and
  enqueues for sync. Practicing happens on subways and planes; a network error must
  never eat a session.
- **Day boundary is user-configurable, default 4am local.** A session at 1am counts for
  the previous day. Computed server-side from a stored IANA timezone + `dayStartHour` so
  streaks survive travel and DST.
- **Streak/momentum math lives in `@starter/shared` as pure functions.** Same code runs
  client-side for optimistic UI and server-side for authority. Unit-tested exhaustively —
  this is where the subtle bugs live.
- **Static export constraints are already in force** (`output: "export"`). No
  `middleware.ts`, no server components with runtime data, no `rewrites()`. All data
  flows through the tRPC client. Dynamic routes need `generateStaticParams`.
- **Body-doubling reuses the existing `RoomManager`/`ws` layer.** Extend
  `packages/shared/src/protocol.ts` with practice-presence messages rather than adding a
  second transport.
- **Drop the scaffold's `Item` model.** It's placeholder CRUD; `Practice` and `Session`
  replace it.

## Domain Model

```
Practice            the thing you practice
  id, ownerId, name, icon, colorToken
  minimumMinutes    default 2  — credits the day
  targetMinutes     default 25 — aspirational only, never a failure line
  cadence           { kind: "perWeek", times: 4 } | { kind: "daily" }
  archivedAt?

Session             one timed instance
  id, ownerId, practiceId
  startedAt, endedAt?, pausedMs
  state             running | paused | completed | abandoned
  mood?             1-5, one tap
  note?
  roomId?           set if body-doubled
  creditedDay       YYYY-MM-DD, resolved via dayStartHour + tz

StreakState         per practice, derived + cached
  current, longest, repairTokens (max 3), lastCreditedDay

MomentumSnapshot    per practice per day, cached
  score 0-100
```

### Streak rules (precise)

- A day is **credited** for practice P when total completed session minutes that
  `creditedDay` ≥ `P.minimumMinutes`.
- The streak counts consecutive **scheduled** days per cadence, not calendar days. At
  `perWeek: 4`, a week with 4 credited days keeps the streak whole regardless of which
  days.
- **Repair token**: earned 1 per 7 consecutive credited days, banked to a max of 3.
  Spent explicitly by the user on a specific blank day within the last 7. Never spent
  automatically — agency is the point.

### Momentum (the anti-shame number)

```
momentum = Σ(credited_day × w) / Σ(scheduled_day × w) × 100
w = 0.5 ^ (days_ago / 10)        exponential, 10-day half-life
```

Recency-dominant by construction: a strong recent week outweighs a dead fortnight, so
the number climbs fast when you come back. That visible recovery is the whole point.

## Task List

### Phase 0: Foundation

- [x] Task 1: Domain types + Zod schemas in `@starter/shared`
- [x] Task 2: `Practice` + `Session` Mongo models, indexes, remove `Item`
- [x] Task 3: Pure streak/momentum/day-boundary functions + unit tests

### Checkpoint A: Foundation
- [x] `pnpm run test:unit` green, including DST and timezone-travel cases
- [x] `pnpm run build` clean across all three packages

### Phase 1: The core loop (vertical slice — this is the product)

- [x] Task 4: `practices` tRPC router + preset catalogue
- [x] Task 5: Onboarding screen — pick presets, set minimum, under 60 seconds
- [x] Task 6: `sessions` tRPC router — start / finish / abandon / recover-active
- [x] Task 7: `useSessionTimer` hook — wall-clock derived, background-safe, durable
- [x] Task 8: Today screen — practice cards, momentum rings, one-tap start
- [x] Task 9: Session Live screen — elapsed ring, minimum celebration, pause/finish
- [x] Task 10: Session Complete screen — one-tap mood, streak/momentum delta

### Checkpoint B: Core loop
- [x] Start → background the app 2 min → foreground → elapsed time is correct
      (unit-tested against a mocked clock jump; elapsed is wall-clock derived)
- [x] Force-quit mid-session → relaunch → session recovered, not lost
      (durable store + `sessions.active`; not yet exercised on a real device)
- [x] Full loop works in the browser — **iOS Simulator not yet run**

### Phase 2: The reward surfaces

- [x] Task 11: Streak + momentum service, snapshot caching, `stats` router
- [x] Task 12: Practice Detail — momentum chart + calendar heat grid
- [x] Task 13: Repair token flow — earn, bank, spend (with server-side validation)

### Checkpoint C: Rewards
- [x] Streak survives a cadence-legal miss; breaks only on a real one
- [x] Repair token spend is idempotent and cannot be replayed to fabricate a streak
      (unique index on owner+practice+day)

### Phase 3: Body doubling

- [ ] Task 14: Extend WS protocol + `RoomManager` for practice presence
- [ ] Task 15: Rooms list, join flow, presence strip on Today and Live

### Checkpoint D: Presence
- [ ] Two browsers see each other's live elapsed timers
- [ ] Reconnect after network drop restores presence without duplicate members

### Phase 4: Native + offline

- [ ] Task 16: Offline outbox for sessions (IndexedDB + durable mirror + sync)
- [ ] Task 17: iOS shell — local notification chimes, resume-on-launch, `TRUSTED_ORIGINS`
- [ ] Task 18: PWA manifest + install prompt for web

### Phase 5: Polish

- [ ] Task 19: Nudge engine — "gone quiet" invitations; no-shame copy pass
- [ ] Task 20: Playwright E2E — onboarding → session → streak credit
- [ ] Task 21: Design system pass — tokens, dark mode, `prefers-reduced-motion`

### Checkpoint Complete
- [ ] All acceptance criteria met
- [ ] Every screen audited against the Five ADHD Design Laws

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| iOS backgrounding freezes JS timers, corrupting elapsed time | High | Wall-clock derivation only; never accumulate intervals. Verified in Checkpoint B. |
| Streak math wrong across DST / timezone travel | High | Pure functions in `shared`, exhaustive unit tests, Task 3 runs before any UI. |
| Gamification turns into a shame machine — the exact ADHD failure mode | High | Five Design Laws as an explicit audit gate at Checkpoint Complete. No red in the palette. |
| Body-doubling empty-room problem (nobody else online) | Med | Show recent-session "ghosts" as ambient presence; scheduled recurring rooms. |
| Static export forbids middleware — auth gating is client-side only | Med | Already how the scaffold works; `(protected)/layout.tsx` handles it. |
| Session lost to a network error | Med | Offline outbox (Task 16). Until then, local persistence already covers the common case. |
| iOS notification-permission fatigue | Low | Ask only after the first *completed* session, never at launch. |

## Open Questions

- **Rooms: public or friends-only?** Invite codes vs. an open lobby changes the moderation
  and the social dynamic considerably. Public lobby is more likely to be non-empty; friends-only
  is more likely to feel safe.
- **Cadence target: minutes/week or sessions/week?** Sessions/week is more ADHD-friendly
  (rewards showing up); minutes/week is more honest for piano and writing.
- **Media attachments per session?** S3/R2 is already provisioned — a photo of the drawing
  or a 30s piano clip would make Practice Detail genuinely rewarding to scroll. Adds scope.
- **Live Activity on iOS** (lock-screen running timer) is a native Swift module, not
  reachable from Capacitor JS. Worth a v1.1 spike?
