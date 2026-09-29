import assert from "node:assert/strict";
import test from "node:test";
import { listmonkTxBody } from "../services/email.js";

const source = {
  LISTMONK_FROM: "",
  LISTMONK_FROM_EMAIL: "noreply@example.com",
  LISTMONK_TX_TEMPLATE_ID: "1",
};
const params = { to: "new@example.com", subject: "Verify", text: "a < b" };

// Listmonk's default mode answers 400 for a recipient who is not a
// subscriber, and nobody signing up or resetting a password is one. The
// failure only shows once hosted mail is switched on.
test("listmonk tx body reaches people who are not newsletter subscribers", () => {
  const body = listmonkTxBody(params, source);
  assert.equal(body.subscriber_mode, "external");
  assert.equal(body.subscriber_email, "new@example.com");
});

test("listmonk tx body names sender and template, and escapes plain text", () => {
  const body = listmonkTxBody(params, {
    ...source,
    LISTMONK_FROM: "Streaks <noreply@mail.example.com>",
  });
  assert.equal(body.from_email, "Streaks <noreply@mail.example.com>");
  assert.equal(body.template_id, 1);
  assert.deepEqual(body.data, { subject: "Verify", body: "<pre>a &lt; b</pre>" });
});

test("listmonk tx body falls back to LISTMONK_FROM_EMAIL and passes html through", () => {
  const body = listmonkTxBody({ ...params, html: "<p>hi</p>" }, source);
  assert.equal(body.from_email, "noreply@example.com");
  assert.deepEqual(body.data, { subject: "Verify", body: "<p>hi</p>" });
});
