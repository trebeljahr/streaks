# Streaks — Task List

**Status:** Phases 0–2 are implemented and verified (`pnpm run build`,
`test:unit`, `test:client` all green; `test:e2e` covers onboarding and the
core loop). Phases 3–5 are not started — see "Not yet built" at the bottom.

Conventions from `CLAUDE.md`: TypeScript strict, no `any`, named exports, explicit
return types on exported functions, `@starter/shared` for cross-package types,
`data-testid` for E2E selectors.

---

## Phase 0: Foundation

### Task 1: Domain types + Zod schemas in `@starter/shared`

**Description:** Define `Practice`, `Session`, `StreakState`, `MomentumSnapshot`, cadence
and mood types, plus Zod schemas for every tRPC input. Replaces the scaffold's `Item`
types.

**Acceptance criteria:**
- [ ] `Practice`, `Session`, `Cadence`, `SessionState`, `StreakState`, `MomentumSnapshot` exported from `@starter/shared`
- [ ] Zod schemas for create/update practice, start/finish session, spend repair token
- [ ] `Item`/`ItemStatus` types removed

**Verification:**
- [ ] `pnpm run build` succeeds
- [ ] No remaining references: `grep -r "ItemStatus\|@starter/shared.*Item" packages/`

**Dependencies:** None
**Files:** `packages/shared/src/types.ts`, `packages/shared/src/schemas.ts`, `packages/shared/src/index.ts`
**Scope:** S

---

### Task 2: `Practice` + `Session` Mongo models

**Description:** Mongoose schemas with the indexes the hot queries need. Delete `Item.ts`
and the `items` router.

**Acceptance criteria:**
- [ ] `Practice` model: `ownerId` indexed, `archivedAt` sparse
- [ ] `Session` model: compound index `{ ownerId, practiceId, creditedDay }` and `{ ownerId, state }` for active-session lookup
- [ ] `Item.ts`, `routers/items.ts` deleted and unregistered from `appRouter`

**Verification:**
- [ ] `pnpm run build` succeeds
- [ ] Server boots against local Mongo without schema warnings

**Dependencies:** Task 1
**Files:** `packages/server/src/models/Practice.ts`, `Session.ts`, `trpc/router.ts`
**Scope:** S

---

### Task 3: Pure streak / momentum / day-boundary functions

**Description:** The math core, as pure functions in `shared` so client and server share
one implementation. **Highest-risk task — do it before any UI.**

**Acceptance criteria:**
- [ ] `resolveCreditedDay(instant, tz, dayStartHour)` returns the right `YYYY-MM-DD` across DST transitions in both directions
- [ ] `computeStreak(creditedDays, cadence)` honours cadence flexibility (4×/week tolerates any 3 missed days)
- [ ] `computeMomentum(creditedDays, scheduledDays, today)` uses a 10-day half-life and returns 0–100
- [ ] Repair-token earn rule: 1 per 7 consecutive credited days, banked to max 3

**Verification:**
- [ ] `pnpm run test:unit` — cases for DST spring-forward, fall-back, timezone travel mid-streak, cadence boundaries, empty history
- [ ] Momentum after 14 blank days then 3 credited days is visibly non-trivial (asserts the recovery property)

**Dependencies:** Task 1
**Files:** `packages/shared/src/streaks.ts`, `packages/server/src/tests/streaks.test.ts`
**Scope:** M

---

## Checkpoint A: Foundation
- [ ] `pnpm run test:unit` green
- [ ] `pnpm run build` clean
- [ ] Human review of the streak rules before UI is built on top of them

---

## Phase 1: Core loop

### Task 4: `practices` tRPC router + preset catalogue

**Description:** CRUD for practices plus a preset catalogue seeding onboarding —
Writing/Editing, Deep Work, Learning, Piano, Drawing.

**Acceptance criteria:**
- [ ] `list`, `create`, `update`, `archive` procedures, all `protectedProcedure`, all owner-scoped
- [ ] `presets` query returns the five presets with sensible `minimumMinutes`/`targetMinutes`
- [ ] Archive is soft (`archivedAt`), never a hard delete — history is the reward surface

**Verification:**
- [ ] Unit test: a second user cannot read or mutate another user's practice
- [ ] `pnpm run build`

**Dependencies:** Task 2
**Files:** `packages/server/src/trpc/routers/practices.ts`, `trpc/router.ts`
**Scope:** S

---

### Task 5: Onboarding screen

**Description:** Pick presets, adjust minimum, done. Target: under 60 seconds, no
required text input.

**Acceptance criteria:**
- [ ] Preset cards are tappable multi-select; at least one required to continue
- [ ] `minimumMinutes` defaults to 2 with a stepper, never a free-text field
- [ ] Completing onboarding routes to Today with practices already created

**Verification:**
- [ ] Manual: complete onboarding start-to-finish without touching a keyboard
- [ ] `pnpm run test:client`

**Dependencies:** Task 4
**Files:** `packages/client/src/app/(protected)/onboarding/page.tsx`, `components/practice-preset-card.tsx`
**Scope:** M

---

### Task 6: `sessions` tRPC router

**Description:** Start, finish, abandon, and recover-active. Server assigns
`creditedDay` at finish time using the owner's tz + `dayStartHour`.

**Acceptance criteria:**
- [ ] `start` refuses a second running session, returning the existing one instead of erroring
- [ ] `finish` computes `creditedDay` server-side and persists `durationMs` net of `pausedMs`
- [ ] `active` query returns the running session for crash recovery
- [ ] Sessions shorter than 30s are recorded as `abandoned`, not `completed`

**Verification:**
- [ ] Unit tests for double-start, finish-twice idempotency, and abandon threshold
- [ ] `pnpm run test:unit`

**Dependencies:** Task 2, Task 3
**Files:** `packages/server/src/trpc/routers/sessions.ts`, `services/sessions.ts`, `trpc/router.ts`
**Scope:** M

---

### Task 7: `useSessionTimer` hook — background-safe

**Description:** The load-bearing client primitive. Elapsed time derives from wall clock,
never from accumulated ticks. Active session mirrored to durable storage.

**Acceptance criteria:**
- [ ] Elapsed = `Date.now() - startedAt - pausedMs`; the render tick only triggers repaints
- [ ] Active session written to localStorage and mirrored via `mobile/durable.ts` on every state change
- [ ] `visibilitychange` and Capacitor `resume` recompute elapsed immediately on foreground
- [ ] Relaunch after a force-quit rehydrates the running session

**Verification:**
- [ ] Manual: start, background 2 min, foreground — elapsed advanced by ~2 min
- [ ] Manual on iOS Simulator: force-quit mid-session, relaunch, session restored
- [ ] `pnpm run test:client` — fake-timer test asserting elapsed tracks a mocked clock jump

**Dependencies:** Task 6
**Files:** `packages/client/src/hooks/use-session-timer.ts`, `lib/session-store.ts`
**Scope:** M

---

### Task 8: Today screen

**Description:** The home surface. Primary affordance is starting, not reviewing. Practice
cards carry momentum rings; gaps render neutral, never red.

**Acceptance criteria:**
- [ ] Each practice card starts a session in one tap
- [ ] Momentum ring + current streak shown per card; no ✗ marks and no red anywhere
- [ ] "N practicing now" strip when the presence feed is non-empty (hidden when zero, never "0 people")
- [ ] Empty state reads as an invitation, not a deficit

**Verification:**
- [ ] Manual audit against Design Laws 1 and 2
- [ ] `pnpm run test:client`

**Dependencies:** Task 4, Task 7
**Files:** `packages/client/src/app/(protected)/today/page.tsx`, `components/practice-card.tsx`, `components/momentum-ring.tsx`
**Scope:** M

---

### Task 9: Session Live screen

**Description:** Full-screen focus mode. Counts up. Crossing `minimumMinutes` fires a
distinct celebration — that moment is the product's core dopamine beat.

**Acceptance criteria:**
- [ ] Large elapsed ring; count-up only, with no countdown or overrun state
- [ ] Crossing the minimum triggers a visible celebration and flips the copy to "day secured"
- [ ] Pause and Finish reachable one-handed; Finish never requires confirmation
- [ ] Respects `prefers-reduced-motion`

**Verification:**
- [ ] Manual: set minimum to 1 min, confirm the celebration fires exactly once
- [ ] `pnpm run test:client`

**Dependencies:** Task 7
**Files:** `packages/client/src/app/(protected)/session/page.tsx`, `components/elapsed-ring.tsx`
**Scope:** M

---

### Task 10: Session Complete screen

**Description:** One-tap close-out. Five mood faces, optional note, animated streak and
momentum deltas.

**Acceptance criteria:**
- [ ] Mood is a single tap that also submits — no separate Save button
- [ ] Streak and momentum deltas animate from previous to new value
- [ ] Note field is collapsed by default and always skippable
- [ ] A newly earned repair token is surfaced here

**Verification:**
- [ ] Manual: finish a session using exactly one tap
- [ ] `pnpm run test:client`

**Dependencies:** Task 6, Task 9
**Files:** `packages/client/src/app/(protected)/session/complete/page.tsx`, `components/mood-picker.tsx`, `components/delta-counter.tsx`
**Scope:** S

---

## Checkpoint B: Core loop
- [ ] Start → background 2 min → foreground → elapsed correct
- [ ] Force-quit mid-session → relaunch → recovered
- [ ] Full loop verified in browser AND iOS Simulator
- [ ] `pnpm run build` and `pnpm run test:unit` green

---

## Phase 2: Reward surfaces

### Task 11: Streak + momentum service, caching, `stats` router

**Description:** Wrap the Task 3 pure functions in a server service with per-day snapshot
caching, and expose them over tRPC.

**Acceptance criteria:**
- [ ] `stats.forPractice` returns streak, momentum, and 90 days of credited-day flags
- [ ] `stats.overview` returns cross-practice totals for the week
- [ ] Snapshots cached in Redis, invalidated on session finish and repair spend

**Verification:**
- [ ] Unit test: cache invalidation on finish yields a recomputed momentum
- [ ] `pnpm run test:unit`

**Dependencies:** Task 3, Task 6
**Files:** `packages/server/src/services/stats.ts`, `trpc/routers/stats.ts`
**Scope:** M

---

### Task 12: Practice Detail screen

**Description:** The "look at what I've done" surface — the long-term retention hook.
Momentum line chart plus a calendar heat grid.

**Acceptance criteria:**
- [ ] 90-day heat grid; credited days coloured by minutes, blanks neutral gray
- [ ] Momentum line over 30 days with the current value called out
- [ ] Streak, longest streak, and repair-token bank displayed
- [ ] Tapping a blank day within the last 7 opens the repair flow

**Verification:**
- [ ] Manual audit against Design Law 1 (no red, no failure framing)
- [ ] `pnpm run test:client`

**Dependencies:** Task 11
**Files:** `packages/client/src/app/(protected)/practice/[id]/page.tsx`, `components/heat-grid.tsx`, `components/momentum-chart.tsx`
**Scope:** M

---

### Task 13: Repair token flow

**Description:** Earn, bank, and spend. Spending is always an explicit user choice.

**Acceptance criteria:**
- [ ] `repair.spend` validates: token available, target day blank, target within the last 7 days
- [ ] Spend is idempotent — a replayed request cannot fabricate a second credit
- [ ] Bank caps at 3; earning beyond the cap is silently discarded, never surfaced as a loss
- [ ] Confirmation modal states plainly what the token does

**Verification:**
- [ ] Unit test: replay attack on `repair.spend` credits the day only once
- [ ] Unit test: spending on a day older than 7 days is rejected
- [ ] `pnpm run test:unit`

**Dependencies:** Task 11
**Files:** `packages/server/src/trpc/routers/repair.ts`, `packages/client/src/components/repair-modal.tsx`
**Scope:** M

---

## Checkpoint C: Rewards
- [ ] Streak survives a cadence-legal miss; breaks only on a real one
- [ ] Repair spend is idempotent and time-bounded
- [ ] `pnpm run test:unit` green

---

## Phase 3: Body doubling

### Task 14: WS protocol + `RoomManager` presence

**Description:** Extend the existing WebSocket layer with practice presence. No second
transport.

**Acceptance criteria:**
- [ ] `protocol.ts` gains `practice-presence`, `presence-update`, `room-list` messages
- [ ] `RoomManager` tracks each member's practice name and `startedAt`
- [ ] Disconnect removes presence within one heartbeat interval
- [ ] Reconnect does not produce duplicate members

**Verification:**
- [ ] Unit test on `RoomManager` join/leave/reconnect
- [ ] `pnpm run test:unit`

**Dependencies:** Task 6
**Files:** `packages/shared/src/protocol.ts`, `packages/server/src/ws/rooms.ts`, `ws/handler.ts`
**Scope:** M

---

### Task 15: Rooms list + presence strip

**Description:** Browse rooms, join, and see co-practitioners' live timers. Silent by
default — no chat obligation.

**Acceptance criteria:**
- [ ] Rooms list shows occupancy and what people are working on
- [ ] Joining attaches `roomId` to the session
- [ ] Presence strip renders on Today and Session Live with live elapsed timers
- [ ] No chat input in v1 — presence only

**Verification:**
- [ ] Manual: two browsers see each other's timers advancing
- [ ] `pnpm run test:client`

**Dependencies:** Task 14
**Files:** `packages/client/src/app/(protected)/rooms/page.tsx`, `hooks/use-presence.ts`, `components/presence-strip.tsx`
**Scope:** M

---

## Checkpoint D: Presence
- [ ] Two clients see each other live
- [ ] Network drop and reconnect leaves presence clean

---

## Phase 4: Native + offline

### Task 16: Offline outbox

**Description:** Session mutations queue locally and sync when connectivity returns. A
network error must never eat a session.

**Acceptance criteria:**
- [ ] Start and finish enqueue to IndexedDB, mirrored to Capacitor Preferences
- [ ] Drain on reconnect, in order, with idempotency keys
- [ ] Server dedupes replayed mutations by client-generated id
- [ ] UI stays optimistic — offline is invisible to the user

**Verification:**
- [ ] Manual: airplane mode, run a full session, reconnect, confirm it lands exactly once
- [ ] Unit test on the queue drain ordering

**Dependencies:** Task 6, Task 7
**Files:** `packages/client/src/lib/outbox.ts`, `hooks/use-outbox-sync.ts`, `packages/server/src/services/sessions.ts`
**Scope:** M

---

### Task 17: iOS shell wiring

**Description:** Interval chimes, resume-on-launch, and native-origin auth.

**Acceptance criteria:**
- [ ] `@capacitor/local-notifications` fires optional interval chimes during a session
- [ ] Permission requested only after the first *completed* session, never at launch
- [ ] `TRUSTED_ORIGINS` includes `capacitor://localhost` and `https://localhost`
- [ ] Cold launch with a running session lands directly on Session Live

**Verification:**
- [ ] Manual on iOS Simulator: full loop including a chime and cold-launch recovery
- [ ] `pnpm run build:mobile`

**Dependencies:** Task 7, Task 10
**Files:** `packages/client/src/mobile/bridge.ts`, `lib/notifications.ts`, `packages/server/.env.development`
**Scope:** M

---

### Task 18: PWA manifest + install prompt

**Acceptance criteria:**
- [ ] Manifest with icons, theme colour, and `display: standalone`
- [ ] Install prompt shown only after the first completed session
- [ ] Web app launches standalone on Android and desktop

**Verification:**
- [ ] Lighthouse PWA checks pass
- [ ] `pnpm run build`

**Dependencies:** Task 10
**Files:** `packages/client/public/manifest.json`, `src/app/layout.tsx`, `components/install-prompt.tsx`
**Scope:** S

---

## Phase 5: Polish

### Task 19: Nudge engine + copy pass

**Description:** Surface practices whose momentum is decaying — as an invitation, never
a reprimand.

**Acceptance criteria:**
- [ ] "Gone quiet" section lists practices with momentum below 40 and no session in 5+ days
- [ ] Copy is invitational throughout ("Piano's been quiet — 2 minutes?"), with no guilt framing
- [ ] Every user-facing string audited against Design Law 1

**Verification:**
- [ ] Manual copy audit of all screens
- [ ] `pnpm run test:client`

**Dependencies:** Task 11
**Files:** `packages/client/src/components/quiet-practices.tsx`, `lib/copy.ts`
**Scope:** S

---

### Task 20: Playwright E2E

**Acceptance criteria:**
- [ ] Onboarding → start session → finish → streak credited, as one spec
- [ ] Repair token spend spec
- [ ] All selectors use `data-testid`

**Verification:**
- [ ] `pnpm run test:e2e`

**Dependencies:** Task 13
**Files:** `e2e/onboarding.spec.ts`, `e2e/session.spec.ts`, `e2e/repair.spec.ts`, `e2e/helpers.ts`
**Scope:** M

---

### Task 21: Design system pass

**Acceptance criteria:**
- [ ] Colour, spacing, and motion tokens in `globals.css`; no red in the palette
- [ ] Dark mode verified on every screen
- [ ] `prefers-reduced-motion` honoured by all celebration animations
- [ ] Touch targets ≥ 44px throughout

**Verification:**
- [ ] Manual pass on every screen, light and dark
- [ ] `pnpm run build`

**Dependencies:** Tasks 8–15
**Files:** `packages/client/src/styles/globals.css`, `components/ui/*`
**Scope:** M

---

## Checkpoint Complete
- [ ] All acceptance criteria met
- [ ] Every screen audited against the Five ADHD Design Laws
- [ ] `pnpm run build`, `test:unit`, `test:client`, `test:e2e` all green

---

## Parallelization

| Can run in parallel | Must be sequential |
|---|---|
| Tasks 12 + 13 (after 11) | 1 → 2 → 3 (type/schema chain) |
| Tasks 14 + 16 (independent subsystems) | 6 → 7 → 8/9/10 (timer chain) |
| Task 18 alongside anything in Phase 4 | 11 before 12/13 |
| Task 20 written alongside Phase 5 | 14 before 15 |


---

## Scaffold repairs made along the way

The generated repo had never built or typechecked. These were fixed as
prerequisites, not as part of the feature work:

1. **`@starter/shared` emitted CommonJS behind an ESM `exports` map.** Its
   `package.json` had no `"type": "module"`, so tsc emitted CJS whose
   `__exportStar` re-exports Node cannot see through — every named runtime
   import from the package failed. Added `"type": "module"`.
2. **`packages/server/.env.development` was never generated**, so the server
   had no `FRONTEND_URL`, `MONGODB_URI` or auth secret in dev, and the one
   pre-existing unit test failed. Written with local defaults.
3. **`services/stripe.ts` was stripped but still imported** by `app.ts` and
   `index.ts` (Stripe is not among this project's hatchkit features), so the
   server could not typecheck. Removed the dead imports and the webhook mount.
4. **`@hatchkit/dev-plugin-next` cannot be loaded by Next 16.** It publishes
   only an `import` condition, and Next loads `next.config.ts` through a
   CommonJS bundle — `ERR_PACKAGE_PATH_NOT_EXPORTED` under `next dev` *and*
   `next build`. Unwired; it only drove a local-dev banner and Caddy fragment.
5. **`assetPrefix: "./"` broke every web route.** Combined with
   `trailingSlash`, chunks resolved against the current path, so `/signup/`
   requested `/signup/_next/...` and got a 404 — pages rendered as dead HTML
   with no JavaScript. Now applied only when `NATIVE_BUILD=1`, which
   `build:mobile` / `build:desktop` / `build:tauri` set.
6. **`allowedDevOrigins` was unset.** Next 16 starves the dev client of its
   runtime when reached from an origin it does not recognise, so anything
   hitting the dev server over `127.0.0.1` rendered but never hydrated.
7. **`@plugin "tw-animate-css"` could not load** — that package ships CSS, not
   a Tailwind JS plugin, and nothing used it. Removed.
8. **Client `tsconfig` pointed `@starter/shared` at source**, contradicting
   `scripts/dev.mjs`, which builds it and expects resolution via the package
   `exports`. Turbopack could not follow the `.js` specifiers in the TS
   sources. Removed the override.
9. **Playwright had no vitest path alias and reused a foreign dev server.**
   Added `packages/client/vitest.config.ts`, and the e2e ports must be passed
   explicitly (`E2E_SERVER_PORT` / `E2E_CLIENT_PORT`) because the defaults
   collide with other things on this machine — `reuseExistingServer` then
   silently tests whatever is already listening.
10. **`e2e/start-server.sh` could not restart existing containers.** It
    checked `docker ps`, which lists only running containers, so a stopped
    `starter-e2e-*` container made `docker run --name` fail outright. It now
    starts what exists and creates only what does not.
11. **`e2e/global-teardown.ts` is dead code** — never registered in
    `playwright.config.ts`. Left as-is; the containers are cheap to keep.

Run the e2e suite as:

```bash
E2E_SERVER_PORT=54311 E2E_CLIENT_PORT=54312 npx playwright test
```

## Not yet built

- **Phase 3 (body doubling)** — no WebSocket presence, no rooms. The bottom
  nav ships with Today and Progress only; the Rooms tab lands with Task 15
  rather than pointing at a screen that does not exist.
- **Phase 4 (offline outbox, iOS notifications, PWA manifest)** — the active
  session is already durably persisted and recovers after a force-quit, but
  mutations are not yet queued for replay.
- **Phase 5** — the nudge copy pass and the full design-system audit.
