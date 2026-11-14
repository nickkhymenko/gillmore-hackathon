"use client";
import type { CheckinResult, Pet } from "./types";

/**
 * Demo persistence in the browser (localStorage). Swap for Supabase/Postgres later
 * without touching the UI: keep these function signatures.
 */
export type StoredCheckin = CheckinResult & { petName: string };

const PET_KEY = "prevently.pet";
const LOG_KEY = "prevently.checkins";

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
}

export const loadPet = () => read<Pet | null>(PET_KEY, null);
export const savePet = (p: Pet) => write(PET_KEY, p);
export const loadCheckins = () => read<StoredCheckin[]>(LOG_KEY, []);
export const addCheckin = (c: StoredCheckin) => write(LOG_KEY, [...loadCheckins(), c]);
export const clearAll = () => {
  write(LOG_KEY, []);
  try {
    localStorage.removeItem(PET_KEY);
  } catch {}
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
