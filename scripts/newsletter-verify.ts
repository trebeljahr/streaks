#!/usr/bin/env -S npx tsx
/**
 * End-to-end smoke for the Listmonk + SES wiring. Runs four checks in
 * order, prints a green ✓ / red ✗ per step, exits non-zero on the
 * first failure. Designed to be the first thing you run after
 * `hatchkit add <project> listmonk-ses` to verify everything's in
 * place before you start building.
 *
 *   1. Listmonk admin reachable           GET /api/lists
 *   2. Live + test lists resolvable       LISTMONK_LIST_ID + LISTMONK_TEST_LIST_ID exist
 *   3. Test recipient on the test list    upsert subscriber as confirmed
 *   4. Transactional send                 POST /api/tx with the smoke payload
 *
 * Step 4 sends a real email — make sure LISTMONK_TEST_RECIPIENT is an
 * inbox you own. Hatchkit's listmonk-ses provisioner pre-fills this
 * from `defaults.forwardingEmail` when one is configured.
 *
 * Usage:
 *
 *   pnpm newsletter:verify                       use LISTMONK_TEST_RECIPIENT
 *   pnpm newsletter:verify you@example.com       override the recipient
 *   pnpm newsletter:verify --skip-send           steps 1-3 only (no real send)
 */
import {
  findSubscriber,
  resolveListId,
  sendTransactional,
  upsertSubscriber,
} from "../packages/server/src/services/newsletter/listmonk.js";

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

interface Step {
  label: string;
  run: () => Promise<string | void>;
}

async function listmonkRequest<T>(path: string): Promise<T> {
  const base = (process.env.LISTMONK_URL ?? "").replace(/\/$/, "");
  if (!base) throw new Error("LISTMONK_URL is not set");
  const user = process.env.LISTMONK_API_USER;
  const token = process.env.LISTMONK_API_TOKEN;
  if (!user || !token) throw new Error("LISTMONK_API_USER / LISTMONK_API_TOKEN are not set");
  const res = await fetch(`${base}${path}`, {
    headers: {
      Authorization: `token ${user}:${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return JSON.parse(text) as T;
}

async function main(): Promise<void> {
  const to = process.argv.find((a, i, arr) => !a.startsWith("--") && i >= 2 && arr[i - 1] !== "--subject")
    ?? process.env.LISTMONK_TEST_RECIPIENT;
  const skipSend = hasFlag("skip-send");

  if (!to && !skipSend) {
    console.error(
      "[newsletter:verify] No recipient. Pass one as a positional arg, set LISTMONK_TEST_RECIPIENT,\n" +
        "                    or pass --skip-send to run the read-only checks only.",
    );
    process.exit(1);
  }

  const steps: Step[] = [
    {
      label: "Listmonk admin reachable",
      run: async () => {
        const res = await listmonkRequest<{ data: { results: Array<{ id: number; name: string }> } }>(
          "/api/lists?per_page=1",
        );
        return `${res.data.results.length} list(s) visible`;
      },
    },
    {
      label: "Live + test lists configured",
      run: async () => {
        const live = process.env.LISTMONK_LIST_ID;
        const test = process.env.LISTMONK_TEST_LIST_ID;
        if (!live || !test) {
          throw new Error("LISTMONK_LIST_ID / LISTMONK_TEST_LIST_ID missing from env");
        }
        const env = resolveListId();
        return `LISTMONK_LIST_ID=${live} · LISTMONK_TEST_LIST_ID=${test} · env-resolved=${env}`;
      },
    },
  ];

  if (to) {
    steps.push({
      label: `Subscriber ${to} confirmed on env-resolved list`,
      run: async () => {
        await upsertSubscriber(to, "confirmed");
        const sub = await findSubscriber(to);
        if (!sub) throw new Error(`subscriber ${to} not found after upsert`);
        return `id=${sub.id} · status=${sub.status}`;
      },
    });
  }

  if (to && !skipSend) {
    steps.push({
      label: `Transactional send → ${to}`,
      run: async () => {
        await sendTransactional({
          to,
          subject: "Hatchkit · listmonk-ses verify",
          html: `<p style="font-family:system-ui,sans-serif;">
            <strong>newsletter:verify</strong> ran cleanly. Listmonk reached SES, SES delivered,
            and the transactional template rendered.
          </p>`,
        });
        return "queued — check inbox + SES Activity";
      },
    });
  }

  let failed = false;
  for (const step of steps) {
    process.stdout.write(`  · ${step.label}… `);
    try {
      const detail = await step.run();
      console.log(`\x1b[32m✓\x1b[0m${detail ? ` — \x1b[2m${detail}\x1b[0m` : ""}`);
    } catch (err) {
      console.log(`\x1b[31m✗\x1b[0m`);
      console.error(`    \x1b[31m${(err as Error).message}\x1b[0m`);
      failed = true;
      break;
    }
  }

  console.log("");
  if (failed) {
    console.error(
      "[newsletter:verify] One or more steps failed. Most common causes:\n" +
        "  · Listmonk URL or API user/token wrong → re-run `hatchkit config add listmonk`\n" +
        "  · SES still in sandbox + recipient not verified → `hatchkit ses verify <email>` or open the production-access form\n" +
        "  · Test recipient missing → set LISTMONK_TEST_RECIPIENT in .env.development",
    );
    process.exit(1);
  }
  console.log(`[newsletter:verify] All checks passed${skipSend ? " (send skipped)." : "."}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
