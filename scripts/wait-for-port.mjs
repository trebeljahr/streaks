#!/usr/bin/env node
// Waits for a TCP port to become reachable. Used by dev.mjs to ensure the
// server is ready before starting the client.
//
// Usage: node scripts/wait-for-port.mjs <port> [timeout_ms]

import { createConnection } from "net";

const port = parseInt(process.argv[2], 10);
const timeout = parseInt(process.argv[3] || "30000", 10);

if (!port) {
  console.error("Usage: wait-for-port.mjs <port> [timeout_ms]");
  process.exit(1);
}

const start = Date.now();

function tryConnect() {
  if (Date.now() - start > timeout) {
    console.error(`Timed out waiting for port ${port} after ${timeout}ms`);
    process.exit(1);
  }

  const socket = createConnection({ port, host: "127.0.0.1" });

  socket.on("connect", () => {
    socket.destroy();
    process.exit(0);
  });

  socket.on("error", () => {
    socket.destroy();
    setTimeout(tryConnect, 250);
  });
}

tryConnect();
