"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const [user] = useState({
    displayName: "Maksym",
    username: "test",
    email: "test@neonix.app",
  });

  function signOut() {
    router.push("/auth");
  }

  return (
    <section className="page" aria-label="Profile">
      <div className="grid2">
        {/* Left card */}
        <div className="card">
          <div className="hd">
            <div>
              <h2 className="title">Profile</h2>
              <p className="subtitle">User details, preferences, and security.</p>
            </div>
            <span className="pill" aria-label="Status: Online" title="Online">
              <span className="dotMini" aria-hidden="true" /> Online
            </span>
          </div>

          <div className="bd">
            <div className="row2">
              <div className="field">
                <label className="label" htmlFor="displayName">
                  Display name
                </label>
                <input
                  id="displayName"
                  className="input"
                  defaultValue={user.displayName}
                  aria-label="Display name"
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  className="input"
                  defaultValue={user.username}
                  aria-label="Username"
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="input"
                defaultValue={user.email}
                disabled
                aria-label="Email address (read-only)"
              />
              <div className="hint">Email is read-only in this prototype.</div>
            </div>

            <div className="actionsRow" role="group" aria-label="Profile actions">
              <button type="button" className="btn primary" onClick={() => router.push("/chat")}
                aria-label="Go to chat">
                Go to chat
              </button>
              <button type="button" className="btn" onClick={() => router.push("/settings")}
                aria-label="Open settings">
                Settings
              </button>
              <button type="button" className="btn ghost" onClick={signOut} aria-label="Sign out">
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Right card */}
        <div className="card">
          <div className="hd">
            <div>
              <h2 className="title">Quick actions</h2>
              <p className="subtitle">Common tasks for a host.</p>
            </div>
            <span className="pill" aria-label="Settings" title="Settings">
              ⚙️
            </span>
          </div>

          <div className="bd">
            <div className="list">
              <div className="item">
                <b>Create a room</b>
                <div className="meta">Start a call, invite participants, set permissions.</div>
              </div>
              <div className="item">
                <b>Start screen sharing</b>
                <div className="meta">Share a window or full screen (planned).</div>
              </div>
              <div className="item">
                <b>Enable annotations</b>
                <div className="meta">Allow drawing/markers depending on channel permissions.</div>
              </div>
              <div className="item">
                <b>Tune the neon</b>
                <div className="meta">Adjust theme, accent color, and glow.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
