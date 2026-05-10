"use client";

import { useEffect, useState } from "react";
import { Topbar } from "./ui/Topbar";
import { Footer } from "./ui/Footer";
import { useUiPrefs } from "../../state/uiPrefs";

/**
 * Top-level layout shell. Owns the topbar, main container, and footer.
 *
 * Theme/accent/glow CSS custom properties are also propagated to
 * `<html>` so that `body` (which sits ABOVE `.appRoot` in the tree)
 * picks up the same `--bg`/`--bg2` values via `:root` cascade. Without
 * that, switching to the Light theme leaves the page background dark
 * because body would still resolve `var(--bg)` from the original
 * `:root` block instead of the `[data-theme="light"]` override.
 *
 * @param props children
 * @returns shell wrapper element
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, accent, glow } = useUiPrefs();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Mirror prefs onto <html> so they cascade into body's background too.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-accent", accent);
    root.style.setProperty("--glow", (glow / 100).toFixed(2));
  }, [theme, accent, glow]);

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
      style={{ ["--glow" as string]: (glow / 100).toFixed(2) } as React.CSSProperties}
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
