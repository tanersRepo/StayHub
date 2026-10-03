"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface LightboxState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const LightboxContext = createContext<LightboxState | null>(null);

/**
 * Tracks whether a full-screen photo viewer is open anywhere on the page, so page-level widgets
 * (the location mini map) can get out of the way instead of competing with it for stacking order.
 */
export function LightboxStateProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <LightboxContext.Provider value={{ open, setOpen }}>{children}</LightboxContext.Provider>;
}

/** True while a photo viewer is open. False outside a provider. */
export function useLightboxOpen() {
  return useContext(LightboxContext)?.open ?? false;
}

/** Called by a viewer to report its open state; resets on close or unmount. */
export function useReportLightboxOpen(open: boolean) {
  const setOpen = useContext(LightboxContext)?.setOpen;
  useEffect(() => {
    if (!setOpen || !open) return;
    setOpen(true);
    return () => setOpen(false);
  }, [open, setOpen]);
}
