"use client";

import { useEffect, useRef } from "react";
import {
  ParticipantTile,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { AnnotationCanvas } from "./AnnotationCanvas";

interface ScreenShareViewerProps {
  track: TrackReferenceOrPlaceholder;
  cameraTracks: TrackReferenceOrPlaceholder[];
  channelId: string;
  /** True if the current viewer is the room owner (controls Clear-all). */
  canClearAll?: boolean;
}

/**
 * Full-bleed screen-share viewer. Lays a transparent annotation canvas on top
 * so the presenter (and allowed participants) can draw over the shared screen.
 *
 * @param props track refs + channel id
 * @returns layout element
 */
export function ScreenShareViewer({ track, cameraTracks, channelId, canClearAll = false }: ScreenShareViewerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Force the embedded video element to fill the container even when the
    // remote track changes track size mid-stream.
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const videos = wrapper.querySelectorAll("video");
    videos.forEach((v) => {
      v.style.width = "100%";
      v.style.height = "100%";
      v.style.objectFit = "contain";
    });
  }, [track.publication?.trackSid]);

  return (
    <div className="callShell__screenShareWrap" ref={wrapperRef}>
      <div className="callShell__screen">
        <ParticipantTile trackRef={track} disableSpeakingIndicator />
        <AnnotationCanvas channelId={channelId} canClearAll={canClearAll} />
      </div>

      <aside className="callShell__filmstrip" aria-label="Participants">
        {cameraTracks.map((t) => (
          <div className="callShell__filmTile" key={t.publication?.trackSid ?? t.participant.identity}>
            <ParticipantTile trackRef={t} />
          </div>
        ))}
      </aside>
    </div>
  );
}
