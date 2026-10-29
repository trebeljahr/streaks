import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import express from "express";

for (const mode of ["json", "urlencoded"] as const) {
  test(`${mode} parsing survives trailing compressed bytes and continues serving`, {
    timeout: 10_000,
  }, async () => {
    const app = express();
    app.use(
      mode === "json"
        ? express.json({ limit: "100kb" })
        : express.urlencoded({ extended: true }),
    );
    app.post("/echo", (req, res) => res.json(req.body));
    app.use(
      (
        error: { status?: number },
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        res.sendStatus(error.status ?? 500);
      },
    );
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/echo`;
    const valid = gzipSync(
      mode === "json" ? '{"synthetic":true}' : "synthetic=true",
    );
    try {
      for (const { body, status } of [
        { body: valid, status: 200 },
        { body: Buffer.from("invalid gzip"), status: 400 },
        {
          body: Buffer.concat([
            valid,
            Buffer.of(0),
            Buffer.alloc(96 * 1024, 0x5a),
          ]),
          status: 200,
        },
        { body: valid, status: 200 },
      ]) {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "content-type":
              mode === "json"
                ? "application/json"
                : "application/x-www-form-urlencoded",
            "content-encoding": "gzip",
          },
          body: new Uint8Array(body),
          signal: AbortSignal.timeout(3000),
        });
        assert.equal(response.status, status);
        if (status === 200)
          assert.deepEqual(await response.json(), {
            synthetic: mode === "json" ? true : "true",
          });
        // Decoder errors can be queued after the successful response.
        await delay(100);
      }
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
}
