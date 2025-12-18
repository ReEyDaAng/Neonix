"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../../state/auth";

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  if (!user) {
    router.push("/auth");
    return null;
  }

  return (
    <section className="page">
      <div className="grid2">
        <div className="card">
          <div className="hd">
            <div>
              <h2 className="title">Profile</h2>
              <p className="subtitle">User details, preferences, and security.</p>
            </div>
            <span className="pill">🟢 Online</span>
          </div>

          <div className="bd">
            <div className="row2">
              <div className="field">
                <div className="label">Display name</div>
                <input className="input" defaultValue={user.displayName} />
              </div>
              <div className="field">
                <div className="label">Username</div>
                <input className="input" defaultValue={user.username} />
              </div>
            </div>

            <div className="field">
              <div className="label">Email</div>
              <input className="input" defaultValue={user.email} disabled />
            </div>

            <div className="actionsRow">
              <button className="btn primary" onClick={() => router.push("/chat")}>Go to chat</button>
              <button className="btn" onClick={() => router.push("/settings")}>Settings</button>
              <button className="btn ghost" onClick={signOut}>Sign out</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="hd">
            <div>
              <h2 className="title">Quick actions</h2>
              <p className="subtitle">Common tasks for a host.</p>
            </div>
            <span className="pill">⚙️</span>
          </div>
          <div className="bd">
            <div className="list">
              <div className="item"><b>Create a room</b><div className="meta">Start a call, invite participants, set permissions.</div></div>
              <div className="item"><b>Start screen sharing</b><div className="meta">Share a window or full screen (planned).</div></div>
              <div className="item"><b>Enable annotations</b><div className="meta">Allow drawing/markers depending on channel permissions.</div></div>
              <div className="item"><b>Tune the neon</b><div className="meta">Adjust theme, accent color, and glow.</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
