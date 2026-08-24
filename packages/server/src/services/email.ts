import { env } from "../config/env.js";

interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send a transactional email via Listmonk's /api/tx endpoint (which
 * relays through the SES SMTP identity configured at provision time).
 * Falls back to console logging when Listmonk isn't configured yet.
 *
 * The transactional template seeded by `hatchkit add <project>
 * listmonk-ses` renders `{{ .Tx.Data.subject }}` for the subject and
 * `{{ .Tx.Data.body }}` raw in the body (tx templates use Go
 * text/template — no `safeHTML` filter — so HTML passes through). When
 * `html` is supplied we send that, otherwise the plaintext body is
 * wrapped in a `<pre>` so the template still receives HTML.
 */
export async function sendEmail(params: EmailParams): Promise<void> {
  const ready =
    env.LISTMONK_URL &&
    env.LISTMONK_API_USER &&
    env.LISTMONK_API_TOKEN &&
    env.LISTMONK_TX_TEMPLATE_ID &&
    (env.LISTMONK_FROM_EMAIL || env.LISTMONK_FROM);
  if (!ready) {
    console.log(`[email] Would send to ${params.to}: ${params.subject}`);
    return;
  }

  const body = params.html ?? `<pre>${escapeHtml(params.text)}</pre>`;
  const baseUrl = env.LISTMONK_URL.replace(/\/$/, "");
  const auth = Buffer.from(
    `${env.LISTMONK_API_USER}:${env.LISTMONK_API_TOKEN}`,
  ).toString("base64");
  const fromEmail = env.LISTMONK_FROM || env.LISTMONK_FROM_EMAIL;

  const response = await fetch(`${baseUrl}/api/tx`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscriber_email: params.to,
      template_id: Number(env.LISTMONK_TX_TEMPLATE_ID),
      from_email: fromEmail,
      data: { subject: params.subject, body },
      content_type: "html",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Listmonk /api/tx error (${response.status}): ${text}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
