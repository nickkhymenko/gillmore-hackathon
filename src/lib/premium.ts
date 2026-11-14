"use client";
import { useSyncExternalStore } from "react";
import { readRaw, subscribe } from "./store";

/** Petra Premium membership for the demo, kept in this browser only. Delete all my data clears it. */
export const PREMIUM_KEY = "prevently.premium";
export type Membership = { since: string; petId: string; petName: string };

export function joinPremium(m: Omit<Membership, "since">) {
  try {
    localStorage.setItem(PREMIUM_KEY, JSON.stringify({ ...m, since: new Date().toISOString() }));
  } catch {}
  window.dispatchEvent(new Event("prevently:store"));
}

export function usePremium(): Membership | null {
  const raw = useSyncExternalStore(subscribe, () => readRaw(PREMIUM_KEY) ?? "", () => "");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Membership;
  } catch {
    return null;
  }
}
