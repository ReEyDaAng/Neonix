"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "midnight" | "light";
type Accent = "cyan" | "violet" | "lime";
type Lang = "auto" | "uk" | "en";

type UiPrefsCtx = {
  theme: Theme;
  accent: Accent;
  glow: number;
  lang: Lang;
  setTheme: (t: Theme) => void;
  setAccent: (a: Accent) => void;
  setGlow: (g: number) => void;
  setLang: (l: Lang) => void;
  toggleLangQuick: () => void;
  reset: () => void;
};

const Ctx = createContext<UiPrefsCtx | null>(null);

function isTheme(v: unknown): v is Theme {
  return v === "dark" || v === "midnight" || v === "light";
}
function isAccent(v: unknown): v is Accent {
  return v === "cyan" || v === "violet" || v === "lime";
}
function isLang(v: unknown): v is Lang {
  return v === "auto" || v === "uk" || v === "en";
}

export function UiPrefsProvider({ children }: { children: React.ReactNode }) {
  // ✅ ВАЖЛИВО: однакові дефолти на сервері і на першому клієнтському рендері
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return "dark";
    const t = localStorage.getItem("nx_theme");
    return isTheme(t) ? t : "dark";
  });
  const [accent, setAccent] = useState<Accent>(() => {
    if (typeof window === 'undefined') return "cyan";
    const a = localStorage.getItem("nx_accent");
    return isAccent(a) ? a : "cyan";
  });
  const [glow, setGlow] = useState<number>(() => {
    if (typeof window === 'undefined') return 45;
    const g = localStorage.getItem("nx_glow");
    return g != null && !Number.isNaN(Number(g)) ? Number(g) : 45;
  });
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return "auto";
    const l = localStorage.getItem("nx_lang");
    return isLang(l) ? l : "auto";
  });

  // ✅ auto language по браузеру — теж після mount
  useEffect(() => {
    if (lang !== "auto") return;
    const l = (navigator.language || "en").toLowerCase();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (l.startsWith("uk") || l.startsWith("ru")) setLang("uk");
    else setLang("en");
  }, [lang]);

  // persist
  useEffect(() => { localStorage.setItem("nx_theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("nx_accent", accent); }, [accent]);
  useEffect(() => { localStorage.setItem("nx_glow", String(glow)); }, [glow]);
  useEffect(() => { localStorage.setItem("nx_lang", lang); }, [lang]);

  const value = useMemo<UiPrefsCtx>(() => ({
    theme, accent, glow, lang,
    setTheme,
    setAccent,
    setGlow: (g) => setGlow(Math.max(0, Math.min(100, g))),
    setLang,
    toggleLangQuick: () => setLang(prev => (prev === "uk" ? "en" : "uk")),
    reset: () => { setTheme("dark"); setAccent("cyan"); setGlow(45); setLang("auto"); }
  }), [theme, accent, glow, lang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUiPrefs() {
  const v = useContext(Ctx);
  if (!v) throw new Error("UiPrefsProvider missing");
  return v;
}
