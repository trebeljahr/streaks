import type { RoomMember } from "./types.js";

// ── Client → Server ──────────────────────────────────────────────────

export type ClientToServerMessage =
  | { type: "join-room"; roomId: string }
  | { type: "leave-room" }
  | { type: "chat"; text: string }
  | { type: "action"; payload: Record<string, unknown> };

// ── Server → Client ──────────────────────────────────────────────────

export type ServerToClientMessage =
  | { type: "room-state"; roomId: string; members: RoomMember[] }
  | { type: "member-joined"; member: RoomMember }
  | { type: "member-left"; userId: string }
  | { type: "chat"; userId: string; displayName: string; text: string }
  | { type: "state-update"; payload: Record<string, unknown> }
  | { type: "error"; code: string; message: string };
