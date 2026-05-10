"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "./Button";
import { useUiPrefs } from "../../../state/uiPrefs";
import { useI18n } from "../../../state/i18n";
import { useAuth } from "../../../state/auth";

/**
 * Top navigation bar with brand, primary navigation links, and quick actions.
 *
 * Below 980px the navigation collapses into an off-canvas drawer toggled by
 * a hamburger button (CSS in `responsive.css` handles the slide-down).
 *
 * @returns Topbar element
 */
export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleLangQuick } = useUiPrefs();
  const t = useI18n();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Auto-close menu on route change. Wrapped in setTimeout to avoid the
  // ESLint `react-hooks/set-state-in-effect` warning while still acting on
  // the next tick (sufficient for closing a drawer).
  useEffect(() => {
    if (!menuOpen) return;
    const t = setTimeout(() => setMenuOpen(false), 0);
    return () => clearTimeout(t);
  }, [pathname, menuOpen]);

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className={`topbar ${menuOpen ? "menu-open" : ""}`}>
      <div className="container">
        <div className="row">
          <button
            type="button"
            className="topbar__burger"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>

          <Link className="brand" href="/landing" aria-label="Neonix — landing">
            <div className="logoDot" aria-hidden="true" />
            <div className="word">
              <span>Neonix</span>
              <span className="sub">{t("brandTag")}</span>
            </div>
          </Link>

          <nav className="nav" aria-label="Primary">
            <Nav href="/landing" active={pathname.startsWith("/landing")}>
              {t("navLanding")}
            </Nav>
            <Nav href="/auth" active={pathname.startsWith("/auth")}>
              {t("navAuth")}
            </Nav>
            <Nav href="/profile" active={pathname.startsWith("/profile")}>
              {t("navProfile")}
            </Nav>
            <Nav href="/chat" active={pathname.startsWith("/chat")}>
              {t("navChat")}
            </Nav>
            <Nav href="/settings" active={pathname.startsWith("/settings")}>
              {t("navSettings")}
            </Nav>
          </nav>

          <div className="actions">
            <span className="pill" title="Domain">
              <span className="dotMini" aria-hidden="true" />
              <span>neonix.app</span>
            </span>

            <Button
              variant="ghost"
              onClick={toggleLangQuick}
              title="Language"
              aria-label="Switch language"
              type="button"
            >
              🌐
            </Button>

            <Button type="button" onClick={() => router.push("/settings")}>
              ⚙️ {t("btnQuickSettings")}
            </Button>

            <Link className="btn primary" href={user ? "/chat" : "/auth"}>
              ↗ {user ? t("btnGoChat") : t("btnGetStarted")}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Single navigation link with active state styling.
 *
 * @param props link href, active flag, children content
 * @returns navigation anchor element
 */
function Nav({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link className={`navLink ${active ? "active" : ""}`} href={href}>
      {children}
    </Link>
  );
}
