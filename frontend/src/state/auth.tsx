"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type User = { id: string; email: string; displayName: string; username: string };

type AuthCtx = {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  signOut: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => (typeof window !== "undefined" ? localStorage.getItem("nx_token") : null));
  const [user, setUser] = useState<User | null>(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("nx_user") : null;
    return raw ? JSON.parse(raw) : null;
  });

  const value = useMemo<AuthCtx>(() => ({
    token, user,
    setSession: (t, u) => {
      setToken(t);
      setUser(u);
      localStorage.setItem("nx_token", t);
      localStorage.setItem("nx_user", JSON.stringify(u));
    },
    signOut: () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem("nx_token");
      localStorage.removeItem("nx_user");
    }
  }), [token, user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
