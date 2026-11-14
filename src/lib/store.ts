"use client";
import type { ThemeTokens } from "./palette";
import { resetTheme } from "./theme";
import type { CheckinResult, Pet, TwinProfile, TwinResult } from "./types";

/**
 * Demo persistence in the browser (localStorage). Swap for Supabase/Postgres later
 * without touching the UI: keep these function signatures.
 */
export type StoredCheckin = CheckinResult & { petName: string };

/** The Pet Twin: what the photo told us, the theme derived from it, and a small thumbnail. */
export type StoredTwin = {
  name: string;
  profile: TwinProfile;
  theme: ThemeTokens;
  swatches: string[];
  photo: string | null; // small JPEG data URL, kept on this device only
  source: TwinResult["source"] | "owner";
  updatedAt: string;
};

const PET_KEY = "prevently.pet";
const LOG_KEY = "prevently.checkins";
export const TWIN_KEY = "prevently.twin";
const CHANGE_EVENT = "prevently:store";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or storage full: demo still works for this session */
  }
  notify();
}
function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Subscribe to any store change (this tab or another). For useSyncExternalStore. */
export function subscribe(cb: () => void) {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
export function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const loadPet = () => read<Pet | null>(PET_KEY, null);
export const savePet = (p: Pet) => write(PET_KEY, p);
export const loadCheckins = () => read<StoredCheckin[]>(LOG_KEY, []);
export const addCheckin = (c: StoredCheckin) => write(LOG_KEY, [...loadCheckins(), c]);
export const loadTwin = () => read<StoredTwin | null>(TWIN_KEY, null);
export const saveTwin = (t: StoredTwin) => write(TWIN_KEY, t);
export const clearAll = () => {
  try {
    localStorage.removeItem(PET_KEY);
    localStorage.removeItem(TWIN_KEY);
  } catch {}
  resetTheme();
  write(LOG_KEY, []);
};

/** Seed 6 weeks of plausible history so the trend chart and baseline logic show on stage. */
export function seedDemo(pet: Pet) {
  const scores = [92, 94, 90, 93, 91, 88];
  const now = Date.now();
  const week = 7 * 24 * 3600 * 1000;
  const seeded: StoredCheckin[] = scores.map((s, i) => ({
    petName: pet.name,
    status: "green",
    healthScore: s,
    headline: `${pet.name} looks on track this week`,
    ownerMessage: "Nothing concerning stands out.",
    flags: [],
    nextStep: { action: "keep_monitoring", rationale: "Normal week." },
    preventionTips: [],
    vetBrief: "",
    source: "rules",
    safetyOverride: false,
    safetyReasons: [],
    trend: { baseline: null, delta: null, note: null },
    creditsEarned: i >= 3 ? 25 : 15,
    disclaimer: "",
    createdAt: new Date(now - (scores.length - i) * week).toISOString(),
  }));
  savePet(pet);
  write(LOG_KEY, seeded);
}

export function streakWeeks(list: StoredCheckin[]) {
  return list.length; // demo simplification: one check-in per week
}
