"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useDataChannel,
  useLocalParticipant,
} from "@livekit/components-react";
import { api } from "@/lib/api";

type Stroke = {
  id: string;
  color: string;
  width: number;
  // Normalized 0..1 coordinates so they survive resolution changes.
  points: { x: number; y: number }[];
};

type AnnotationMessage =
  | { type: "stroke"; stroke: Stroke }
  | { type: "clear" };

interface AnnotationCanvasProps {
  channelId: string;
}

const COLOR_PALETTE = ["#ff5252", "#ffd54f", "#36e4ff", "#69f0ae", "#c77dff"];

/**
 * Transparent canvas overlay synced via LiveKit data channel. Stroke deltas are
 * sent reliably and a debounced REST snapshot is persisted every few seconds
 * for late-joiners.
 *
 * @param props channel id
 * @returns canvas overlay
 */
export function AnnotationCanvas({ channelId }: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [color, setColor] = useState<string>(COLOR_PALETTE[2]);
  const [width, setWidth] = useState<number>(3);
  const [enabled, setEnabled] = useState<boolean>(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const drawingRef = useRef<Stroke | null>(null);
  const { send } = useDataChannel("annotations");
  const { localParticipant } = useLocalParticipant();

  // Initial snapshot for late joiners
  useEffect(() => {
    let alive = true;
    api.calls
      .state(channelId)
      .catch(() => null)
      .finally(() => {
        if (!alive) return;
        // separate REST hop for the latest persisted snapshot
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? ""}/calls/${channelId}/annotations`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("nx_token") ?? ""}` } },
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((row: { payload?: { strokes?: Stroke[] } } | null) => {
            if (!alive) return;
            if (row?.payload?.strokes && Array.isArray(row.payload.strokes)) {
              setStrokes(row.payload.strokes);
            }
          })
          .catch(() => {});
      });
    return () => {
      alive = false;
    };
  }, [channelId]);

  // Subscribe to remote stroke deltas
  useDataChannel("annotations", (msg) => {
    try {
      const decoded = new TextDecoder().decode(msg.payload) as string;
      const parsed = JSON.parse(decoded) as AnnotationMessage;
      if (parsed.type === "stroke") {
        setStrokes((prev) => [...prev, parsed.stroke]);
      } else if (parsed.type === "clear") {
        setStrokes([]);
      }
    } catch {
      // ignore malformed messages
    }
  });

  const broadcast = useCallback(
    (msg: AnnotationMessage) => {
      try {
        const encoded = new TextEncoder().encode(JSON.stringify(msg));
        send(encoded, { reliable: true });
      } catch {
        // best-effort
      }
    },
    [send],
  );

  // Persist snapshot every 4s (debounced) when strokes change
  useEffect(() => {
    if (strokes.length === 0) return;
    const handle = window.setTimeout(() => {
      void fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? ""}/calls/${channelId}/annotations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("nx_token") ?? ""}`,
          },
          body: JSON.stringify({ payload: { strokes, version: 1 } }),
        },
      ).catch(() => {});
    }, 4000);
    return () => window.clearTimeout(handle);
  }, [strokes, channelId]);

  // Re-render canvas whenever strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = containerRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const draw = (s: Stroke) => {
      if (s.points.length === 0) return;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(s.points[0].x * rect.width, s.points[0].y * rect.height);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x * rect.width, s.points[i].y * rect.height);
      }
      ctx.stroke();
    };
    strokes.forEach(draw);
    if (drawingRef.current) draw(drawingRef.current);
  }, [strokes]);

  // Pointer handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!enabled) return;
      const wrap = containerRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      drawingRef.current = {
        id: `${localParticipant?.identity || "anon"}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        color,
        width,
        points: [
          {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height,
          },
        ],
      };
    },
    [enabled, color, width, localParticipant?.identity],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current || !enabled) return;
      const wrap = containerRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      drawingRef.current.points.push({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
      // trigger re-render
      setStrokes((prev) => [...prev]);
    },
    [enabled],
  );

  const handlePointerUp = useCallback(() => {
    if (!drawingRef.current || !enabled) return;
    const stroke = drawingRef.current;
    drawingRef.current = null;
    if (stroke.points.length < 2) return;
    setStrokes((prev) => [...prev, stroke]);
    broadcast({ type: "stroke", stroke });
  }, [enabled, broadcast]);

  const clearAll = useCallback(() => {
    setStrokes([]);
    broadcast({ type: "clear" });
  }, [broadcast]);

  return (
    <div ref={containerRef} className="annotationLayer">
      <canvas
        ref={canvasRef}
        className={`annotationCanvas ${enabled ? "active" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        aria-label="Annotation canvas"
      />
      <div className="annotationToolbar" role="toolbar" aria-label="Annotation tools">
        <button
          type="button"
          className={`btn ${enabled ? "primary" : ""}`}
          onClick={() => setEnabled((v) => !v)}
          aria-pressed={enabled}
          title={enabled ? "Disable drawing" : "Enable drawing"}
        >
          ✏️ {enabled ? "On" : "Draw"}
        </button>
        <div className="annotationColors" role="group" aria-label="Color">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className={`annotationSwatch ${c === color ? "selected" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <input
          type="range"
          min={1}
          max={12}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          aria-label="Stroke width"
        />
        <button type="button" className="btn ghost" onClick={clearAll} aria-label="Clear annotations">
          🧹 Clear
        </button>
      </div>
    </div>
  );
}
