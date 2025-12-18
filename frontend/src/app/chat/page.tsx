"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../state/auth";
import { useRouter } from "next/navigation";

type Room = { id: string; name: string; meta: string; badge: string };
type Channel = { id: string; roomId: string; name: string };
type Message = { id: string; roomId: string; channelId: string; who: string; text: string; time: string; me?: boolean };

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) router.push("/auth");
  }, [user, router]);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string>(() => (typeof window !== "undefined" ? localStorage.getItem("nx_room") : null) || "room1");
  const [channelsHidden, setChannelsHidden] = useState<boolean>(() => (typeof window !== "undefined" ? localStorage.getItem("nx_channelsHidden") === "1" : false));
  const [channelEverClicked, setChannelEverClicked] = useState<boolean>(() => (typeof window !== "undefined" ? localStorage.getItem("nx_channelEver") === "1" : false));
  const [channelId, setChannelId] = useState<string>(() => (typeof window !== "undefined" ? localStorage.getItem("nx_channel") : null) || "general");

  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");

  const state = useMemo<"home" | "server" | "channel">(() => {
    if (!roomId || roomId === "roomAdd") return "home";
    if (channelEverClicked && channelId) return "channel";
    return "server";
  }, [roomId, channelEverClicked, channelId]);

  useEffect(() => {
    api.chat.rooms().then(setRooms).catch(() => setRooms([]));
  }, []);

  useEffect(() => {
    localStorage.setItem("nx_room", roomId);
    if (roomId !== "roomAdd") {
      setChannelsHidden(false);
      localStorage.setItem("nx_channelsHidden", "0");
      api.chat.channels(roomId).then(setChannels).catch(() => setChannels([]));
    }
  }, [roomId]);

  useEffect(() => {
    localStorage.setItem("nx_channelsHidden", channelsHidden ? "1" : "0");
  }, [channelsHidden]);

  useEffect(() => {
    localStorage.setItem("nx_channelEver", channelEverClicked ? "1" : "0");
    localStorage.setItem("nx_channel", channelId);

    if (state === "channel") {
      api.chat.messages(roomId, channelId).then(setMessages).catch(() => setMessages([]));
    }
  }, [roomId, channelId, channelEverClicked, state]);

  async function openChannel(id: string) {
    setChannelId(id);
    setChannelEverClicked(true);
  }

  async function send() {
    if (!draft.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const who = user?.displayName || "You";
    const msg = await api.chat.send(roomId, channelId, { who, text: draft.trim(), time });
    setMessages((prev) => [...prev, msg]);
    setDraft("");
  }

  const activeRoom = rooms.find((r) => r.id === roomId);

  return (
    <section className="page chatPage">
      <div className={`shell state-${state} ${channelsHidden ? "channels-hidden" : ""}`}>
        {/* Servers */}
        <aside className="panel serversBar">
          <div className="phd">
            <b>Servers</b>
            <button className="btn" style={{ padding: "8px 10px" }}>＋</button>
          </div>

          <div className="serversBody">
            <div className="serversWideList">
              {rooms.map((r) => (
                <div key={r.id} className={`srvRow ${r.id === roomId ? "active" : ""}`} onClick={() => setRoomId(r.id)}>
                  <div className="srvAvatar">{r.badge}</div>
                  <div className="srvText">
                    <b>{r.name}</b>
                    <span>{r.meta}</span>
                  </div>
                </div>
              ))}
              <div className="srvRow" onClick={() => setRoomId("roomAdd")}>
                <div className="srvAvatar">＋</div>
                <div className="srvText">
                  <b>Create / Join</b>
                  <span>Mock action</span>
                </div>
              </div>
            </div>

            <div className="serversIconsList">
              {rooms.map((r) => (
                <button key={r.id} type="button" className={`srvBtn ${r.id === roomId ? "active" : ""}`} onClick={() => setRoomId(r.id)}>
                  <span className="srvBadge">{r.badge}</span>
                  <span className="srvTip">{r.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Channels */}
        <aside className="panel channelsBar">
          <div className="channelsHead">
            <button className="btn ghost channelsToggle" onClick={() => setChannelsHidden((v) => !v)}>
              {channelsHidden ? "≫" : "≪"}
            </button>

            <div className="channelsIcon">
              <span className="srvBadge">{activeRoom?.badge ?? "NX"}</span>
            </div>

            <div className="channelsName">
              <b>{activeRoom?.name ?? "Neonix — Main"}</b>
              <span>{activeRoom?.meta ?? "General • announcements"}</span>
            </div>
          </div>

          <div className="channelsList">
            {channels.map((c) => (
              <div key={c.id} className={`chItem ${c.id === channelId ? "active" : ""}`} onClick={() => openChannel(c.id)}>
                <div className="chIcon">#</div>
                <div className="chLabel">{c.name}</div>
              </div>
            ))}
          </div>

          <div className="pbd" style={{ paddingTop: 0 }}>
            <p className="hint">Channels are shown as a fixed panel and can be hidden using the button.</p>
          </div>
        </aside>

        {/* Chat */}
        <section className="panel chatPanel">
          <div className="chatHeader">
            <div style={{ minWidth: 260 }}>
              <h3 className="chatTitle">{activeRoom?.name ?? "Neonix — Main"}</h3>
              <p className="chatSub">Voice/video, screen share and annotations are planned modules.</p>
              <div className="chatMetaRow">
                <span className="pill">#{channelId}</span>
                <span className="pill">Effective role: Member</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" style={{ padding: "8px 10px" }} title="Voice">🎧</button>
              <button className="btn" style={{ padding: "8px 10px" }} title="Video">🎥</button>
              <button className="btn" style={{ padding: "8px 10px" }} title="Screen share">🖥️</button>
              <button className="btn" style={{ padding: "8px 10px" }} title="Annotate">✏️</button>
            </div>
          </div>

          {state !== "channel" ? (
            <div className="chatPlaceholder">
              <div className="box">
                <b>Оберіть сервер і канал</b><br />
                Спочатку вибери сервер зліва — потім канал.
              </div>
            </div>
          ) : (
            <>
              <div className="chatArea">
                {messages.map((m) => (
                  <div key={m.id} className={`msg ${m.me ? "me" : ""}`}>
                    <div className="who">
                      <span className="dot" />
                      <span>{m.who}</span>
                      <span className="time">{m.time}</span>
                    </div>
                    <div className="text">{m.text}</div>
                  </div>
                ))}
              </div>

              <div className="composer">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" />
                <button className="btn primary" onClick={send}>Send</button>
              </div>
            </>
          )}
        </section>

        {/* Right column */}
        <aside className="panel rightCol">
          <div className="phd">
            <b>{state === "home" ? "Friends" : "Participants"}</b>
            <span className="pill">{state === "home" ? "Online/Offline" : "4 online"}</span>
          </div>
          <div className="pbd">
            <div className="list">
              <div className="item"><b>Roma</b><div className="meta">🟢 Online</div></div>
              <div className="item"><b>Annika</b><div className="meta">🟢 Online</div></div>
              <div className="item"><b>James</b><div className="meta">⚪ Offline</div></div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
