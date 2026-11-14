"use client";
import { useMemo, useSyncExternalStore } from "react";
import { readRaw, subscribe } from "../store";
import type { ScanResponse } from "./contract";

/** Movement check results, per pet, kept on this device. The video itself is never stored. */
export const SCANS_KEY = "prevently.scans";

export function addScan(r: ScanResponse) {
  let all: ScanResponse[] = [];
  try {
    all = JSON.parse(localStorage.getItem(SCANS_KEY) ?? "[]");
  } catch {}
  try {
    localStorage.setItem(SCANS_KEY, JSON.stringify([...all, r]));
  } catch {}
  window.dispatchEvent(new Event("prevently:store"));
}

export function useScans(petId?: string): ScanResponse[] {
  const raw = useSyncExternalStore(subscribe, () => readRaw(SCANS_KEY) ?? "", () => "");
  return useMemo(() => {
    if (!raw || !petId) return [];
    try {
      // Only real model results count (live model or a demo clip's offline model run). Results from the demo
      // analysis stored by older builds are never shown as a pet's own results.
      return (JSON.parse(raw) as ScanResponse[]).filter((s) => s.petId === petId && s.source === "ml").sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    } catch {
      return [];
    }
  }, [raw, petId]);
}
