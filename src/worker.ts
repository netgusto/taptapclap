export { ClapRoom } from "./clap-room";

export interface Env {
  CLAP_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade on /ws
    if (url.pathname === "/ws") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }

      // Everyone joins the same room
      const id = env.CLAP_ROOM.idFromName("global");
      const room = env.CLAP_ROOM.get(id);
      return room.fetch(request);
    }

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
