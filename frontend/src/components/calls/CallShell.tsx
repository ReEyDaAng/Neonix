"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { api, type Channel } from "@/lib/api";
import { useCalls } from "@/state/calls";
import { CallChatOverlay } from "./CallChatOverlay";
import { ScreenShareViewer } from "./ScreenShareViewer";
import { CallSidePanel } from "./CallSidePanel";

const LIVEKIT_FALLBACK_URL =
  process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

interface CallShellProps {
  channel: Channel;
  onClose: () => void;
}

/**
 * Top-level overlay for an active voice/video call. Owns the LiveKit room
 * lifecycle, hosts the screen-share viewer, the participant grid, and the
 * Discord-style side panel (chat overlay, participants, raise hand).
 *
 * @param props channel + close handler
 * @returns overlay element
 */
export function CallShell({ channel, onClose }: CallShellProps) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>(LIVEKIT_FALLBACK_URL);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchToken = () => {
      api.calls
        .token(channel.id)
        .then((res) => {
          if (!alive) return;
          setToken(res.token);
          setServerUrl(res.url || LIVEKIT_FALLBACK_URL);
          setError(null);

          // LiveKit tokens are minted with a 1h TTL. Refresh ~5 min before
          // expiry so calls longer than an hour don't disconnect.
          const expiresInMs = Math.max(
            (res.expiresAt - Math.floor(Date.now() / 1000)) * 1000,
            60_000,
          );
          const refreshIn = Math.max(expiresInMs - 5 * 60_000, 60_000);
          refreshTimer = setTimeout(fetchToken, refreshIn);
        })
        .catch((e: unknown) => {
          if (!alive) return;
          const message =
            e instanceof Error ? e.message : "Failed to fetch token";
          setError(message);
        });
    };

    fetchToken();

    return () => {
      alive = false;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [channel.id]);

  if (error) {
    return (
      <div className="callShell callShell--error" role="dialog" aria-label="Call error">
        <div className="callShell__errorCard">
          <h3>Could not start the call</h3>
          <p>{error}</p>
          <button type="button" className="btn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="callShell callShell--loading" role="status" aria-live="polite">
        <div className="callShell__loader">Connecting to {channel.name}…</div>
      </div>
    );
  }

  const isVideo = channel.kind !== "VOICE";

  return (
    <div className="callShell" role="dialog" aria-label={`Call: ${channel.name}`}>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio
        video={isVideo}
        onDisconnected={onClose}
        data-lk-theme="default"
      >
        <CallShellInner channel={channel} onLeave={onClose} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

/**
 * Inner component rendered inside the LiveKitRoom context — it can use hooks
 * that depend on the room (useTracks, useParticipants, etc.).
 *
 * @param props channel + leave handler
 * @returns body of the call overlay
 */
function CallShellInner({ channel, onLeave }: { channel: Channel; onLeave: () => void }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const screenTracks = useMemo(
    () => tracks.filter((t) => t.source === Track.Source.ScreenShare),
    [tracks],
  );
  const cameraTracks = useMemo(
    () => tracks.filter((t) => t.source === Track.Source.Camera),
    [tracks],
  );

  const hasScreenShare = screenTracks.length > 0;

  return (
    <div className={`callShell__layout ${hasScreenShare ? "with-screen" : ""}`}>
      <header className="callShell__header">
        <div className="callShell__title">
          <span className="callShell__badge" aria-hidden="true">
            {channel.kind === "VOICE" ? "🎧" : "🎥"}
          </span>
          <div>
            <b>{channel.name}</b>
            <span className="callShell__sub">
              {channel.kind === "VOICE" ? "Voice channel" : "Video channel"}
              {hasScreenShare ? " · Screen sharing" : ""}
            </span>
          </div>
        </div>
        <button type="button" className="btn" onClick={onLeave} aria-label="Leave call">
          Leave
        </button>
      </header>

      <div className="callShell__main">
        <div className="callShell__stage">
          {hasScreenShare ? (
            <ScreenShareViewer track={screenTracks[0]} cameraTracks={cameraTracks} channelId={channel.id} />
          ) : (
            <GridLayout tracks={cameraTracks}>
              <ParticipantTile />
            </GridLayout>
          )}
        </div>

        <CallSidePanel channelId={channel.id} />
      </div>

      <footer className="callShell__controls">
        <ControlBar
          variation="verbose"
          controls={{
            microphone: true,
            camera: channel.kind !== "VOICE",
            screenShare: true,
            chat: false,
            leave: true,
          }}
        />
      </footer>

      <CallChatOverlay channelId={channel.id} />
    </div>
  );
}

/**
 * Wraps a CallShell so the active call survives navigation between channels.
 *
 * @returns active call overlay or null
 */
export function ActiveCallOverlay() {
  const { activeCall, endCall } = useCalls();
  if (!activeCall) return null;
  return <CallShell channel={activeCall.channel} onClose={endCall} />;
}
