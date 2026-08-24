import type { WebSocket } from "ws";
import type { RoomMember, ClientToServerMessage, ServerToClientMessage } from "@starter/shared";

interface MemberInfo {
  userId: string;
  displayName: string;
  joinedAt: Date;
}

interface Room {
  id: string;
  members: Map<WebSocket, MemberInfo>;
  createdAt: Date;
}

/**
 * Manages WebSocket rooms — join, leave, broadcast, message handling.
 * Generic enough for chat rooms, game lobbies, or turn-based multiplayer.
 */
export class RoomManager {
  private rooms = new Map<string, Room>();
  private socketToRoom = new Map<WebSocket, string>();

  join(
    roomId: string,
    userId: string,
    displayName: string,
    socket: WebSocket,
  ): void {
    // Leave current room if in one
    this.leave(socket);

    let room = this.rooms.get(roomId);
    if (!room) {
      room = { id: roomId, members: new Map(), createdAt: new Date() };
      this.rooms.set(roomId, room);
    }

    const memberInfo: MemberInfo = {
      userId,
      displayName,
      joinedAt: new Date(),
    };
    room.members.set(socket, memberInfo);
    this.socketToRoom.set(socket, roomId);

    // Notify existing members
    this.broadcast(roomId, {
      type: "member-joined",
      member: {
        userId,
        displayName,
        joinedAt: memberInfo.joinedAt.toISOString(),
      },
    }, socket);

    // Send room state to the joining member
    this.send(socket, {
      type: "room-state",
      roomId,
      members: this.getMembers(roomId),
    });
  }

  leave(socket: WebSocket): void {
    const roomId = this.socketToRoom.get(socket);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const memberInfo = room.members.get(socket);
    room.members.delete(socket);
    this.socketToRoom.delete(socket);

    if (room.members.size === 0) {
      this.rooms.delete(roomId);
    } else if (memberInfo) {
      this.broadcast(roomId, {
        type: "member-left",
        userId: memberInfo.userId,
      });
    }
  }

  handleMessage(socket: WebSocket, message: ClientToServerMessage): void {
    const roomId = this.socketToRoom.get(socket);

    switch (message.type) {
      case "join-room":
        // Auth info should already be set; this is handled in the connection handler
        break;

      case "leave-room":
        this.leave(socket);
        break;

      case "chat": {
        if (!roomId) {
          this.send(socket, {
            type: "error",
            code: "NOT_IN_ROOM",
            message: "You must join a room first",
          });
          return;
        }
        const room = this.rooms.get(roomId);
        const member = room?.members.get(socket);
        if (member) {
          this.broadcast(roomId, {
            type: "chat",
            userId: member.userId,
            displayName: member.displayName,
            text: message.text,
          });
        }
        break;
      }

      case "action": {
        if (!roomId) {
          this.send(socket, {
            type: "error",
            code: "NOT_IN_ROOM",
            message: "You must join a room first",
          });
          return;
        }
        // Broadcast the action as a state update — override this for game-specific logic
        this.broadcast(roomId, {
          type: "state-update",
          payload: message.payload,
        });
        break;
      }
    }
  }

  broadcast(
    roomId: string,
    message: ServerToClientMessage,
    exclude?: WebSocket,
  ): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const data = JSON.stringify(message);
    for (const [socket] of room.members) {
      if (socket !== exclude && socket.readyState === 1) {
        socket.send(data);
      }
    }
  }

  send(socket: WebSocket, message: ServerToClientMessage): void {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify(message));
    }
  }

  getMembers(roomId: string): RoomMember[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.members.values()).map((m) => ({
      userId: m.userId,
      displayName: m.displayName,
      joinedAt: m.joinedAt.toISOString(),
    }));
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getConnectionCount(): number {
    return this.socketToRoom.size;
  }

  /** Remove empty rooms older than maxAgeMs. */
  pruneEmpty(maxAgeMs = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, room] of this.rooms) {
      if (room.members.size === 0 && now - room.createdAt.getTime() > maxAgeMs) {
        this.rooms.delete(id);
      }
    }
  }
}
