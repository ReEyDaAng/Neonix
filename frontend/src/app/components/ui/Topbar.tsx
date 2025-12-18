"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "./Button";
import { useUiPrefs } from "../../../state/uiPrefs";
import { useI18n } from "../../../state/i18n";
import { useAuth } from "../../../state/auth";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleLangQuick } = useUiPrefs();
  const t = useI18n();
  const { user } = useAuth();

  return (
    <header className="topbar">
      <div className="container">
        <div className="row">
          <div className="brand" onClick={() => router.push("/landing")} style={{ cursor: "pointer" }}>
            <div className="logoDot" />
            <div className="word">
              <span>Neonix</span>
              <span className="sub">{t("brandTag")}</span>
            </div>
          </div>

          <nav className="nav" aria-label="Primary">
            <Nav href="/landing" active={pathname.startsWith("/landing")}>{t("navLanding")}</Nav>
            <Nav href="/auth" active={pathname.startsWith("/auth")}>{t("navAuth")}</Nav>
            <Nav href="/profile" active={pathname.startsWith("/profile")}>{t("navProfile")}</Nav>
            <Nav href="/chat" active={pathname.startsWith("/chat")}>{t("navChat")}</Nav>
            <Nav href="/settings" active={pathname.startsWith("/settings")}>{t("navSettings")}</Nav>
          </nav>

          <div className="actions">
            <span className="pill" title="Domain">
              <span className="dotMini" />
              <span>neonix.app</span>
            </span>

            <Button variant="ghost" onClick={toggleLangQuick} title="Language">
              🌐
            </Button>

            <Button onClick={() => router.push("/settings")}>⚙️ {t("btnQuickSettings")}</Button>

            <Link className="btn primary" href={user ? "/chat" : "/auth"}>
              ↗ {user ? t("btnGoChat") : t("btnGetStarted")}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Nav({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link className={`navLink ${active ? "active" : ""}`} href={href}>
      {children}
    </Link>
  );
}
