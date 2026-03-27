"use client";


import React, { useEffect, useMemo, useRef, useState, Profiler, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { useAuth } from "@/state/auth";
import type { Room, Channel, Message as ApiMessage } from "@/lib/api";

// Locally extend Message to include roomId and channelId for state
type Message = ApiMessage & { roomId: string; channelId: string };

const MessageItem = React.memo(({ message, isMe }: { message: Message; isMe: boolean }) => (
  <div className={`msg ${isMe ? "me" : ""}`}>
    <div className="who">
      <span className="dot" aria-hidden="true" />
      <span>{message.who}</span>
      <span className="time">{message.time}</span>
    </div>
    <div className="text">{message.text}</div>
  </div>
));
MessageItem.displayName = "MessageItem";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.neonix.app";

/**
 * React profiler callback for measuring render performance.
 *
 * @param id component id
 * @param phase render phase (mount, update, nested-update)
 * @param actualDuration actual render duration in ms
 * @param baseDuration base render duration in ms
 * @param startTime start time of render
 * @param commitTime commit time of render
 */
function onRenderCallback(
  id: string,
  phase: "mount" | "update" | "nested-update",
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
) {
  // Log performance metrics for profiling
  if (phase === "mount" || phase === "update") {
    console.log(`[React] ${id} ${phase} ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms, start: ${startTime}, commit: ${commitTime})`);
  }
}

/**
 * Main chat page component with real-time messaging and performance profiling.
 * @returns JSX element for the chat page
 */
export default function ChatPage() {
  const { user } = useAuth();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string>("");

  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState<string>("");

  // Старий UX-стан: спочатку “Home”, чат відкривається після кліку по каналу
  const [channelsHidden, setChannelsHidden] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState<string>("");

  // typing
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingOffTimer = useRef<number | null>(null);

  // unread (мінімально: рахуємо на рівні channelId)
  const [unread, setUnread] = useState<Record<string, number>>({});

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const meName = useMemo(
    () => user?.displayName || user?.username || "User",
    [user]
  );

  const viewState = useMemo<"home" | "server" | "channel">(() => {
    if (!roomId) return "home";
    if (!channelId) return "server";
    return "channel";
  }, [roomId, channelId]);

  const room = useMemo(() => rooms.find((r) => r.id === roomId), [rooms, roomId]);

  const visibleMessages = useMemo(() => {
    if (!roomId || !channelId) return [];
    return messages.filter((m) => m.roomId === roomId && m.channelId === channelId);
  }, [messages, roomId, channelId]);

  // ---------- DATA: rooms ----------
  useEffect(() => {
    let alive = true;

    api.chat
      .rooms()
      .then((data) => {
        if (!alive) return;
        setRooms(data || []);
        if (!roomId && data?.[0]?.id) setRoomId(data[0].id);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- DATA: channels ----------
  useEffect(() => {
    if (!roomId) return;

    let alive = true;

    api.chat
      .channels(roomId)
      .then((data) => {
        if (!alive) return;
        setChannels(data || []);
        // Підсвітка першого каналу (але viewState все одно "home" до кліку)
        if (!channelId && data?.[0]?.id) setChannelId(data[0].id);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // якщо змінився сервер — скидаємо канал і повертаємось у server view
  useEffect(() => {
    setChannelId("");
    setChannelsHidden(false);
    // (не обов'язково) можна також чистити typing/unread під канали:
    setTypingUsers([]);
  }, [roomId]);
  
  // ---------- DATA: messages ----------
  useEffect(() => {
    if (!roomId || !channelId) return;

    let alive = true;

    api.chat
      .messages(roomId, channelId)
      .then((data) => {
        if (!alive) return;
        // Додаємо roomId і channelId у кожне повідомлення
        const withIds = (data || []).map((msg) => ({ ...msg, roomId, channelId }));
        setMessages(withIds);
        // коли відкрили канал — скидаємо unread
        setUnread((prev) => ({ ...prev, [channelId]: 0 }));
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [roomId, channelId, channelsHidden]);

  // ---------- WS connect once ----------
  useEffect(() => {
    const s = io(WS_URL, { transports: ["websocket", "polling"], withCredentials: true, });
    socketRef.current = s;

    s.on("connect", () => {
      // join буде в ефекті нижче
    });

    s.on("message", (msg: Message) => {
      // Додаємо roomId і channelId з контексту, якщо їх немає
      const msgWithIds = { ...msg, roomId, channelId };
      setMessages((prev) => {
        if (prev.some((p) => p.id === msgWithIds.id)) return prev;
        return [...prev, msgWithIds];
      });

      // unread, якщо повідомлення не в активному каналі або чат “закритий”
      const isCurrent =
        msgWithIds.roomId === roomId &&
        msgWithIds.channelId === channelId &&
        !channelsHidden;

      if (!isCurrent) {
        setUnread((prev) => ({
          ...prev,
          [msgWithIds.channelId]: (prev[msgWithIds.channelId] || 0) + 1,
        }));
      }
    });

    s.on("typing", (payload: { who: string; typing: boolean }) => {
      const who = payload?.who?.trim();
      if (!who || who === meName) return;

      setTypingUsers((prev) => {
        const has = prev.includes(who);
        if (payload.typing && !has) return [...prev, who];
        if (!payload.typing && has) return prev.filter((x) => x !== who);
        return prev;
      });
    });

    // room-level (необов’язково, але корисно)
    s.on("roomMessage", (payload: { roomId: string; channelId: string }) => {
      // якщо ти захочеш робити unread “на сервері”, тут можна апдейтити
      // зараз ми вже рахуємо unread по "message"
      void payload;
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- WS re-join on selection ----------
  useEffect(() => {
    const s = socketRef.current;
    if (!s || !roomId) return;

    // Коли чат відкритий (channel view) — підписуємось на конкретний канал.
    // Інакше — тільки на room (для unread/roomMessage).
    const joinPayload =
      !channelsHidden && channelId
        ? { roomId, channelId }
        : { roomId };

    s.emit("join", joinPayload);
  }, [roomId, channelId, channelsHidden]);

  // ---------- scroll ----------
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visibleMessages.length, channelId, viewState]);

  function selectRoom(id: string) {
    setRoomId(id);
    setChannelsHidden(false);
    setChannelId("");
    setTypingUsers([]);
  }

  function openChannel(id: string) {
    setChannelsHidden(false);
    setChannelId(id);
    setTypingUsers([]);
    setUnread((prev) => ({ ...prev, [id]: 0 }));
  }

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text || !roomId || !channelId) return;
    if (channelsHidden) return;

    const payload = {
      roomId,
      channelId,
      who: meName,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const s = socketRef.current;
    if (s?.connected) {
      s.emit("message", payload, () => {});
    } else {
      api.chat.send(roomId, channelId, payload).catch(() => {});
    }

    // зупиняємо typing
    if (s?.connected) s.emit("typing", { roomId, channelId, who: meName, typing: false });

    setDraft("");
  }, [draft, roomId, channelId, channelsHidden, meName]);

  const onDraftKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  }, [send]);

  const onDraftChange = useCallback((v: string) => {
    setDraft(v);

    const s = socketRef.current;
    if (!s?.connected) return;
    if (!roomId || !channelId) return;
    if (channelsHidden) return;

    // typing true
    s.emit("typing", { roomId, channelId, who: meName, typing: true });

    // typing false after idle
    if (typingOffTimer.current) window.clearTimeout(typingOffTimer.current);
    typingOffTimer.current = window.setTimeout(() => {
      s.emit("typing", { roomId, channelId, who: meName, typing: false });
    }, 900);
  }, [roomId, channelId, channelsHidden, meName]);

  const typingLine = useMemo(() => {
    if (viewState !== "channel") return "";
    if (typingUsers.length === 0) return "";
    if (typingUsers.length === 1) return `${typingUsers[0]} typing…`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} typing…`;
    return `${typingUsers[0]} and ${typingUsers.length - 1} others typing…`;
  }, [typingUsers, viewState]);

  return (
    <section className="page chatPage" aria-label="Chat">
      <div className={"shell " + `state-${viewState} ` + (channelsHidden ? "channels-hidden" : "")}>
        {/* LEFT: Servers */}
        <aside className="panel serversBar" aria-label="Servers">
          <div className="phd">
            <b>Servers</b>
            <button type="button" className="btn" aria-label="Create or join server" title="Create / Join">
              ＋
            </button>
          </div>

          {/* Wide list (Home + when channels hidden) */}
          <div className="serversWideList" role="list">
            {rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`srvRow ${r.id === roomId ? "active" : ""}`}
                aria-label={`Select server ${r.name}`}
                onClick={() => selectRoom(r.id)}
              >
                <div className="srvAvatar" aria-hidden="true">
                  {r.badge}
                </div>
                <div className="srvText">
                  <b>{r.name}</b>
                  <span>{r.meta}</span>
                </div>
              </button>
            ))}

            <button type="button" className="srvRow" aria-label="Create or join" style={{ borderStyle: "dashed" }}>
              <div className="srvAvatar" aria-hidden="true">
                ＋
              </div>
              <div className="srvText">
                <b>Create / Join</b>
                <span>prototype</span>
              </div>
            </button>
          </div>

          {/* Icons list (Server/Channel states) */}
          <div className="serversIconsList" role="list">
            {rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`srvBtn ${r.id === roomId ? "active" : ""}`}
                aria-label={`Select server ${r.name}`}
                onClick={() => selectRoom(r.id)}
              >
                <span className="srvBadge" aria-hidden="true">
                  {r.badge}
                </span>
                <span className="pill srvTip">{r.name}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* MIDDLE: Channels */}
        {viewState !== "home" && !channelsHidden && (
          <aside className="panel channelsBar" aria-label="Channels">
            <div className="channelsHead">
              <div className="channelsIcon" aria-hidden="true">
                {room?.badge || "#"}
              </div>
              <div className="channelsName">
                <b>{room?.name || "Server"}</b>
                <span>{room?.meta || ""}</span>
              </div>

              <button
                type="button"
                className="btn ghost channelsToggle"
                onClick={() => setChannelsHidden(true)}
                aria-label="Hide channels"
                title="Hide channels"
              >
                Hide
              </button>
            </div>

            <div className="channelsList" role="list">
              {channels.map((c) => {
                const u = unread[c.id] || 0;

                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`chItem ${c.id === channelId ? "active" : ""}`}
                    aria-label={`Open channel ${c.name}`}
                    onClick={() => openChannel(c.id)}
                  >
                    <div className="chIcon" aria-hidden="true">
                      #
                    </div>
                    <div className="chLabel" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span>{c.name}</span>
                      {u > 0 && <span className="pill">{u}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* MAIN */}
        <main className="panel" aria-label="Chat panel">
          <div className="chatHeader">
            <div>
              <h2 className="chatTitle">
                {viewState === "home"
                  ? "Home"
                  : viewState === "server"
                    ? room?.name || "Server"
                    : `#${channels.find((x) => x.id === channelId)?.name || channelId}`}
              </h2>

              <p className="chatSub">
                {viewState === "home"
                  ? "Pick a chat to start"
                  : viewState === "server"
                    ? "Select a channel to open a chat"
                    : typingLine || "Realtime via WebSocket"}
              </p>

              {viewState === "server" && (
                <div className="chatMetaRow">
                  <button type="button" className="btn" onClick={() => setChannelsHidden(false)} aria-label="Show channels">
                    Show channels
                  </button>
                </div>
              )}
            </div>

            <div className="chatMetaRow" aria-label="Chat actions">
              <button type="button" className="btn" aria-label="Voice" title="Voice">
                🎧
              </button>
              <button type="button" className="btn" aria-label="Video" title="Video">
                🎥
              </button>
              <button type="button" className="btn" aria-label="Share" title="Share">
                🖥️
              </button>
              <button type="button" className="btn" aria-label="Annotate" title="Annotate">
                ✏️
              </button>
            </div>
          </div>

          {viewState !== "channel" ? (
            <div className="chatPlaceholder">
              <div className="box">
                <h3 style={{ margin: 0 }}>Select a channel</h3>
                <p style={{ margin: "10px 0 0" }}>Use the channel list to open a chat.</p>
              </div>
            </div>
          ) : (
            <>
              <Profiler id="chatArea" onRender={onRenderCallback}>
                <div className="chatArea" ref={scrollerRef} aria-label="Messages">
                  {visibleMessages.length === 0 ? (
                    <div className="muted">No messages yet. Say hi 👋</div>
                  ) : (
                    visibleMessages.map((m) => (
                    <MessageItem key={m.id} message={m} isMe={m.who === meName} />
                    ))
                  )}
                </div>
              </Profiler>

              <div className="composer" aria-label="Message composer">
                <input
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  onKeyDown={onDraftKeyDown}
                  placeholder={`Message #${channels.find((x) => x.id === channelId)?.name || channelId}`}
                  aria-label="Message input"
                />
                <button type="button" className="btn primary" onClick={send} aria-label="Send">
                  Send
                </button>
              </div>
            </>
          )}
        </main>

        {/* RIGHT */}
        <aside className="panel rightCol" aria-label="Right sidebar">
          <div className="phd">
            <b>Friends</b>
            <span className="pill">
              <span className="dotMini" aria-hidden="true" />
              Online
            </span>
          </div>

          <div className="pbd">
            <div className="list">
              <div className="item">
                <b>Roma</b>
                <div className="meta">Online • shooter mode</div>
              </div>
              <div className="item">
                <b>Study group</b>
                <div className="meta">3 online</div>
              </div>
              <div className="item">
                <b>New friend</b>
                <div className="meta">Invite link</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
