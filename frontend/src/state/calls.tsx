"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { Channel } from "@/lib/api";

type ActiveCall = {
  channel: Channel;
};

type CallsCtx = {
  activeCall: ActiveCall | null;
  startCall: (channel: Channel) => void;
  endCall: () => void;
};

const Ctx = createContext<CallsCtx | null>(null);

/**
 * Provider for the active call slot. Only one active call per session is
 * supported — picking a new voice/video channel replaces the current one.
 *
 * @param props children
 * @returns provider element
 */
export function CallsProvider({ children }: { children: React.ReactNode }) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const startCall = useCallback((channel: Channel) => {
    setActiveCall({ channel });
  }, []);

  const endCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  const value = useMemo<CallsCtx>(
    () => ({ activeCall, startCall, endCall }),
    [activeCall, startCall, endCall],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Read the active call slot.
 *
 * @returns calls context
 */
export function useCalls(): CallsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("CallsProvider missing");
  return ctx;
}
