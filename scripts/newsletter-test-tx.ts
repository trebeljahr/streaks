#!/usr/bin/env -S npx tsx
/**
 * Single-shot transactional smoke test for the Listmonk + SES wiring.
 * Sends one /api/tx email through the project's transactional template
 * to LISTMONK_TEST_RECIPIENT (or the address passed positionally),
 * upserting the subscriber on the test list first so /api/tx accepts
 * the send.
 *
 * Usage:
 *
 *   pnpm newsletter:test-tx                       send to LISTMONK_TEST_RECIPIENT
 *   pnpm newsletter:test-tx you@example.com       send to a specific address
 *   pnpm newsletter:test-tx --subject "Ping" --html "<p>hi</p>"
 *
 * The default body is intentionally plain so a successful run can be
 * scanned by eye: "subject: Hatchkit · listmonk-ses smoke test" and a
 * short HTML paragraph. Run after `hatchkit add <project> listmonk-ses`
 * to confirm the SES identity, SMTP relay, and tx template all work
 * end-to-end before wiring real product flows.
 */
import { sendTransactional, upsertSubscriber } from "../packages/server/src/services/newsletter/listmonk.js";

function getFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx === process.argv.length - 1) return undefined;
  return process.argv[idx + 1];
}

async function main(): Promise<void> {
  const positional = process.argv.slice(2).filter((a, i, arr) => {
    if (a.startsWith("--")) return false;
    const prev = arr[i - 1];
    if (prev === "--subject" || prev === "--html") return false;
    return true;
  });

  const to = positional[0] ?? process.env.LISTMONK_TEST_RECIPIENT;
  if (!to) {
    console.error(
      "[newsletter:test-tx] No recipient. Pass one as a positional arg or set LISTMONK_TEST_RECIPIENT.\n" +
        "                    hatchkit's listmonk-ses provisioner writes the latter to .env.development\n" +
        "                    when a default forwarding email is configured (`hatchkit setup`).",
    );
    process.exit(1);
  }

  const subject = getFlag("subject") ?? "Hatchkit · listmonk-ses smoke test";
  const html =
    getFlag("html") ??
    `<p style="font-family:system-ui,sans-serif;line-height:1.5;">
      If you're reading this, your Listmonk + SES wiring is working end-to-end:
      <ul>
        <li>SES verified <code>${escapeHtml(process.env.SES_FROM_EMAIL ?? "your sending identity")}</code></li>
        <li>Listmonk's <code>/api/tx</code> accepted the send</li>
        <li>The transactional template seeded by Hatchkit rendered the body raw</li>
      </ul>
      Edit <code>scripts/newsletter-test-tx.ts</code> to customise the smoke payload.
    </p>`;

  console.info(`[newsletter:test-tx] to:        ${to}`);
  console.info(`[newsletter:test-tx] subject:   ${subject}`);
  console.info(`[newsletter:test-tx] template:  LISTMONK_TX_TEMPLATE_ID=${process.env.LISTMONK_TX_TEMPLATE_ID ?? "(unset)"}`);
  console.info(`[newsletter:test-tx] upserting subscriber as confirmed on the env-resolved list…`);
  await upsertSubscriber(to, "confirmed");
  console.info(`[newsletter:test-tx] sending /api/tx…`);
  await sendTransactional({ to, subject, html });
  console.info(`[newsletter:test-tx] sent — check ${to} (and SES → Activity if it doesn't land).`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
