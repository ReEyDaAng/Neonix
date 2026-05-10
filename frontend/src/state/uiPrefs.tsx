"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "dark" | "midnight" | "light";
export type Accent = "cyan" | "violet" | "lime";
export type Lang = "auto" | "uk" | "en";

/** Available camera capture profiles (resolution height in pixels). */
export type CameraQuality = "360p" | "540p" | "720p" | "1080p";
/** Available screen-share resolution profiles. */
export type ScreenQuality = "720p" | "1080p" | "1440p";
/** Frame rate options shared by both camera and screen share. */
export type Fps = 24 | 30 | 60;
/**
 * Audio quality presets.
 *
 * - `speech` — Opus 32 kbps mono (saves bandwidth on conf calls)
 * - `music`  — Opus 128 kbps stereo (default; balanced)
 * - `studio` — Opus 256 kbps stereo (richer for music streaming)
 */
export type AudioQuality = "speech" | "music" | "studio";

type UiPrefsCtx = {
  theme: Theme;
  accent: Accent;
  glow: number;
  lang: Lang;

  cameraQuality: CameraQuality;
  cameraFps: Fps;
  screenQuality: ScreenQuality;
  screenFps: Fps;
  audioQuality: AudioQuality;

  setTheme: (t: Theme) => void;
  setAccent: (a: Accent) => void;
  setGlow: (g: number) => void;
  setLang: (l: Lang) => void;

  setCameraQuality: (q: CameraQuality) => void;
  setCameraFps: (f: Fps) => void;
  setScreenQuality: (q: ScreenQuality) => void;
  setScreenFps: (f: Fps) => void;
  setAudioQuality: (a: AudioQuality) => void;

  toggleLangQuick: () => void;
  reset: () => void;
};

const Ctx = createContext<UiPrefsCtx | null>(null);

function isTheme(v: unknown): v is Theme {
  return v === "dark" || v === "midnight" || v === "light";
}
function isAccent(v: unknown): v is Accent {
  return v === "cyan" || v === "violet" || v === "lime";
}
function isLang(v: unknown): v is Lang {
  return v === "auto" || v === "uk" || v === "en";
}
function isCameraQuality(v: unknown): v is CameraQuality {
  return v === "360p" || v === "540p" || v === "720p" || v === "1080p";
}
function isScreenQuality(v: unknown): v is ScreenQuality {
  return v === "720p" || v === "1080p" || v === "1440p";
}
function isFps(v: unknown): v is Fps {
  return v === 24 || v === 30 || v === 60;
}
function isAudioQuality(v: unknown): v is AudioQuality {
  return v === "speech" || v === "music" || v === "studio";
}

/**
 * Provider for persisted UI preferences (theme/accent/glow/lang) and
 * media-quality preferences (camera/screen/audio). All values are mirrored
 * to localStorage and re-read on mount.
 *
 * @param props children
 * @returns provider element
 */
export function UiPrefsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return "dark";
    const t = localStorage.getItem("nx_theme");
    return isTheme(t) ? t : "dark";
  });
  const [accent, setAccent] = useState<Accent>(() => {
    if (typeof window === 'undefined') return "cyan";
    const a = localStorage.getItem("nx_accent");
    return isAccent(a) ? a : "cyan";
  });
  const [glow, setGlow] = useState<number>(() => {
    if (typeof window === 'undefined') return 45;
    const g = localStorage.getItem("nx_glow");
    return g != null && !Number.isNaN(Number(g)) ? Number(g) : 45;
  });
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return "auto";
    const l = localStorage.getItem("nx_lang");
    return isLang(l) ? l : "auto";
  });

  // Media-quality state — defaults match the previous hard-coded ROOM_OPTIONS.
  const [cameraQuality, setCameraQuality] = useState<CameraQuality>(() => {
    if (typeof window === "undefined") return "720p";
    const v = localStorage.getItem("nx_camera_quality");
    return isCameraQuality(v) ? v : "720p";
  });
  const [cameraFps, setCameraFps] = useState<Fps>(() => {
    if (typeof window === "undefined") return 30;
    const v = Number(localStorage.getItem("nx_camera_fps"));
    return isFps(v) ? v : 30;
  });
  const [screenQuality, setScreenQuality] = useState<ScreenQuality>(() => {
    if (typeof window === "undefined") return "1080p";
    const v = localStorage.getItem("nx_screen_quality");
    return isScreenQuality(v) ? v : "1080p";
  });
  const [screenFps, setScreenFps] = useState<Fps>(() => {
    if (typeof window === "undefined") return 30;
    const v = Number(localStorage.getItem("nx_screen_fps"));
    return isFps(v) ? v : 30;
  });
  const [audioQuality, setAudioQuality] = useState<AudioQuality>(() => {
    if (typeof window === "undefined") return "music";
    const v = localStorage.getItem("nx_audio_quality");
    return isAudioQuality(v) ? v : "music";
  });

  // ✅ auto language по браузеру — теж після mount
  useEffect(() => {
    if (lang !== "auto") return;
    const l = (navigator.language || "en").toLowerCase();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (l.startsWith("uk") || l.startsWith("ru")) setLang("uk");
    else setLang("en");
  }, [lang]);

  // persist
  useEffect(() => { localStorage.setItem("nx_theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("nx_accent", accent); }, [accent]);
  useEffect(() => { localStorage.setItem("nx_glow", String(glow)); }, [glow]);
  useEffect(() => { localStorage.setItem("nx_lang", lang); }, [lang]);
  useEffect(() => { localStorage.setItem("nx_camera_quality", cameraQuality); }, [cameraQuality]);
  useEffect(() => { localStorage.setItem("nx_camera_fps", String(cameraFps)); }, [cameraFps]);
  useEffect(() => { localStorage.setItem("nx_screen_quality", screenQuality); }, [screenQuality]);
  useEffect(() => { localStorage.setItem("nx_screen_fps", String(screenFps)); }, [screenFps]);
  useEffect(() => { localStorage.setItem("nx_audio_quality", audioQuality); }, [audioQuality]);

  const value = useMemo<UiPrefsCtx>(() => ({
    theme, accent, glow, lang,
    cameraQuality, cameraFps, screenQuality, screenFps, audioQuality,
    setTheme,
    setAccent,
    setGlow: (g) => setGlow(Math.max(0, Math.min(100, g))),
    setLang,
    setCameraQuality,
    setCameraFps,
    setScreenQuality,
    setScreenFps,
    setAudioQuality,
    toggleLangQuick: () => setLang(prev => (prev === "uk" ? "en" : "uk")),
    reset: () => {
      setTheme("dark"); setAccent("cyan"); setGlow(45); setLang("auto");
      setCameraQuality("720p"); setCameraFps(30);
      setScreenQuality("1080p"); setScreenFps(30);
      setAudioQuality("music");
    },
  }), [theme, accent, glow, lang, cameraQuality, cameraFps, screenQuality, screenFps, audioQuality]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Read the current preferences. Must be used inside `<UiPrefsProvider>`.
 *
 * @returns prefs context
 */
export function useUiPrefs() {
  const v = useContext(Ctx);
  if (!v) throw new Error("UiPrefsProvider missing");
  return v;
}
