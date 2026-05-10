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
import {
  AudioPresets,
  Track,
  VideoPresets,
  type RoomOptions,
} from "livekit-client";
import "@livekit/components-styles";
import { api, type Channel, type Room } from "@/lib/api";
import { useAuth } from "@/state/auth";
import { useCalls } from "@/state/calls";
import {
  useUiPrefs,
  type AudioQuality,
  type CameraQuality,
  type Fps,
  type ScreenQuality,
} from "@/state/uiPrefs";
import { CallChatOverlay } from "./CallChatOverlay";
import { ScreenShareViewer } from "./ScreenShareViewer";
import { CallSidePanel } from "./CallSidePanel";

const LIVEKIT_FALLBACK_URL =
  process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

/**
 * Map a {@link CameraQuality} preset to the LiveKit `VideoPreset` it
 * corresponds to. We mutate the resolution.frameRate after picking so the
 * user's selected fps is applied even though presets ship a default.
 *
 * @param quality picked camera quality
 * @returns the underlying LiveKit preset object
 */
function cameraPreset(quality: CameraQuality) {
  switch (quality) {
    case "360p": return VideoPresets.h360;
    case "540p": return VideoPresets.h540;
    case "1080p": return VideoPresets.h1080;
    case "720p":
    default: return VideoPresets.h720;
  }
}

/**
 * Pick the simulcast ladder for the chosen top-quality. We always include
 * a tiny layer for participants on really poor networks; the middle layers
 * scale with the top.
 *
 * @param quality picked camera quality
 * @returns array of LiveKit VideoPresets to use as simulcast layers
 */
function cameraSimulcast(quality: CameraQuality) {
  switch (quality) {
    case "360p": return [];
    case "540p": return [VideoPresets.h216];
    case "720p": return [VideoPresets.h540, VideoPresets.h216];
    case "1080p": return [VideoPresets.h720, VideoPresets.h360];
  }
}

/**
 * Convert a screen-quality choice + fps into a `screenShareEncoding`
 * descriptor with a sensible bitrate cap. Higher fps and resolution both
 * scale the cap.
 *
 * @param quality screen-share resolution
 * @param fps target frame rate
 * @returns LiveKit screen-share encoding
 */
function screenEncoding(quality: ScreenQuality, fps: Fps) {
  // Base bitrate per resolution at 30fps (in bps).
  const base = quality === "720p" ? 1_500_000 : quality === "1080p" ? 3_000_000 : 5_000_000;
  // Scale roughly linearly with fps relative to 30.
  const scaled = Math.round(base * (fps / 30));
  return { maxBitrate: scaled, maxFramerate: fps };
}

function audioPreset(quality: AudioQuality) {
  switch (quality) {
    case "speech": return AudioPresets.telephone;
    case "studio": return AudioPresets.musicHighQualityStereo;
    case "music":
    default: return AudioPresets.musicHighQuality;
  }
}

/**
 * Build a {@link RoomOptions} object from the current user's media
 * preferences. Recomputed on prefs change so the next room you join uses
 * the latest values.
 *
 * @param prefs media-quality choices
 * @returns ready-to-pass RoomOptions
 */
function buildRoomOptions(prefs: {
  cameraQuality: CameraQuality;
  cameraFps: Fps;
  screenQuality: ScreenQuality;
  screenFps: Fps;
  audioQuality: AudioQuality;
}): RoomOptions {
  const camPreset = cameraPreset(prefs.cameraQuality);
  // Override the preset's frameRate with the user's choice.
  const captureRes = { ...camPreset.resolution, frameRate: prefs.cameraFps };
  const isSpeech = prefs.audioQuality === "speech";
  return {
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: captureRes,
    },
    audioCaptureDefaults: {
      autoGainControl: true,
      echoCancellation: true,
      // Speech preset benefits most from aggressive noise suppression.
      noiseSuppression: isSpeech ? true : true,
    },
    publishDefaults: {
      videoCodec: "vp9",
      videoSimulcastLayers: cameraSimulcast(prefs.cameraQuality),
      screenShareEncoding: screenEncoding(prefs.screenQuality, prefs.screenFps),
      audioPreset: audioPreset(prefs.audioQuality),
      // DTX (silence) only makes sense with low-bitrate speech mode; in
      // music mode it can clip transients.
      dtx: isSpeech,
      red: true,
    },
  };
}

interface CallShellProps {
  channel: Channel;
  /** Room context — used to derive owner-only annotation permissions. */
  room?: Room | null;
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
export function CallShell({ channel, room, onClose }: CallShellProps) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>(LIVEKIT_FALLBACK_URL);
  const [error, setError] = useState<string | null>(null);

  // Build LiveKit RoomOptions from the user's persisted media-quality
  // preferences. Recomputed when any pref changes (next call you join
  // will use the new values; the current call snapshots them at connect).
  const { cameraQuality, cameraFps, screenQuality, screenFps, audioQuality } = useUiPrefs();
  const roomOptions = useMemo(
    () => buildRoomOptions({ cameraQuality, cameraFps, screenQuality, screenFps, audioQuality }),
    [cameraQuality, cameraFps, screenQuality, screenFps, audioQuality],
  );

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
        options={roomOptions}
        connect
        audio
        video={isVideo}
        onDisconnected={onClose}
        data-lk-theme="default"
      >
        <CallShellInner channel={channel} room={room ?? null} onLeave={onClose} />
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
function CallShellInner({
  channel,
  room,
  onLeave,
}: {
  channel: Channel;
  room?: Room | null;
  onLeave: () => void;
}) {
  const { user } = useAuth();
  const canClearAll = Boolean(
    user?.id && room?.ownerId && user.id === room.ownerId,
  );

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
            <ScreenShareViewer track={screenTracks[0]} cameraTracks={cameraTracks} channelId={channel.id} canClearAll={canClearAll} />
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
  return (
    <CallShell
      channel={activeCall.channel}
      room={activeCall.room ?? null}
      onClose={endCall}
    />
  );
}
