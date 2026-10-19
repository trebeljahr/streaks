import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ErrorEvent, NodeOptions } from "@sentry/node";
import { sentryOptions } from "../sentry-options.js";

type TransactionEvent = Parameters<NonNullable<NodeOptions["beforeSendTransaction"]>>[0];

const SECRETS = /session_token|abc\.def|Bearer|hunter2|person@example\.com/;

function sampleRequest(): NonNullable<ErrorEvent["request"]> {
  return {
    method: "POST",
    url: "https://streaks.example/api/auth/sign-in/email",
    headers: {
      Cookie: "better-auth.session_token=abc.def",
      "Set-Cookie": "better-auth.session_token=abc.def; Path=/; HttpOnly",
      AUTHORIZATION: "Bearer abc.def",
      "user-agent": "node-test",
      "content-type": "application/json",
    },
    cookies: { "better-auth.session_token": "abc.def" },
    data: { email: "person@example.com", password: "hunter2" },
  };
}

const KEPT = {
  method: "POST",
  url: "https://streaks.example/api/auth/sign-in/email",
  headers: { "user-agent": "node-test", "content-type": "application/json" },
};

describe("sentryOptions", () => {
  const options = sentryOptions("https://public@glitchtip.example/1");

  test("error events lose cookies, credential headers and the body", async () => {
    const event: ErrorEvent = { type: undefined, request: sampleRequest() };
    const sent = await options.beforeSend?.(event, {});
    assert.deepEqual(sent?.request, KEPT);
    assert.doesNotMatch(JSON.stringify(sent), SECRETS);
  });

  test("transactions lose them too", async () => {
    const event: TransactionEvent = { type: "transaction", request: sampleRequest() };
    const sent = await options.beforeSendTransaction?.(event, {});
    assert.deepEqual(sent?.request, KEPT);
    assert.doesNotMatch(JSON.stringify(sent), SECRETS);
  });

  test("events without a request pass through", async () => {
    const event: ErrorEvent = { type: undefined, message: "boom" };
    assert.deepEqual(await options.beforeSend?.(event, {}), { type: undefined, message: "boom" });
  });

  test("replaces the integrations that read the body and cookies", () => {
    const names = Array.isArray(options.integrations) ? options.integrations.map((i) => i.name) : [];
    assert.deepEqual(names, ["Http", "RequestData"]);
  });
});
