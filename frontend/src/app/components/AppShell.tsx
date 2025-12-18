"use client";

import { useEffect, useState } from "react";
import { Topbar } from "./ui/Topbar";
import { Footer } from "./ui/Footer";
import { useUiPrefs } from "../../state/uiPrefs";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, accent, glow } = useUiPrefs();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 🔒 Поки не mounted — рендеримо ТІЛЬКИ базовий контейнер
  if (!mounted) {
    return (
      <div className="appRoot" data-theme="dark" data-accent="violet">
        <Topbar />
        <main className="container">
          {children}
          <div style={{ height: 26 }} />
          <Footer />
        </main>
      </div>
    );
  }

  // ✅ ПІСЛЯ mount — можна міняти theme / accent / glow
  return (
    <div
      className="appRoot"
      data-theme={theme}
      data-accent={accent}
      style={{ ["--glow" as any]: (glow / 100).toFixed(2) }}
    >
      <Topbar />
      <main className="container">
        {children}
        <div style={{ height: 26 }} />
        <Footer />
      </main>
    </div>
  );
}
