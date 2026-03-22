"use client";

import { useUiPrefs } from "../../state/uiPrefs";

export default function SettingsPage() {
  const { theme, accent, glow, lang, setTheme, setAccent, setGlow, setLang, reset } = useUiPrefs();

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
              <h2 className="title">Tips</h2>
              <p className="subtitle">Accessibility and usability basics.</p>
            </div>
          </div>

          <div className="bd">
            <div className="list">
              <div className="item"><b>Keyboard</b><div className="meta">All controls should be reachable by Tab and activatable by Enter/Space.</div></div>
              <div className="item"><b>Labels</b><div className="meta">Inputs and sliders should have labels.</div></div>
              <div className="item"><b>Contrast</b><div className="meta">Text should have sufficient contrast against background.</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
