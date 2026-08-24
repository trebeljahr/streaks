import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "http";
import type { ClientToServerMessage } from "@starter/shared";
import { authenticateUpgrade } from "./auth.js";
import { RoomManager } from "./rooms.js";
import { env, getTrustedOrigins } from "../config/env.js";

const PING_INTERVAL_MS = 10_000;
const PONG_TIMEOUT_MS = 5_000;

export const roomManager = new RoomManager();

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade manually for path/origin validation
  server.on("upgrade", async (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const path = url.pathname;

    // Only accept WS connections on known paths
    if (path !== "/ws" && path !== "/api/ws") {
      socket.destroy();
      return;
    }

    // Origin validation in production
    if (env.isProduction) {
      const trusted = getTrustedOrigins();
      const origin = req.headers.origin;
      if (origin && trusted.length > 0 && !trusted.includes(origin)) {
        socket.destroy();
        return;
      }
    }

    // Authenticate
    const session = await authenticateUpgrade(req);

    wss.handleUpgrade(req, socket, head, (ws) => {
      (ws as WebSocket & { userId?: string; displayName?: string }).userId =
        session?.user?.id;
      (ws as WebSocket & { displayName?: string }).displayName =
        session?.user?.name ?? "Anonymous";
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws: WebSocket & { userId?: string; displayName?: string }, req) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const roomId = url.searchParams.get("roomId");

    // Auto-join room if roomId provided
    if (roomId && ws.userId) {
      roomManager.join(roomId, ws.userId, ws.displayName ?? "Anonymous", ws);
    }

    // Ping/pong heartbeat
    let isAlive = true;
    ws.on("pong", () => {
      isAlive = true;
    });

    const pingInterval = setInterval(() => {
      if (!isAlive) {
        clearInterval(pingInterval);
        ws.terminate();
        return;
      }
      isAlive = false;
      ws.ping();
    }, PING_INTERVAL_MS);

    // Message handling
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString()) as ClientToServerMessage;

        if (message.type === "join-room" && ws.userId) {
          roomManager.join(
            message.roomId,
            ws.userId,
            ws.displayName ?? "Anonymous",
            ws,
          );
        } else {
          roomManager.handleMessage(ws, message);
        }
      } catch {
        roomManager.send(ws, {
          type: "error",
          code: "INVALID_MESSAGE",
          message: "Could not parse message",
        });
      }
    });

    // Cleanup on close
    ws.on("close", () => {
      clearInterval(pingInterval);
      roomManager.leave(ws);
    });
  });

  // Periodic room pruning (every 30 minutes)
  setInterval(() => {
    roomManager.pruneEmpty();
  }, 30 * 60 * 1000);

  return wss;
}
