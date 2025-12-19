"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const [user] = useState({
    displayName: "Maksym",
    username: "test",
    email: "test@neonix.app"
  });

  const signOut = () => {
    router.push("/auth");
  };

  return (
    <section 
      style={{ 
        minHeight: '100vh', 
        background: '#1a1d24', 
        color: '#fff', 
        padding: 24 
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <div style={{ background: '#13151a', borderRadius: 12, padding: 24, border: '1px solid #2a2d35' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5em', fontWeight: 'bold' }}>Profile</h2>
              <p style={{ margin: '8px 0 0 0', color: '#b0b3b8' }}>User details, preferences, and security.</p>
            </div>
            <span 
              style={{ 
                padding: '6px 12px', 
                background: '#1a3a1a', 
                borderRadius: 20, 
                fontSize: '0.9em',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              aria-label="Status: Online"
            >
              🟢 Online
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label htmlFor="displayName" style={{ display: 'block', marginBottom: 8, fontSize: '0.9em', fontWeight: '500' }}>
                  Display name
                </label>
                <input 
                  id="displayName"
                  className="input" 
                  defaultValue={user.displayName}
                  style={{ 
                    width: '100%', 
                    padding: '10px 14px', 
                    background: '#2a2d35', 
                    border: '1px solid #3a3f4a', 
                    borderRadius: 6, 
                    color: '#fff',
                    fontSize: '1em'
                  }}
                  aria-label="Display name"
                />
              </div>
              <div>
                <label htmlFor="username" style={{ display: 'block', marginBottom: 8, fontSize: '0.9em', fontWeight: '500' }}>
                  Username
                </label>
                <input 
                  id="username"
                  className="input" 
                  defaultValue={user.username}
                  style={{ 
                    width: '100%', 
                    padding: '10px 14px', 
                    background: '#2a2d35', 
                    border: '1px solid #3a3f4a', 
                    borderRadius: 6, 
                    color: '#fff',
                    fontSize: '1em'
                  }}
                  aria-label="Username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" style={{ display: 'block', marginBottom: 8, fontSize: '0.9em', fontWeight: '500' }}>
                Email
              </label>
              <input 
                id="email"
                className="input" 
                defaultValue={user.email} 
                disabled
                style={{ 
                  width: '100%', 
                  padding: '10px 14px', 
                  background: '#1a1d24', 
                  border: '1px solid #3a3f4a', 
                  borderRadius: 6, 
                  color: '#888',
                  fontSize: '1em',
                  cursor: 'not-allowed'
                }}
                aria-label="Email address (read-only)"
              />
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <button 
                onClick={() => router.push("/chat")}
                style={{ 
                  padding: '10px 20px', 
                  background: '#5865f2', 
                  border: 'none', 
                  borderRadius: 6, 
                  color: '#fff', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '1em'
                }}
              >
                Go to chat
              </button>
              <button 
                onClick={() => router.push("/settings")}
                style={{ 
                  padding: '10px 20px', 
                  background: '#3a3f4a', 
                  border: 'none', 
                  borderRadius: 6, 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontSize: '1em'
                }}
              >
                Settings
              </button>
              <button 
                onClick={signOut}
                style={{ 
                  padding: '10px 20px', 
                  background: 'transparent', 
                  border: '1px solid #3a3f4a', 
                  borderRadius: 6, 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontSize: '1em'
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: '#13151a', borderRadius: 12, padding: 24, border: '1px solid #2a2d35' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5em', fontWeight: 'bold' }}>Quick actions</h2>
              <p style={{ margin: '8px 0 0 0', color: '#b0b3b8' }}>Common tasks for a host.</p>
            </div>
            <span 
              style={{ 
                padding: '6px 12px', 
                background: '#3a3f4a', 
                borderRadius: 20, 
                fontSize: '1.2em'
              }}
              aria-label="Settings"
            >
              ⚙️
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 16, background: '#1a1d24', borderRadius: 8, border: '1px solid #2a2d35' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Create a room</div>
              <div style={{ fontSize: '0.9em', color: '#b0b3b8' }}>Start a call, invite participants, set permissions.</div>
            </div>
            
            <div style={{ padding: 16, background: '#1a1d24', borderRadius: 8, border: '1px solid #2a2d35' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Start screen sharing</div>
              <div style={{ fontSize: '0.9em', color: '#b0b3b8' }}>Share a window or full screen (planned).</div>
            </div>
            
            <div style={{ padding: 16, background: '#1a1d24', borderRadius: 8, border: '1px solid #2a2d35' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Enable annotations</div>
              <div style={{ fontSize: '0.9em', color: '#b0b3b8' }}>Allow drawing/markers depending on channel permissions.</div>
            </div>
            
            <div style={{ padding: 16, background: '#1a1d24', borderRadius: 8, border: '1px solid #2a2d35' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Tune the neon</div>
              <div style={{ fontSize: '0.9em', color: '#b0b3b8' }}>Adjust theme, accent color, and glow.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}