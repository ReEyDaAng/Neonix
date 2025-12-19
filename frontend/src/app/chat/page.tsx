"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Room = { id: string; name: string; meta: string; badge: string };
type Channel = { id: string; roomId: string; name: string };
type Message = {
  id: string;
  roomId: string;
  channelId: string;
  who: string;
  text: string;
  time: string;
  me?: boolean;
};

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState({ displayName: "User" }); // Mock user for demo

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string>("room1");
  const [channelsHidden, setChannelsHidden] = useState<boolean>(false);
  const [channelEverClicked, setChannelEverClicked] = useState<boolean>(false);
  const [channelId, setChannelId] = useState<string>("general");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setRooms([
      { id: "room1", name: "Neonix", meta: "prototype", badge: "N" },
      { id: "room2", name: "SumDU", meta: "study", badge: "S" },
      { id: "room3", name: "Friends", meta: "hangout", badge: "F" },
    ]);
  }, []);

  useEffect(() => {
    setChannels([
      { id: "general", roomId, name: "general" },
      { id: "support", roomId, name: "support" },
      { id: "design", roomId, name: "design" },
    ]);
  }, [roomId]);

  const viewState = useMemo<"home" | "server" | "channel">(() => {
    if (!channelEverClicked) return "home";
    if (channelsHidden) return "server";
    return "channel";
  }, [channelEverClicked, channelsHidden]);

  function openChannel(id: string) {
    setChannelEverClicked(true);
    setChannelsHidden(false);
    setChannelId(id);
  }

  function send() {
    const text = draft.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        roomId,
        channelId,
        who: user?.displayName || "Me",
        text,
        time: new Date().toLocaleTimeString(),
        me: true,
      },
    ]);
    setDraft("");
  }

  return (
    <section className="chatPage" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1d24', color: '#fff' }}>
      <div className="chatShell" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT: Servers */}
        <aside className="serversWide" aria-label="Servers" style={{ width: 280, background: '#13151a', borderRight: '1px solid #2a2d35' }}>
          <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="phd" style={{ padding: 16, borderBottom: '1px solid #2a2d35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>Servers</b>
              <button
                type="button"
                className="btn"
                style={{ padding: '8px 10px', background: '#3a3f4a', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}
                aria-label="Create or join server"
                title="Create / Join"
                onClick={() => setRoomId("roomAdd")}
              >
                ＋
              </button>
            </div>

            <div className="serversBody" style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              <div className="serversWideList" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`srvRow ${r.id === roomId ? "active" : ""}`}
                    aria-label={`Select server ${r.name}`}
                    onClick={() => setRoomId(r.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      background: r.id === roomId ? '#3a3f4a' : 'transparent',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%'
                    }}
                  >
                    <div className="srvAvatar" aria-hidden="true" style={{ width: 40, height: 40, borderRadius: '50%', background: '#5865f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {r.badge}
                    </div>
                    <div className="srvText" style={{ flex: 1 }}>
                      <b>{r.name}</b>
                      <div className="meta" style={{ fontSize: '0.85em', color: '#b0b3b8' }}>{r.meta}</div>
                    </div>
                  </button>
                ))}

                <button
                  type="button"
                  className="srvRow"
                  aria-label="Create or join"
                  onClick={() => setRoomId("roomAdd")}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: 'transparent',
                    border: '1px dashed #3a3f4a',
                    borderRadius: 8,
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  <div className="srvAvatar" aria-hidden="true" style={{ width: 40, height: 40, borderRadius: '50%', background: '#3a3f4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    ＋
                  </div>
                  <div className="srvText" style={{ flex: 1 }}>
                    <b>Create / Join</b>
                    <div className="meta" style={{ fontSize: '0.85em', color: '#b0b3b8' }}>prototype</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* MIDDLE: Channels */}
        <aside
          className={`channels ${channelsHidden ? "hidden" : ""}`}
          aria-label="Channels"
          style={{
            width: channelsHidden ? 0 : 240,
            background: '#1a1d24',
            borderRight: '1px solid #2a2d35',
            overflow: 'hidden',
            transition: 'width 0.2s'
          }}
        >
          <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="phd" style={{ padding: 16, borderBottom: '1px solid #2a2d35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>Channels</b>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setChannelsHidden(true)}
                aria-label="Hide channels"
                style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #3a3f4a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: '0.85em' }}
              >
                Hide
              </button>
            </div>

            <div className="channelsList" style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              {channels.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`chItem ${c.id === channelId ? "active" : ""}`}
                  aria-label={`Open channel ${c.name}`}
                  onClick={() => openChannel(c.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: c.id === channelId ? '#3a3f4a' : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    cursor: 'pointer',
                    width: '100%',
                    marginBottom: 4,
                    textAlign: 'left'
                  }}
                >
                  <div className="chIcon" aria-hidden="true" style={{ fontSize: '1.2em', color: '#b0b3b8' }}>
                    #
                  </div>
                  <div className="chLabel">{c.name}</div>
                </button>
              ))}
            </div>

            {channelsHidden && (
              <div className="channelsReveal" style={{ padding: 16 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setChannelsHidden(false)}
                  aria-label="Show channels"
                  style={{ padding: '8px 12px', background: '#3a3f4a', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', width: '100%' }}
                >
                  Show channels
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT: Main */}
        <main className="main" aria-label="Chat" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="phd" style={{ padding: 16, borderBottom: '1px solid #2a2d35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b>
                  {viewState === "home"
                    ? "Home"
                    : viewState === "server"
                    ? "Server"
                    : `#${channelId}`}
                </b>
                <div className="meta" style={{ fontSize: '0.85em', color: '#b0b3b8' }}>
                  {viewState === "home"
                    ? "Pick a chat to start"
                    : "Neonix prototype"}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '8px 10px', background: '#3a3f4a', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  title="Voice"
                  aria-label="Voice"
                >
                  🎧
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '8px 10px', background: '#3a3f4a', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  title="Video"
                  aria-label="Video"
                >
                  🎥
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '8px 10px', background: '#3a3f4a', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  title="Screen share"
                  aria-label="Screen share"
                >
                  🖥️
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '8px 10px', background: '#3a3f4a', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  title="Annotate"
                  aria-label="Annotate"
                >
                  ✏️
                </button>
              </div>
            </div>

            {viewState !== "channel" ? (
              <div className="empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                <div className="emptyTitle" style={{ fontSize: '1.5em', fontWeight: 'bold', marginBottom: 8 }}>Select a channel</div>
                <div className="emptyDesc" style={{ color: '#b0b3b8' }}>
                  Use the channel list to open a chat.
                </div>
              </div>
            ) : (
              <>
                <div 
                  className="messages" 
                  role="log" 
                  aria-label="Messages"
                  aria-live="polite"
                  style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  {messages.map((m) => (
                    <div key={m.id} className={`msg ${m.me ? "me" : ""}`} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 12, background: m.me ? '#2a3f5f' : '#2a2d35', borderRadius: 8 }}>
                      <div className="who" style={{ fontWeight: 'bold', fontSize: '0.9em' }}>{m.who}</div>
                      <div className="txt">{m.text}</div>
                      <div className="time" style={{ fontSize: '0.75em', color: '#b0b3b8' }}>{m.time}</div>
                    </div>
                  ))}
                </div>

                <div className="composer" style={{ padding: 16, borderTop: '1px solid #2a2d35', display: 'flex', gap: 8 }}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message…"
                    aria-label="Message"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") send();
                    }}
                    style={{ flex: 1, padding: '10px 14px', background: '#2a2d35', border: '1px solid #3a3f4a', borderRadius: 6, color: '#fff', outline: 'none' }}
                  />
                  <button
                    className="btn primary"
                    type="button"
                    onClick={send}
                    aria-label="Send message"
                    style={{ padding: '10px 20px', background: '#5865f2', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}