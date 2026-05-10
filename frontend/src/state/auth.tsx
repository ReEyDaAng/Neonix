"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type User = { id: string; email: string; displayName: string; username: string };

type AuthCtx = {
  token: string | null;
  user: User | null;
  /** важливо: буде true після того, як ми зчитаємо localStorage */
  ready: boolean;
  setSession: (token: string, user: User) => void;
  signOut: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

/**
 * Provider that owns the user / token state, mirrors it to localStorage,
 * and listens for global signals (`nx:unauthorized` on 401, `storage` events
 * from other tabs) to drop the session safely.
 *
 * @param props children
 * @returns provider element
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ВАЖЛИВО: перший рендер і на сервері, і на клієнті буде однаковий (null)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // ТІЛЬКИ після mount у браузері читаємо localStorage
  useEffect(() => {
    try {
      const t = localStorage.getItem("nx_token");
      const raw = localStorage.getItem("nx_user");
      setToken(t);
      setUser(raw ? JSON.parse(raw) : null);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem("nx_token");
      localStorage.removeItem("nx_user");
    } catch {}
    if (typeof window !== "undefined") {
      // Lets feature consumers (sockets, livekit) tear down their connections.
      window.dispatchEvent(new CustomEvent("nx:signedOut"));
    }
  }, []);

  // Cross-tab sync — if user signs out (or is signed out by 401) in another
  // tab, this tab should follow.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "nx_token" && !e.newValue) {
        setToken(null);
        setUser(null);
        window.dispatchEvent(new CustomEvent("nx:signedOut"));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Auto signOut on 401 from any HTTP call (emitted by `api.ts`).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onUnauthorized = () => {
      // Avoid loops if we're already signed out.
      if (token || user) signOut();
    };
    window.addEventListener("nx:unauthorized", onUnauthorized);
    return () =>
      window.removeEventListener("nx:unauthorized", onUnauthorized);
  }, [token, user, signOut]);

  const value = useMemo<AuthCtx>(
    () => ({
      token,
      user,
      ready,
      setSession: (t, u) => {
        setToken(t);
        setUser(u);
        try {
          localStorage.setItem("nx_token", t);
          localStorage.setItem("nx_user", JSON.stringify(u));
        } catch {}
      },
      signOut,
    }),
    [token, user, ready, signOut]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Hook that reads auth state. Must be used inside `<AuthProvider>`.
 *
 * @returns auth context
 */
export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
