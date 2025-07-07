import "./styles.css";

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";

import type { OutgoingMessage, Position } from "../../shared"; // ← IMPORTANT

/** Extind Position cu câmpurile necesare COBE */
type Marker = Position & {
  location: [number, number]; // (lat,lng) pentru cobe
  size: number;               // dimensiunea bulinei
};

function App() {
  // ───────── state local ─────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [counter, setCounter] = useState(0);
  const [lastPlace, setLastPlace] = useState<string | null>(null);

  /** Mapăm id-ul conexiunii → marker */
  const positions = useRef<Map<string, Marker>>(new Map());

  // ───────── websocket (PartySocket) ─────────
  const socket = usePartySocket({
    room: "default",
    party: "globe",
    onMessage(evt) {
      const message = JSON.parse(evt.data) as OutgoingMessage;

      if (message.type === "add-marker") {
        const pos = message.position;
        const marker: Marker = {
          ...pos,
          location: [pos.lat, pos.lng],
          size: pos.id === socket.id ? 0.1 : 0.05,
        };

        positions.current.set(marker.id, marker);
        setCounter((c) => c + 1);
        setLastPlace(
          `${marker.flag ?? ""} ${marker.city ?? marker.country ?? "loc necunoscut"}`
        );
      } else {
        positions.current.delete(message.id);
        setCounter((c) => c - 1);
      }
    },
  });

  // ───────── init COBE globe ─────────
  useEffect(() => {
    let phi = 0;

    const globe = createGlobe(canvasRef.current!, {
      devicePixelRatio: 2,
      width: 400 * 2,
      height: 400 * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 0.8,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.8, 0.1, 0.1],
      glowColor: [0.2, 0.2, 0.2],
      opacity: 0.7,
      markers: [],
      onRender: (state) => {
        // COBE vrea doar {location,size}
        state.markers = [...positions.current.values()].map((m) => ({
          location: m.location,
          size: m.size,
        }));

        state.phi = phi;
        phi += 0.01;
      },
    });

    return () => globe.destroy();
  }, []);

  // ───────── UI ─────────
  return (
    <div className="App">
      <h1>Unde sunt alții acum?</h1>

      <p>
        {counter === 0 ? (
          "Nimeni conectat."
        ) : (
          <>
            <b>{counter}</b> {counter === 1 ? "persoană" : "oameni"} aici acum
          </>
        )}
      </p>

      <canvas
        ref={canvasRef}
        style={{ width: 400, height: 400, maxWidth: "100%", aspectRatio: 1 }}
      />

      <p>{lastPlace && <> — ultimul: <b>{lastPlace}</b></>}</p>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
