import { routePartykitRequest, Server } from "partyserver";
import type { Connection, ConnectionContext } from "partyserver";

import type { Position, OutgoingMessage } from "../shared";

// ▸ State salvat pe fiecare conexiune
type ConnectionState = { position: Position };

/* Helper: converteşte "MD" → 🇲🇩 */
function flagEmoji(cc?: string) {
  if (!cc || cc.length !== 2) return undefined;
  const base = 0x1f1e6;
  return String.fromCodePoint(
    base + cc.charCodeAt(0) - 65,
    base + cc.charCodeAt(1) - 65,
  );
}

export class Globe extends Server {
  onConnect(conn: Connection<ConnectionState>, ctx: ConnectionContext) {
    /* 1️⃣  Extrage datele Cloudflare */
    const cf = ctx.request.cf || {};
    const lat = parseFloat(cf.latitude as string)  || undefined;
    const lng = parseFloat(cf.longitude as string) || undefined;

    if (lat == null || lng == null) {
      console.warn(`Missing position for ${conn.id}`);
      return; // fără coordonate nu trimitem marker-ul
    }

    /* 2️⃣  Construieşte obiectul Position bogat */
    const position: Position = {
      id: conn.id,
      lat,
      lng,
      city:    cf.city     as string | undefined,
      region:  cf.region   as string | undefined,
      country: cf.country  as string | undefined, // ex: "MD"
      flag:    flagEmoji(cf.country as string | undefined),
    };

    conn.setState({ position });

    /* 3️⃣  Trimite state-ul complet noului client
           + anunţă pe ceilalţi de sosirea lui */
    for (const c of this.getConnections<ConnectionState>()) {
      conn.send(JSON.stringify({
        type: "add-marker",
        position: c.state!.position,
      } satisfies OutgoingMessage));

      if (c.id !== conn.id) {
        c.send(JSON.stringify({
          type: "add-marker",
          position,
        } satisfies OutgoingMessage));
      }
    }
  }

  /* 4️⃣  On close / error – ne neschimbat */
  onCloseOrError(connection: Connection) {
    this.broadcast(JSON.stringify({
      type: "remove-marker",
      id: connection.id,
    } satisfies OutgoingMessage), [connection.id]);
  }
  onClose(connection: Connection)  { this.onCloseOrError(connection); }
  onError(connection: Connection)  { this.onCloseOrError(connection); }
}

/* 5️⃣  Handler HTTP (tot neschimbat) */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, { ...env })) ||
      new Response("Not Found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
