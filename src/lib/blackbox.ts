"use client";
import { readRaw, subscribe, type PetRecord, type StoredCheckin } from "./store";
import { walkPlan } from "./walkplan";
import { useMemo, useSyncExternalStore } from "react";

/**
 * Prevently Black Box: telematics for pet insurance.
 * Everything here lives on the owner's device (localStorage). Routes and locations are never sent anywhere;
 * an insurer would only ever receive "target met this week: yes/no" and the discount tier.
 */
export type WalkRecord = {
  id: string;
  petId: string;
  startedAt: string;
  minutes: number;
  distanceKm: number;
  steps: number;
  source: "phone" | "simulated" | "collar";
  /** [lat, lon] pairs, kept on this device for the owner's own map. */
  route: [number, number][];
};

export type CollarDay = {
  petId: string;
  date: string; // YYYY-MM-DD
  steps: number;
  activeMin: number;
  restingHr: number;
  restingRr: number;
  sleepScore: number; // 0..100
  restlessness: number; // night wake-ups
  scratches: number;
};

export type BlackBoxSettings = { device: "phone" | "collar"; enrolledAt: string; restSince: string | null };

const WALKS_KEY = "prevently.walks";
const COLLAR_KEY = "prevently.collar";
const DAY = 864e5;
const WEEK = 7 * DAY;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
  window.dispatchEvent(new Event("prevently:store"));
}

export const addWalk = (w: WalkRecord) => writeJson(WALKS_KEY, [...readJson<WalkRecord[]>(WALKS_KEY, []), w]);
export const setCollarDays = (petId: string, days: CollarDay[]) =>
  writeJson(COLLAR_KEY, [...readJson<CollarDay[]>(COLLAR_KEY, []).filter((d) => d.petId !== petId), ...days]);
export const clearBlackBoxData = (petId: string) => {
  writeJson(WALKS_KEY, readJson<WalkRecord[]>(WALKS_KEY, []).filter((w) => w.petId !== petId));
  writeJson(COLLAR_KEY, readJson<CollarDay[]>(COLLAR_KEY, []).filter((d) => d.petId !== petId));
};

function useKey<T>(key: string, petId: string | undefined): T[] {
  const raw = useSyncExternalStore(subscribe, () => readRaw(key) ?? "", () => "");
  return useMemo(() => {
    if (!raw || !petId) return [];
    try {
      return (JSON.parse(raw) as (T & { petId: string })[]).filter((x) => x.petId === petId);
    } catch {
      return [];
    }
  }, [raw, petId]);
}
export const useWalks = (petId?: string) => useKey<WalkRecord>(WALKS_KEY, petId);
export const useCollarDays = (petId?: string) => useKey<CollarDay>(COLLAR_KEY, petId).sort((a, b) => a.date.localeCompare(b.date));

// ---------- targets ----------

/** The pet's personal daily activity target in minutes (0 while in rest mode). */
export function dailyTarget(rec: PetRecord, log: StoredCheckin[], now: number) {
  if (rec.blackBox?.restSince) return 0;
  const plan = walkPlan(rec.pet, rec.profile, log, now);
  if (plan.minutes !== null) return plan.minutes;
  return rec.pet.species === "rabbit" ? 60 : rec.pet.species === "horse" ? 60 : 30;
}

const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Active minutes per day: walks plus collar activity (the larger of the two, so a collar walk is not counted twice). */
export function minutesByDay(walks: WalkRecord[], collar: CollarDay[]) {
  const m = new Map<string, number>();
  for (const w of walks) m.set(dayKey(new Date(w.startedAt).getTime()), (m.get(dayKey(new Date(w.startedAt).getTime())) ?? 0) + w.minutes);
  for (const d of collar) m.set(d.date, Math.max(m.get(d.date) ?? 0, d.activeMin));
  return m;
}

export function todayMinutes(walks: WalkRecord[], collar: CollarDay[], now: number) {
  return minutesByDay(walks, collar).get(dayKey(now)) ?? 0;
}

export type WeekResult = { start: number; minutes: number; met: boolean; rest: boolean };

/**
 * Weekly results since enrolment. A week counts as met when its active minutes reach five days' worth of the
 * daily target (rest days allowed). Weeks in rest mode count as met: a vet-advised rest never costs the discount.
 */
export function weeks(rec: PetRecord, target: number, walks: WalkRecord[], collar: CollarDay[], now: number): WeekResult[] {
  const bb = rec.blackBox;
  if (!bb) return [];
  const byDay = minutesByDay(walks, collar);
  const firstData = [...byDay.keys()].sort()[0];
  const start = Math.min(new Date(bb.enrolledAt).getTime(), firstData ? new Date(firstData).getTime() : now);
  const out: WeekResult[] = [];
  for (let s = start; s < now; s += WEEK) {
    let minutes = 0;
    for (let d = s; d < Math.min(s + WEEK, now + DAY); d += DAY) minutes += byDay.get(dayKey(d)) ?? 0;
    const rest = Boolean(bb.restSince && new Date(bb.restSince).getTime() < s + WEEK);
    const complete = s + WEEK <= now;
    out.push({ start: s, minutes, met: rest || minutes >= target * 5, rest });
    if (!complete) break;
  }
  return out;
}

// ---------- discount ----------

/** Illustrative tiers (editable on the partner page): weeks with the target met, plus up to 5% for weekly check-ins, capped at 15%. */
export const BB_TIERS = [
  { ratio: 0.6, pct: 5 },
  { ratio: 0.75, pct: 7.5 },
  { ratio: 0.9, pct: 10 },
];
export const CHECKIN_EXTRA = [
  { ratio: 0.6, pct: 2 },
  { ratio: 0.75, pct: 3.5 },
  { ratio: 0.9, pct: 5 },
];
export const BB_CAP = 15;

const tier = (tiers: { ratio: number; pct: number }[], r: number) => [...tiers].reverse().find((t) => r >= t.ratio)?.pct ?? 0;

export function blackBoxDiscount(wk: WeekResult[], log: StoredCheckin[], now: number) {
  const complete = wk.filter((w) => w.start + WEEK <= now);
  const counted = complete.length ? complete : wk;
  const metRatio = counted.length ? counted.filter((w) => w.met).length / counted.length : 0;
  const weeksEnrolled = Math.max(1, counted.length);
  const checkinWeeks = new Set(log.filter((c) => now - new Date(c.createdAt).getTime() < weeksEnrolled * WEEK).map((c) => Math.floor((now - new Date(c.createdAt).getTime()) / WEEK))).size;
  const checkinRatio = Math.min(1, checkinWeeks / weeksEnrolled);
  const target = counted.length ? tier(BB_TIERS, metRatio) : 0;
  const checkins = counted.length ? tier(CHECKIN_EXTRA, checkinRatio) : 0;
  const nextTier = BB_TIERS.find((t) => metRatio < t.ratio) ?? null;
  return { metRatio, checkinRatio, target, checkins, total: Math.min(BB_CAP, target + checkins), weeksCounted: counted.length, weeksMet: counted.filter((w) => w.met).length, nextTier };
}

// ---------- diagnostics (a change worth a vet's look, never a diagnosis) ----------

export type Signal = { key: keyof CollarDay; label: string; unit: string; baseline: number; recent: number; change: number; flag: boolean; higherIsWorse: boolean };

export function diagnostics(days: CollarDay[]): { signals: Signal[]; amber: boolean; summary: string } | null {
  if (days.length < 21) return null;
  const recent = days.slice(-10);
  const base = days.slice(0, -10).slice(-28);
  const avg = (xs: CollarDay[], k: keyof CollarDay) => xs.reduce((s, d) => s + (d[k] as number), 0) / xs.length;
  const spec: [keyof CollarDay, string, string, boolean, number][] = [
    ["activeMin", "Activity", "min a day", false, -0.25],
    ["sleepScore", "Rest quality", "/100", false, -0.15],
    ["restingHr", "Resting heart rate", "bpm", true, 0.15],
    ["restingRr", "Resting breathing", "breaths a min", true, 0.2],
    ["restlessness", "Night restlessness", "wake-ups", true, 0.5],
  ];
  const signals = spec.map(([key, label, unit, higherIsWorse, threshold]) => {
    const b = avg(base, key), r = avg(recent, key);
    const change = b ? (r - b) / b : 0;
    const flag = higherIsWorse ? change >= threshold : change <= threshold;
    return { key, label, unit, baseline: Math.round(b * 10) / 10, recent: Math.round(r * 10) / 10, change, flag, higherIsWorse };
  });
  const flagged = signals.filter((s) => s.flag);
  return {
    signals,
    amber: flagged.length > 0,
    summary: flagged.length ? `Over the last 10 days: ${flagged.map((s) => `${s.label.toLowerCase()} ${s.change > 0 ? "up" : "down"} ${Math.abs(Math.round(s.change * 100))}% against own baseline`).join("; ")}.` : "No sustained changes against own baseline.",
  };
}

// ---------- simulation ----------

const rnd = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** Six weeks of plausible collar history around this pet's own normal. `dip` adds a mild 10-day decline. */
export function simulateCollarHistory(rec: PetRecord, target: number, now: number, dip = false, dipFactor = 0.66): CollarDay[] {
  const r = rnd(rec.id.length * 7919 + 17);
  const big = rec.pet.sizeClass === "large" || rec.pet.sizeClass === "giant";
  const hr = rec.pet.species === "cat" ? 140 : big ? 72 : 88;
  const rr = rec.pet.species === "cat" ? 22 : 18;
  const out: CollarDay[] = [];
  for (let i = 41; i >= 0; i--) {
    const late = dip && i < 10;
    const f = late ? dipFactor : 1;
    const active = Math.max(5, Math.round(target * (0.9 + r() * 0.35) * f));
    out.push({
      petId: rec.id,
      date: dayKey(now - i * DAY),
      steps: Math.round(active * (rec.pet.species === "cat" ? 40 : 95) * (0.9 + r() * 0.2)),
      activeMin: active,
      restingHr: Math.round(hr * (0.96 + r() * 0.08) * (late ? 1.06 : 1)),
      restingRr: Math.round(rr * (0.92 + r() * 0.16) * (late ? 1.25 : 1)),
      sleepScore: Math.round((82 + r() * 10) * (late ? 0.85 : 1)),
      restlessness: Math.round((late ? 3 : 1) + r() * 1.5),
      scratches: Math.round(r() * 3),
    });
  }
  return out;
}

/**
 * A realistic 35-minute loop (about 2.8 km) for the demo, as one point every 5 seconds.
 * Starts at the given point, or War Memorial Park in Coventry by default.
 */
export function simulatedLoop(start: [number, number] = [52.3912, -1.5226]): { t: number; lat: number; lon: number }[] {
  const pts: { t: number; lat: number; lon: number }[] = [];
  const total = 35 * 60;
  const r = rnd(42);
  const kmPerDegLat = 111.2, kmPerDegLon = 111.2 * Math.cos((start[0] * Math.PI) / 180);
  const radius = 0.3; // km: an easy 35-minute loop of about 2.8 km (War Memorial Park, Coventry by default)
  let jitter = 0;
  for (let t = 0; t <= total; t += 5) {
    const a = (t / total) * Math.PI * 2;
    jitter = jitter * 0.85 + (r() - 0.5) * 0.004; // smoothed, like a real GPS trace
    const wobble = 1 + 0.08 * Math.sin(a * 3) + jitter;
    const dx = radius * wobble * Math.sin(a) * 1.3;
    const dy = radius * wobble * (1 - Math.cos(a));
    pts.push({ t, lat: start[0] + dy / kmPerDegLat, lon: start[1] + dx / kmPerDegLon });
  }
  return pts;
}

/** Great-circle distance in km. */
export function haversine(a: [number, number], b: [number, number]) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]), dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
