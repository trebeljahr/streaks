import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchesGlob } from "node:path";
import { logAuthLink, requireEmailVerification } from "../packages/server/src/auth/link-policy.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("auth links stay out of logs unless development or explicit owner recovery", () => {
  for (const source of [{}, { NODE_ENV: "production" }, { NODE_ENV: "production", AUTH_LOG_LINKS: "false" }, { NODE_ENV: "production", AUTH_LOG_LINKS: "TRUE" }]) {
    const logs = [];
    assert.throws(() => logAuthLink("Reset", "private@example.test", "https://example.test/token-secret", source, (line) => logs.push(line)), /Auth email unavailable/);
    assert.deepEqual(logs, []);
  }
  for (const source of [{ NODE_ENV: "development" }, { NODE_ENV: "test" }, { NODE_ENV: "production", AUTH_LOG_LINKS: "true" }]) {
    const logs = [];
    logAuthLink("Reset", "owner@example.test", "https://example.test/fixture", source, (line) => logs.push(line));
    assert.equal(logs.length, 1);
    assert.match(logs[0], /fixture/);
  }
});
test("production email verification requires an explicit opt-out", () => {
  assert.equal(requireEmailVerification(false, { NODE_ENV: "production" }), true);
  assert.equal(requireEmailVerification(true, { NODE_ENV: "development" }), true);
  assert.equal(requireEmailVerification(false, { NODE_ENV: "development" }), false);
  assert.equal(requireEmailVerification(false, { NODE_ENV: "production", AUTH_REQUIRE_EMAIL_VERIFICATION: "false" }), false);
  assert.throws(() => requireEmailVerification(true, { AUTH_REQUIRE_EMAIL_VERIFICATION: "typo" }));
});
test("all development infrastructure publications bind loopback", () => {
  const ports = [...read("docker-compose.dev.yml").matchAll(/- "([^"\n]+:\d+)"/g)].map((m) => m[1]);
  assert.ok(ports.length >= 2);
  for (const port of ports) assert.match(port, /^127\.0\.0\.1:/);
});
test("Docker excludes secret fixtures at root and nested package depths", () => {
  const patterns = read(".dockerignore").split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !x.startsWith("#"));
  const excluded = (path) => patterns.reduce((state, pattern) => matchesGlob(path, pattern.replace(/^!/, "")) ? !pattern.startsWith("!") : state, false);
  for (const dir of ["", "packages/server/", "packages/server/nested/"]) {
    for (const file of [".env", ".env.keys", ".env.development.local", ".env.production.local", "signing.key", "private.pem"]) assert.equal(excluded(dir + file), true, dir + file);
    assert.equal(excluded(dir + ".env.example"), false);
  }
});
test("auth callbacks delegate to the guarded link policy", () => {
  const source = read("packages/server/src/auth/auth.ts");
  assert.match(source, /link-policy\.js/);
  assert.doesNotMatch(source, /console\.log/);
  assert.doesNotMatch(source, /requireEmailVerification: false/);
});
