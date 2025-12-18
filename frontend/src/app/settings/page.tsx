"use client";

import { useUiPrefs } from "../../state/uiPrefs";

export default function SettingsPage() {
  const { theme, accent, glow, lang, setTheme, setAccent, setGlow, setLang, reset } = useUiPrefs();

  return (
    <section className="page">
      <div className="grid2">
        <div className="card">
          <div className="hd">
            <div>
              <h2 className="title">Settings</h2>
              <p className="subtitle">Theme, language, and neon intensity.</p>
            </div>
            <span className="pill">🎛 UI</span>
          </div>

          <div className="bd">
            <div className="row2">
              <div className="field">
                <div className="label">Theme</div>
                <select value={theme} onChange={(e) => setTheme(e.target.value as any)}>
                  <option value="dark">Dark</option>
                  <option value="midnight">Midnight</option>
                  <option value="light">Light</option>
                </select>
              </div>

              <div className="field">
                <div className="label">Accent</div>
                <select value={accent} onChange={(e) => setAccent(e.target.value as any)}>
                  <option value="cyan">Cyan</option>
                  <option value="violet">Violet</option>
                  <option value="lime">Lime</option>
                </select>
              </div>
            </div>

            <div className="field">
              <div className="label">Neon intensity</div>
              <div className="sliderRow">
                <input type="range" min={0} max={100} value={glow} onChange={(e) => setGlow(Number(e.target.value))} />
                <span className="pill">{glow}%</span>
              </div>
            </div>

            <div className="field">
              <div className="label">Language</div>
              <select value={lang} onChange={(e) => setLang(e.target.value as any)}>
                <option value="auto">Auto (region)</option>
                <option value="uk">Українська</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="actionsRow">
              <button className="btn primary" onClick={() => {}}>Save</button>
              <button className="btn" onClick={reset}>Reset</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="hd">
            <div>
              <h2 className="title">Notes</h2>
              <p className="subtitle">This page matches the prototype’s UI controls.</p>
            </div>
          </div>
          <div className="bd">
            <p className="hint">
              Theme + accent + glow are applied globally via CSS variables.
            </p>
            <div className="list">
              <div className="item"><b>Tip</b><div className="meta">Use Chat to see Discord-like layout states.</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
