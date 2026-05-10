"use client";


import React, { useEffect, useMemo, useRef, useState, Profiler, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { useAuth } from "@/state/auth";
import { useCalls } from "@/state/calls";
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
  // Dev-only: profiler should never spam production console.
  if (process.env.NODE_ENV === "production") return;
  if (phase === "mount" || phase === "update") {
    console.log(`[React] ${id} ${phase} ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms, start: ${startTime}, commit: ${commitTime})`);
  }
}

/**
 * Main chat page component with real-time messaging and performance profiling.
 * @returns JSX element for the chat page
 */
export default function ChatPage() {
  const { user, token, ready } = useAuth();
  const { activeCall, startCall, endCall } = useCalls();

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

  // mobile drawer state — controls which panel is overlaid on top on small screens
  const [mobileDrawer, setMobileDrawer] = useState<"servers" | "channels" | null>(null);

  // Create-server dialog state
  const [creatingServer, setCreatingServer] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerBadge, setNewServerBadge] = useState("");
  const [newServerMeta, setNewServerMeta] = useState("");
  const [createServerError, setCreateServerError] = useState<string | null>(null);
  const [createServerSubmitting, setCreateServerSubmitting] = useState(false);

  // Create-channel dialog state
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelKind, setNewChannelKind] = useState<"TEXT" | "VOICE" | "VIDEO">("TEXT");
  const [createChannelError, setCreateChannelError] = useState<string | null>(null);
  const [createChannelSubmitting, setCreateChannelSubmitting] = useState(false);

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

  // Refs that always reflect the latest selection — read by socket handlers
  // so they don't capture stale closures.
  const roomIdRef = useRef(roomId);
  const channelIdRef = useRef(channelId);
  const channelsHiddenRef = useRef(channelsHidden);
  const meNameRef = useRef(meName);
  useEffect(() => {
    roomIdRef.current = roomId;
    channelIdRef.current = channelId;
    channelsHiddenRef.current = channelsHidden;
    meNameRef.current = meName;
  }, [roomId, channelId, channelsHidden, meName]);

  // ---------- WS connect once (after auth is ready) ----------
  useEffect(() => {
    if (!ready || !token) return;

    const s = io(WS_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token },
    });
    socketRef.current = s;

    s.on("message", (msg: Message) => {
      // Read live values from refs — closure captured at connect-time would
      // otherwise stick to the original room/channel.
      const liveRoomId = roomIdRef.current;
      const liveChannelId = channelIdRef.current;
      const liveChannelsHidden = channelsHiddenRef.current;

      const msgWithIds = { ...msg, roomId: liveRoomId, channelId: liveChannelId };
      setMessages((prev) => {
        if (prev.some((p) => p.id === msgWithIds.id)) return prev;
        return [...prev, msgWithIds];
      });

      const isCurrent =
        msgWithIds.roomId === liveRoomId &&
        msgWithIds.channelId === liveChannelId &&
        !liveChannelsHidden;

      if (!isCurrent) {
        setUnread((prev) => ({
          ...prev,
          [msgWithIds.channelId]: (prev[msgWithIds.channelId] || 0) + 1,
        }));
      }
    });

    s.on("typing", (payload: { who: string; typing: boolean }) => {
      const who = payload?.who?.trim();
      if (!who || who === meNameRef.current) return;

      setTypingUsers((prev) => {
        const has = prev.includes(who);
        if (payload.typing && !has) return [...prev, who];
        if (!payload.typing && has) return prev.filter((x) => x !== who);
        return prev;
      });
    });

    s.on("roomMessage", (payload: { roomId: string; channelId: string }) => {
      void payload;
    });

    s.on("disconnect", () => {
      // Soft-reset transient UI state; reconnect will be handled by the engine.
      setTypingUsers([]);
    });

    // Tear down when token changes (logout/login) or component unmounts.
    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [ready, token]);

  // Listen for app-level signOut to drop the socket immediately
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onSignedOut = () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
    window.addEventListener("nx:signedOut", onSignedOut);
    return () => window.removeEventListener("nx:signedOut", onSignedOut);
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
    // After picking a server on mobile, swap drawer to channel list
    setMobileDrawer((d) => (d === "servers" ? "channels" : d));
  }

  function openCreateServer() {
    setNewServerName("");
    setNewServerBadge("");
    setNewServerMeta("");
    setCreateServerError(null);
    setCreatingServer(true);
  }

  async function submitCreateServer(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const name = newServerName.trim();
    if (name.length < 2) {
      setCreateServerError("Name must be at least 2 characters");
      return;
    }
    setCreateServerSubmitting(true);
    setCreateServerError(null);
    try {
      const created = await api.chat.createRoom({
        name,
        meta: newServerMeta.trim() || undefined,
        badge: newServerBadge.trim() || undefined,
      });
      // refresh rooms list and auto-select the new server
      const fresh = await api.chat.rooms();
      setRooms(fresh || []);
      setRoomId(created.id);
      setChannelId("");
      setChannelsHidden(false);
      setCreatingServer(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create server";
      setCreateServerError(message);
    } finally {
      setCreateServerSubmitting(false);
    }
  }

  function openCreateChannel() {
    setNewChannelName("");
    setNewChannelKind("TEXT");
    setCreateChannelError(null);
    setCreatingChannel(true);
  }

  async function submitCreateChannel(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const name = newChannelName.trim();
    if (name.length < 1) {
      setCreateChannelError("Name is required");
      return;
    }
    if (!roomId) {
      setCreateChannelError("Pick a server first");
      return;
    }
    setCreateChannelSubmitting(true);
    setCreateChannelError(null);
    try {
      const created = await api.chat.createChannel(roomId, {
        name,
        kind: newChannelKind,
      });
      // refresh channels list, then select the newly created one
      const fresh = await api.chat.channels(roomId);
      setChannels(fresh || []);
      setChannelsHidden(false);
      setChannelId(created.id);
      setCreatingChannel(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create channel";
      setCreateChannelError(message);
    } finally {
      setCreateChannelSubmitting(false);
    }
  }

  function openChannel(id: string) {
    setChannelsHidden(false);
    setChannelId(id);
    setTypingUsers([]);
    setUnread((prev) => ({ ...prev, [id]: 0 }));
    // Close mobile drawer once user has picked a channel
    setMobileDrawer(null);
  }

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text || !roomId || !channelId) return;
    if (channelsHidden) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const payload = {
      roomId,
      channelId,
      text,
      time,
    };

    const s = socketRef.current;
    if (s?.connected) {
      s.emit("message", payload, () => {});
    } else {
      api.chat.send(roomId, channelId, { text, time }).catch(() => {});
    }

    // зупиняємо typing (server resolves the user)
    if (s?.connected) s.emit("typing", { roomId, channelId, typing: false });

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

    // typing true (server fills in `who` from the authenticated socket)
    s.emit("typing", { roomId, channelId, typing: true });

    // typing false after idle
    if (typingOffTimer.current) window.clearTimeout(typingOffTimer.current);
    typingOffTimer.current = window.setTimeout(() => {
      s.emit("typing", { roomId, channelId, typing: false });
    }, 900);
  }, [roomId, channelId, channelsHidden]);

  const typingLine = useMemo(() => {
    if (viewState !== "channel") return "";
    if (typingUsers.length === 0) return "";
    if (typingUsers.length === 1) return `${typingUsers[0]} typing…`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} typing…`;
    return `${typingUsers[0]} and ${typingUsers.length - 1} others typing…`;
  }, [typingUsers, viewState]);

  return (
    <section className="page chatPage" aria-label="Chat">
      {mobileDrawer && (
        <div
          className="shell-backdrop"
          aria-hidden="true"
          onClick={() => setMobileDrawer(null)}
          style={{ position: "fixed", inset: 0, zIndex: 58 }}
        />
      )}
      <div
        className={"shell " + `state-${viewState} ` + (channelsHidden ? "channels-hidden" : "")}
        data-mobile-drawer={mobileDrawer ?? undefined}
      >
        {/* LEFT: Servers */}
        <aside className="panel serversBar" aria-label="Servers">
          <div className="phd">
            <b>Servers</b>
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

            <button
              type="button"
              className="srvRow srvRow--create"
              aria-label="Create a new server"
              onClick={openCreateServer}
            >
              <div className="srvAvatar" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div className="srvText">
                <b>Create server</b>
                <span>new room + #general</span>
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
            <button
              type="button"
              className="srvBtn srvBtn--create"
              aria-label="Create a new server"
              onClick={openCreateServer}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="pill srvTip">Create server</span>
            </button>
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
                const kind = c.kind || "TEXT";
                const kindLabel =
                  kind === "VOICE" ? "🎧" : kind === "VIDEO" ? "🎥" : "#";
                const inActiveCall = activeCall?.channel.id === c.id;

                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`chItem kind-${kind} ${c.id === channelId ? "active" : ""} ${inActiveCall ? "in-call" : ""}`}
                    aria-label={`Open channel ${c.name}`}
                    onClick={() => openChannel(c.id)}
                  >
                    <div className="chKindIcon chIcon" aria-hidden="true">
                      {kindLabel}
                    </div>
                    <div className="chLabel" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span>{c.name}</span>
                      {u > 0 && <span className="pill">{u}</span>}
                    </div>
                    {kind !== "TEXT" && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="chJoin"
                        aria-label={inActiveCall ? `Leave ${c.name}` : `Join ${c.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (inActiveCall) endCall();
                          else startCall(c);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            if (inActiveCall) endCall();
                            else startCall(c);
                          }
                        }}
                      >
                        {inActiveCall ? "Leave" : "Join"}
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                className="chItem chItem--create"
                aria-label="Create a new channel"
                onClick={openCreateChannel}
              >
                <div className="chKindIcon chIcon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <div className="chLabel">
                  <span>Create channel</span>
                </div>
              </button>
            </div>
          </aside>
        )}

        {/* MAIN */}
        <main className="panel" aria-label="Chat panel">
          <div className="chatHeader">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 auto", minWidth: 0 }}>
              <button
                type="button"
                className="chat-mobile-toggle"
                aria-label="Open servers"
                title="Servers"
                onClick={() => setMobileDrawer((d) => (d === "servers" ? null : "servers"))}
              >
                ☰
              </button>
              {viewState !== "home" && (
                <button
                  type="button"
                  className="chat-mobile-toggle"
                  aria-label="Open channels"
                  title="Channels"
                  onClick={() => setMobileDrawer((d) => (d === "channels" ? null : "channels"))}
                >
                  #
                </button>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
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
            </div>

            <div className="chatMetaRow" aria-label="Chat actions">
              <button type="button" className="btn iconBtn" aria-label="Voice" title="Voice">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1v-7h3z" />
                  <path d="M3 19a2 2 0 0 0 2 2h1v-7H3z" />
                </svg>
              </button>
              <button type="button" className="btn iconBtn" aria-label="Video" title="Video">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                </svg>
              </button>
              <button type="button" className="btn iconBtn" aria-label="Share" title="Share screen">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                  <path d="m9 11 3-3 3 3" />
                  <path d="M12 8v6" />
                </svg>
              </button>
              <button type="button" className="btn iconBtn" aria-label="Annotate" title="Annotate">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                  <path d="m15 5 4 4" />
                </svg>
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

      {creatingChannel && (
        <div
          className="modalBackdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Create a new channel"
          onClick={(e) => {
            if (e.target === e.currentTarget && !createChannelSubmitting) {
              setCreatingChannel(false);
            }
          }}
        >
          <form className="modalCard" onSubmit={submitCreateChannel}>
            <div className="modalHead">
              <h3 className="title">Create channel</h3>
              <p className="subtitle">In <b>{room?.name || "this server"}</b>. Pick a kind and a name.</p>
            </div>
            <div className="modalBody">
              <div className="field">
                <label className="label">Channel type</label>
                <div className="kindPicker" role="radiogroup" aria-label="Channel kind">
                  {(["TEXT", "VOICE", "VIDEO"] as const).map((k) => (
                    <label
                      key={k}
                      className={`kindOption kind-${k} ${newChannelKind === k ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="kind"
                        value={k}
                        checked={newChannelKind === k}
                        onChange={() => setNewChannelKind(k)}
                        disabled={createChannelSubmitting}
                      />
                      <span className="kindOption__icon" aria-hidden="true">
                        {k === "VOICE" ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                            <path d="M21 19a2 2 0 0 1-2 2h-1v-7h3z" />
                            <path d="M3 19a2 2 0 0 0 2 2h1v-7H3z" />
                          </svg>
                        ) : k === "VIDEO" ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m22 8-6 4 6 4V8Z" />
                            <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                          </svg>
                        ) : (
                          <span style={{ fontWeight: 800, fontSize: 18 }}>#</span>
                        )}
                      </span>
                      <span className="kindOption__label">
                        {k === "TEXT" ? "Text" : k === "VOICE" ? "Voice" : "Video"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="cc-name">Name</label>
                <input
                  id="cc-name"
                  className="input"
                  autoFocus
                  maxLength={40}
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="general"
                  required
                  disabled={createChannelSubmitting}
                />
                <div className="hint">Spaces and capitalisation are converted to <code>kebab-case</code>.</div>
              </div>

              {createChannelError && (
                <p className="hint" role="alert" style={{ color: "#ff7676" }}>
                  {createChannelError}
                </p>
              )}
            </div>
            <div className="modalActions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setCreatingChannel(false)}
                disabled={createChannelSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={createChannelSubmitting}
              >
                {createChannelSubmitting ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {creatingServer && (
        <div
          className="modalBackdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Create a new server"
          onClick={(e) => {
            if (e.target === e.currentTarget && !createServerSubmitting) {
              setCreatingServer(false);
            }
          }}
        >
          <form className="modalCard" onSubmit={submitCreateServer}>
            <div className="modalHead">
              <h3 className="title">Create server</h3>
              <p className="subtitle">A room with a default <code>#general</code> channel.</p>
            </div>
            <div className="modalBody">
              <div className="field">
                <label className="label" htmlFor="cs-name">Name</label>
                <input
                  id="cs-name"
                  className="input"
                  autoFocus
                  maxLength={60}
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="Study Group"
                  required
                  disabled={createServerSubmitting}
                />
              </div>
              <div className="row2">
                <div className="field">
                  <label className="label" htmlFor="cs-badge">Badge (1-3 chars)</label>
                  <input
                    id="cs-badge"
                    className="input"
                    maxLength={3}
                    value={newServerBadge}
                    onChange={(e) => setNewServerBadge(e.target.value)}
                    placeholder="Auto"
                    disabled={createServerSubmitting}
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="cs-meta">Tagline</label>
                  <input
                    id="cs-meta"
                    className="input"
                    maxLength={80}
                    value={newServerMeta}
                    onChange={(e) => setNewServerMeta(e.target.value)}
                    placeholder="Whiteboard • host tools"
                    disabled={createServerSubmitting}
                  />
                </div>
              </div>
              {createServerError && (
                <p className="hint" role="alert" style={{ color: "#ff7676" }}>
                  {createServerError}
                </p>
              )}
            </div>
            <div className="modalActions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setCreatingServer(false)}
                disabled={createServerSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={createServerSubmitting}
              >
                {createServerSubmitting ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
