"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { api, type Message } from "@/lib/api";
import { useAuth } from "@/state/auth";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

interface CallChatOverlayProps {
  channelId: string;
}

/**
 * Translucent chat overlay shown on the right side of an active call. Reuses
 * the existing chat namespace so messages flow into the regular `#text` history
 * for late readers as well.
 *
 * @param props channel id
 * @returns overlay element
 */
export function CallChatOverlay({ channelId }: CallChatOverlayProps) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // We need the parent room id to subscribe; ask the API once.
  const [roomId, setRoomId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    api.chat
      .rooms()
      .then(async (rooms) => {
        for (const r of rooms) {
          const channels = await api.chat.channels(r.id);
          if (channels.some((c) => c.id === channelId)) {
            if (alive) setRoomId(r.id);
            return;
          }
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [channelId]);

  // Initial messages
  useEffect(() => {
    if (!roomId) return;
    let alive = true;
    api.chat
      .messages(roomId, channelId)
      .then((data) => {
        if (alive) setMessages(data || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [roomId, channelId]);

  // Live messages
  useEffect(() => {
    if (!roomId || !token) return;
    const s = io(WS_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token },
    });
    socketRef.current = s;

    s.on("connect", () => {
      s.emit("join", { roomId, channelId });
    });
    s.on("message", (msg: Message) => {
      setMessages((prev) => (prev.some((p) => p.id === msg.id) ? prev : [...prev, msg]));
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [roomId, channelId, token]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const meName = useMemo(() => user?.displayName || user?.username || "User", [user]);

  function send() {
    const text = draft.trim();
    if (!text || !roomId) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const s = socketRef.current;
    if (s?.connected) {
      s.emit("message", { roomId, channelId, text, time }, () => {});
    }
    setDraft("");
  }

  if (collapsed) {
    return (
      <button
        type="button"
        className="callChat callChat--collapsed"
        onClick={() => setCollapsed(false)}
        aria-label="Show chat"
        title="Show chat"
      >
        💬
      </button>
    );
  }

  return (
    <aside className="callChat" aria-label="Call chat">
      <div className="callChat__head">
        <b>Chat</b>
        <button
          type="button"
          className="btn ghost callChat__collapse"
          onClick={() => setCollapsed(true)}
          aria-label="Hide chat"
          title="Hide chat"
        >
          ➖
        </button>
      </div>
      <div className="callChat__list" ref={scrollerRef} aria-live="polite">
        {messages.length === 0 ? (
          <div className="muted">No messages yet.</div>
        ) : (
          messages.map((m) => (
            <div className={`callChat__msg ${m.who === meName ? "me" : ""}`} key={m.id}>
              <div className="callChat__who">
                {m.who} <span className="time">{m.time}</span>
              </div>
              <div className="callChat__text">{m.text}</div>
            </div>
          ))
        )}
      </div>
      <div className="callChat__composer">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Send message…"
          aria-label="Message"
        />
        <button type="button" className="btn primary" onClick={send} aria-label="Send">
          ↵
        </button>
      </div>
    </aside>
  );
}
