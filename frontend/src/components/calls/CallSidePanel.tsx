"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  useLocalParticipant,
  useParticipants,
} from "@livekit/components-react";
import { useAuth } from "@/state/auth";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

interface CallSidePanelProps {
  channelId: string;
}

type Reaction = { id: number; emoji: string; userId: string; at: number };

const REACTION_EMOJIS = ["👏", "❤️", "😂", "🎉", "🤔", "👍"];

/**
 * Right-side panel inside an active call: participant list with raise-hand state,
 * reaction launcher, and presenter-control affordances. Connects to the
 * `/calls` Socket.IO namespace for backend-validated coordination events.
 *
 * @param props channel id
 * @returns side panel element
 */
export function CallSidePanel({ channelId }: CallSidePanelProps) {
  const { token, user } = useAuth();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const socketRef = useRef<Socket | null>(null);

  const [presenter, setPresenter] = useState<string | null>(null);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const reactionId = useRef(0);

  useEffect(() => {
    if (!token) return;
    const s = io(`${WS_URL}/calls`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token },
    });
    socketRef.current = s;

    s.on("connect", () => {
      s.emit("presence:join", { channelId });
    });
    s.on(
      "presence:update",
      (payload: { presenterUserId: string | null; raisedHands: string[] }) => {
        setPresenter(payload.presenterUserId);
        setRaisedHands(new Set(payload.raisedHands));
      },
    );
    s.on("hand:changed", (payload: { userId: string; raised: boolean }) => {
      setRaisedHands((prev) => {
        const next = new Set(prev);
        if (payload.raised) next.add(payload.userId);
        else next.delete(payload.userId);
        return next;
      });
    });
    s.on(
      "presenter:changed",
      (payload: { presenterUserId: string | null }) => {
        setPresenter(payload.presenterUserId);
      },
    );
    s.on("reaction:received", (payload: { userId: string; emoji: string; at: number }) => {
      reactionId.current += 1;
      const id = reactionId.current;
      setReactions((prev) => [...prev, { id, ...payload }]);
      window.setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2200);
    });

    return () => {
      s.emit("presence:leave", { channelId });
      s.disconnect();
      socketRef.current = null;
    };
  }, [channelId, token]);

  const myId = user?.id ?? localParticipant?.identity ?? null;
  const myHandRaised = myId ? raisedHands.has(myId) : false;
  const isPresenter = presenter !== null && presenter === myId;
  const noPresenterYet = presenter === null;

  function toggleHand() {
    const s = socketRef.current;
    if (!s || !myId) return;
    s.emit(myHandRaised ? "hand:lower" : "hand:raise", { channelId });
  }

  function emitReaction(emoji: string) {
    const s = socketRef.current;
    if (!s) return;
    s.emit("reaction:emit", { channelId, emoji });
  }

  function grantPresenter(targetUserId: string) {
    const s = socketRef.current;
    if (!s) return;
    s.emit("presenter:grant", { channelId, targetUserId }, () => {});
  }

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const ah = raisedHands.has(a.identity) ? -1 : 0;
      const bh = raisedHands.has(b.identity) ? -1 : 0;
      return ah - bh;
    });
  }, [participants, raisedHands]);

  return (
    <aside className="callSide" aria-label="Call participants">
      <div className="callSide__head">
        <b>Participants ({participants.length})</b>
        {presenter && (
          <span className="pill">Presenter set</span>
        )}
      </div>

      <div className="callSide__list" role="list">
        {sortedParticipants.map((p) => {
          const isMe = p.identity === myId;
          const handsUp = raisedHands.has(p.identity);
          const isThePresenter = presenter === p.identity;
          return (
            <div className={`callSide__row ${isMe ? "me" : ""}`} key={p.identity} role="listitem">
              <div className="callSide__avatar">
                {(p.name || p.identity).slice(0, 2).toUpperCase()}
              </div>
              <div className="callSide__info">
                <b>{p.name || p.identity}</b>
                <span className="muted">
                  {isThePresenter ? "Presenter" : isMe ? "You" : "Participant"}
                </span>
              </div>
              <div className="callSide__rowActions">
                {handsUp && <span className="pill" title="Hand raised">✋</span>}
                {isPresenter && handsUp && !isMe && (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => grantPresenter(p.identity)}
                    aria-label={`Pass control to ${p.name || p.identity}`}
                    title="Pass control"
                  >
                    Pass
                  </button>
                )}
                {noPresenterYet && isMe && (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => myId && grantPresenter(myId)}
                    aria-label="Claim presenter role"
                    title="Claim presenter"
                  >
                    Claim
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="callSide__actions">
        <button
          type="button"
          className={`btn ${myHandRaised ? "primary" : ""}`}
          onClick={toggleHand}
          aria-pressed={myHandRaised}
          aria-label={myHandRaised ? "Lower hand" : "Raise hand"}
        >
          ✋ {myHandRaised ? "Hand up" : "Raise hand"}
        </button>

        <div className="callSide__reactions" role="group" aria-label="Reactions">
          {REACTION_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="callSide__react"
              onClick={() => emitReaction(e)}
              aria-label={`React ${e}`}
              title={`React ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="callSide__bursts" aria-hidden="true">
        {reactions.map((r) => (
          <span key={r.id} className="callSide__burst">
            {r.emoji}
          </span>
        ))}
      </div>
    </aside>
  );
}
