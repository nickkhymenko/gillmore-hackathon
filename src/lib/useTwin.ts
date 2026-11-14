"use client";
import { useMemo, useSyncExternalStore } from "react";
import { TWIN_KEY, readRaw, subscribe, type StoredTwin } from "./store";

/**
 * The saved Pet Twin, live. Null on the server and until one exists.
 * Subscribes on the raw string so the snapshot is stable between renders.
 */
export function useTwin(): StoredTwin | null {
  const raw = useSyncExternalStore(subscribe, () => readRaw(TWIN_KEY), () => null);
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredTwin;
    } catch {
      return null;
    }
  }, [raw]);
}
