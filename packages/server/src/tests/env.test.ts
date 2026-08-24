import assert from "node:assert/strict";
import test from "node:test";
import { getTrustedOrigins } from "../config/env.js";

test("trusted origins include the configured frontend URL", () => {
  assert.ok(getTrustedOrigins().includes("http://localhost:3000"));
});
