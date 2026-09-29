import { env } from "../config/env.js";

export interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * True when `sendEmail` would deliver rather than log. Callers that log a
 * link instead of mailing it (auth.ts) branch on this, so a partial
 * Listmonk config logs the link instead of dropping it.
 */
export function isEmailDeliveryConfigured(
  source: Pick<
    typeof env,
    | "LISTMONK_URL"
    | "LISTMONK_API_USER"
    | "LISTMONK_API_TOKEN"
    | "LISTMONK_TX_TEMPLATE_ID"
    | "LISTMONK_FROM"
    | "LISTMONK_FROM_EMAIL"
  > = env,
): boolean {
  return Boolean(
    source.LISTMONK_URL &&
      source.LISTMONK_API_USER &&
      source.LISTMONK_API_TOKEN &&
      source.LISTMONK_TX_TEMPLATE_ID &&
      (source.LISTMONK_FROM || source.LISTMONK_FROM_EMAIL),
  );
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
  if (!isEmailDeliveryConfigured()) {
    console.log(`[email] Would send to ${params.to}: ${params.subject}`);
    return;
  }

  const baseUrl = env.LISTMONK_URL.replace(/\/$/, "");
  const auth = Buffer.from(
    `${env.LISTMONK_API_USER}:${env.LISTMONK_API_TOKEN}`,
  ).toString("base64");

  const response = await fetch(`${baseUrl}/api/tx`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(listmonkTxBody(params, env)),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Listmonk /api/tx error (${response.status}): ${text}`);
  }
}

/**
 * The `/api/tx` body for one account email.
 *
 * `subscriber_mode: "external"` is what lets it reach anybody at all. Without
 * it Listmonk uses its `default` mode, where the recipient must already be a
 * subscriber, and answers 400 for everyone else — which is every person who
 * signs up or resets a password, since none of them joined the newsletter.
 * `external` also skips the subscriber lookup, so nothing about a person's
 * newsletter state decides whether their reset arrives. `subscriber_email`
 * stays singular; Listmonk folds it into `subscriber_emails`
 * (`validateTxMessage`, checked in v6.0.0, the version the hosted deploy runs).
 */
export function listmonkTxBody(
  params: EmailParams,
  source: Pick<
    typeof env,
    "LISTMONK_FROM" | "LISTMONK_FROM_EMAIL" | "LISTMONK_TX_TEMPLATE_ID"
  >,
): Record<string, unknown> {
  return {
    subscriber_email: params.to,
    subscriber_mode: "external",
    template_id: Number(source.LISTMONK_TX_TEMPLATE_ID),
    from_email: source.LISTMONK_FROM || source.LISTMONK_FROM_EMAIL,
    data: {
      subject: params.subject,
      body: params.html ?? `<pre>${escapeHtml(params.text)}</pre>`,
    },
    content_type: "html",
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
