/*import { routePartykitRequest, Server } from "partyserver";

import type { OutgoingMessage, Position } from "../shared";
import type { Connection, ConnectionContext } from "partyserver";

// This is the state that we'll store on each connection
type ConnectionState = {
  position: Position;
};

export class Globe extends Server {
  onConnect(conn: Connection<ConnectionState>, ctx: ConnectionContext) {
    // Whenever a fresh connection is made, we'll
    // send the entire state to the new connection

    // First, let's extract the position from the Cloudflare headers
    const latitude = ctx.request.cf?.latitude as string | undefined;
    const longitude = ctx.request.cf?.longitude as string | undefined;
    if (!latitude || !longitude) {
      console.warn(`Missing position information for connection ${conn.id}`);
      return;
    }
    const position = {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude),
      id: conn.id,
    };
    // And save this on the connection's state
    conn.setState({
      position,
    });

    // Now, let's send the entire state to the new connection
    for (const connection of this.getConnections<ConnectionState>()) {
      try {
        conn.send(
          JSON.stringify({
            type: "add-marker",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            position: connection.state!.position,
          } satisfies OutgoingMessage),
        );

        // And let's send the new connection's position to all other connections
        if (connection.id !== conn.id) {
          connection.send(
            JSON.stringify({
              type: "add-marker",
              position,
            } satisfies OutgoingMessage),
          );
        }
      } catch {
        this.onCloseOrError(conn);
      }
    }
  }

  // Whenever a connection closes (or errors), we'll broadcast a message to all
  // other connections to remove the marker.
  onCloseOrError(connection: Connection) {
    this.broadcast(
      JSON.stringify({
        type: "remove-marker",
        id: connection.id,
      } satisfies OutgoingMessage),
      [connection.id],
    );
  }

  onClose(connection: Connection): void | Promise<void> {
    this.onCloseOrError(connection);
  }

  onError(connection: Connection): void | Promise<void> {
    this.onCloseOrError(connection);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, { ...env })) ||
      new Response("Not Found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
*/

// src/server/index.ts
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
