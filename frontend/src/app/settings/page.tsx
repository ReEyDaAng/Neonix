"use client";

import {
  useUiPrefs,
  type Theme,
  type Accent,
  type Lang,
  type CameraQuality,
  type ScreenQuality,
  type Fps,
  type AudioQuality,
} from "../../state/uiPrefs";

/**
 * Settings page — theme/accent/glow/lang on the left card, media-quality
 * (camera, screen share, audio) on a second card. All values persist to
 * localStorage immediately and apply on the next call you join.
 *
 * @returns settings page element
 */
export default function SettingsPage() {
  const {
    theme, accent, glow, lang,
    setTheme, setAccent, setGlow, setLang, reset,
    cameraQuality, cameraFps, screenQuality, screenFps, audioQuality,
    setCameraQuality, setCameraFps, setScreenQuality, setScreenFps, setAudioQuality,
  } = useUiPrefs();

  const glowId = "settings-glow";

  return (
    <section className="page">
      <div className="grid2">
        <div className="card">
          <div className="hd">
            <div>
              <h2 className="title">Settings</h2>
              <p className="subtitle">Theme, language, and neon intensity.</p>
            </div>
          </div>

          <div className="bd">
            <div className="row2">
              <div className="field">
                <label className="label" htmlFor="settings-theme">Theme</label>
                <select
                  id="settings-theme"
                  className="input"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as Theme)}
                >
                  <option value="dark">Dark</option>
                  <option value="midnight">Midnight</option>
                  <option value="light">Light</option>
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor="settings-lang">Language</label>
                <select
                  id="settings-lang"
                  className="input"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                >
                  <option value="uk">UA</option>
                  <option value="en">EN</option>
                </select>
              </div>
            </div>

            <div className="row2">
              <div className="field">
                <label className="label" htmlFor="settings-accent">Accent</label>
                <select
                  id="settings-accent"
                  className="input"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value as Accent)}
                >
                  <option value="cyan">Cyan</option>
                  <option value="violet">Violet</option>
                  <option value="lime">Lime</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor={glowId}>Neon intensity</label>
              <div className="sliderRow">
                <input
                  id={glowId}
                  type="range"
                  min={0}
                  max={100}
                  value={glow}
                  onChange={(e) => setGlow(Number(e.target.value))}
                />
                <span className="pill" aria-live="polite">{glow}%</span>
              </div>
            </div>

            <div className="actionsRow">
              <button className="btn" type="button" onClick={reset}>
                Reset to defaults
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="hd">
            <div>
              <h2 className="title">Media quality</h2>
              <p className="subtitle">Camera, screen share, and audio in calls. Applies on next join.</p>
            </div>
          </div>

          <div className="bd">
            <div className="row2">
              <div className="field">
                <label className="label" htmlFor="settings-cam-q">Camera resolution</label>
                <select
                  id="settings-cam-q"
                  className="input"
                  value={cameraQuality}
                  onChange={(e) => setCameraQuality(e.target.value as CameraQuality)}
                >
                  <option value="360p">360p — light (≈ 0.4 Mbps)</option>
                  <option value="540p">540p — balanced (≈ 1 Mbps)</option>
                  <option value="720p">720p — HD (≈ 1.7 Mbps)</option>
                  <option value="1080p">1080p — Full HD (≈ 3 Mbps)</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="settings-cam-fps">Camera frame rate</label>
                <select
                  id="settings-cam-fps"
                  className="input"
                  value={String(cameraFps)}
                  onChange={(e) => setCameraFps(Number(e.target.value) as Fps)}
                >
                  <option value="24">24 fps — cinematic</option>
                  <option value="30">30 fps — default</option>
                  <option value="60">60 fps — smooth (more bandwidth)</option>
                </select>
              </div>
            </div>

            <div className="row2">
              <div className="field">
                <label className="label" htmlFor="settings-scr-q">Screen-share resolution</label>
                <select
                  id="settings-scr-q"
                  className="input"
                  value={screenQuality}
                  onChange={(e) => setScreenQuality(e.target.value as ScreenQuality)}
                >
                  <option value="720p">720p — light</option>
                  <option value="1080p">1080p — Full HD (default)</option>
                  <option value="1440p">1440p — sharp text (heavy)</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="settings-scr-fps">Screen-share frame rate</label>
                <select
                  id="settings-scr-fps"
                  className="input"
                  value={String(screenFps)}
                  onChange={(e) => setScreenFps(Number(e.target.value) as Fps)}
                >
                  <option value="24">24 fps — slides / docs</option>
                  <option value="30">30 fps — default</option>
                  <option value="60">60 fps — gameplay / video</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="settings-audio-q">Audio quality</label>
              <select
                id="settings-audio-q"
                className="input"
                value={audioQuality}
                onChange={(e) => setAudioQuality(e.target.value as AudioQuality)}
              >
                <option value="speech">Speech — Opus 32 kbps mono (lowest bandwidth)</option>
                <option value="music">Music — Opus 128 kbps stereo (default)</option>
                <option value="studio">Studio — Opus 256 kbps stereo (richest)</option>
              </select>
              <div className="hint">
                Speech mode enables maximum noise suppression; Studio passes audio through more cleanly for music streaming.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
