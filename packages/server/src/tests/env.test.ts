import assert from "node:assert/strict";
import test from "node:test";
import { env, getTrustedOrigins } from "../config/env.js";

test("trusted origins include the configured frontend and trimmed extra origins", () => {
  const previous = {
    FRONTEND_URL: env.FRONTEND_URL,
    TRUSTED_ORIGINS: env.TRUSTED_ORIGINS,
  };
  try {
    Object.assign(env, {
      FRONTEND_URL: "https://client.example.test",
      TRUSTED_ORIGINS: "capacitor://localhost, , app://-",
    });
    assert.deepEqual(getTrustedOrigins(), [
      "https://client.example.test",
      "capacitor://localhost",
      "app://-",
    ]);
  } finally {
    Object.assign(env, previous);
  }
});
