import { DurableObject } from "cloudflare:workers";

interface ClapMessage {
  type: "clap";
  clipx: number;
  clipy: number;
}

export class ClapRoom extends DurableObject {
  private sessions: Set<WebSocket> = new Set();

  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    this.ctx.acceptWebSocket(server);
    this.sessions.add(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;

    try {
      const data = JSON.parse(message);
      if (data.type !== "clap") return;

      // Sanitize: clamp to [0, 1]
      const safe: ClapMessage = {
        type: "clap",
        clipx: Math.min(1, Math.max(0, parseFloat(data.clipx))),
        clipy: Math.min(1, Math.max(0, parseFloat(data.clipy))),
      };

      const payload = JSON.stringify(safe);

      // Broadcast to all other connected clients
      for (const session of this.sessions) {
        if (session !== ws) {
          try {
            session.send(payload);
          } catch {
            this.sessions.delete(session);
          }
        }
      }
    } catch {
      // Ignore malformed messages
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.sessions.delete(ws);
    ws.close();
  }

  async webSocketError(ws: WebSocket) {
    this.sessions.delete(ws);
  }
}
