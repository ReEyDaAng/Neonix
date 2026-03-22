"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

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
      signOut: () => {
        setToken(null);
        setUser(null);
        try {
          localStorage.removeItem("nx_token");
          localStorage.removeItem("nx_user");
        } catch {}
      },
    }),
    [token, user, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
