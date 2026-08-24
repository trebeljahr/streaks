#!/usr/bin/env -S npx tsx
/**
 * Send the bundled welcome email (`emails/welcome.html`) to one
 * recipient via Listmonk's `/api/tx`. Mirrors what the production
 * post-confirmation flow would do — same template, same SMTP path —
 * so a successful run proves the whole transactional pipeline works
 * with real, multi-paragraph HTML (not just the inline smoke payload
 * `newsletter:test-tx` uses).
 *
 * Usage:
 *
 *   pnpm newsletter:welcome                       to LISTMONK_TEST_RECIPIENT
 *   pnpm newsletter:welcome you@example.com       to a specific address
 *
 * The HTML uses `{{siteName}}` + `{{siteUrl}}` placeholders that this
 * script substitutes from env (NEWSLETTER_SITE_NAME / NEWSLETTER_SITE_URL,
 * falling back to FRONTEND_URL). Edit `emails/welcome.html` to change
 * the copy; the script reads the file at run time.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sendTransactional, upsertSubscriber } from "../packages/server/src/services/newsletter/listmonk.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const WELCOME_HTML_PATH = path.resolve(here, "..", "emails", "welcome.html");

async function main(): Promise<void> {
  const to = process.argv[2] ?? process.env.LISTMONK_TEST_RECIPIENT;
  if (!to) {
    console.error(
      "[newsletter:welcome] No recipient. Pass one as a positional arg or set LISTMONK_TEST_RECIPIENT.",
    );
    process.exit(1);
  }

  const siteName = process.env.NEWSLETTER_SITE_NAME ?? "this newsletter";
  const siteUrl = (process.env.NEWSLETTER_SITE_URL ?? process.env.FRONTEND_URL ?? "https://example.com").replace(/\/$/, "");

  const raw = readFileSync(WELCOME_HTML_PATH, "utf-8");
  const html = raw.replace(/\{\{siteName\}\}/g, siteName).replace(/\{\{siteUrl\}\}/g, siteUrl);

  console.info(`[newsletter:welcome] to:        ${to}`);
  console.info(`[newsletter:welcome] template:  emails/welcome.html (${raw.length} bytes)`);
  console.info(`[newsletter:welcome] site:      ${siteName} · ${siteUrl}`);
  console.info(`[newsletter:welcome] upserting subscriber as confirmed on the env-resolved list…`);
  await upsertSubscriber(to, "confirmed");
  console.info(`[newsletter:welcome] sending /api/tx…`);
  await sendTransactional({
    to,
    subject: `Welcome to ${siteName}`,
    html,
  });
  console.info(`[newsletter:welcome] sent — check ${to}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
