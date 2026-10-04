import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, test } from "node:test";
import express from "express";
import { restoreApiPrefix } from "../middleware/api-prefix.js";

async function withApp(fn: (base: string) => Promise<void>) {
  const app = express();
  app.use(restoreApiPrefix);
  app.get("/api/health", (req, res) => res.json({ url: req.url, originalUrl: req.originalUrl }));
  app.all("/api/auth/{*any}", (req, res) => res.json({ url: req.url, originalUrl: req.originalUrl }));
  app.use((req, res) => res.status(404).json({ url: req.url }));
  const server = createServer(app).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  try {
    await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

describe("restoreApiPrefix", () => {
  test("serves prefixed and Traefik-stripped paths the same", async () => {
    await withApp(async (base) => {
      for (const path of ["/api/health", "/health"]) {
        const res = await fetch(base + path);
        assert.equal(res.status, 200, path);
        assert.deepEqual(await res.json(), { url: "/api/health", originalUrl: "/api/health" });
      }
    });
  });

  test("keeps the query string and rewrites originalUrl for better-auth", async () => {
    await withApp(async (base) => {
      const res = await fetch(`${base}/auth/get-session?x=1`);
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { url: "/api/auth/get-session?x=1", originalUrl: "/api/auth/get-session?x=1" });
    });
  });

  test("does not double-prefix and leaves unknown paths unknown", async () => {
    await withApp(async (base) => {
      assert.equal((await fetch(`${base}/api/nope`)).status, 404);
      assert.deepEqual(await (await fetch(`${base}/apiary`)).json(), { url: "/api/apiary" });
    });
  });
});
