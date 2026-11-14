"use client";
import { deriveTheme } from "./palette";
import { simulateCollarHistory, simulatedLoop, dailyTarget, type CollarDay, type WalkRecord } from "./blackbox";
import { loadHousehold, saveHousehold, type PetRecord, type StoredCheckin } from "./store";
import type { Answers } from "./types";

/**
 * Fully populated demo pets for the pitch: `?demo=biscuit` (dog, amber) and `?demo=miso` (cat, healthy).
 * They are added alongside any real pets (fixed ids, replaced on reload) and become the active pet.
 */
export type DemoId = "biscuit" | "miso";

const DAY = 864e5;
const NORMAL: Answers = { appetite: "normal", energy: "normal", water: "normal", stool: "normal", vomiting: "none", mobility: "normal", skin: "normal", breathing: "normal", urination: "normal" };

function readJson<T>(k: string, f: T): T {
  try {
    return JSON.parse(localStorage.getItem(k) ?? "") as T;
  } catch {
    return f;
  }
}
function writeJson(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}

function checkin(rec: PetRecord, daysAgo: number, now: number, answers: Partial<Answers>, extra: Partial<StoredCheckin> = {}): StoredCheckin {
  const a = { ...NORMAL, ...answers };
  const flagged = a.mobility !== "normal" || a.water !== "normal";
  return {
    petName: rec.pet.name,
    petId: rec.id,
    answers: a,
    weightKg: rec.pet.weightKg ? Math.round((rec.pet.weightKg + Math.sin(daysAgo) * 0.3) * 10) / 10 : undefined,
    status: flagged ? "amber" : "green",
    healthScore: flagged ? 74 : 90 + Math.round(Math.cos(daysAgo) * 3),
    headline: flagged ? `A few changes worth a vet's view for ${rec.pet.name}` : `${rec.pet.name} looks on track this week`,
    ownerMessage: flagged ? "Drinking more and stiffer after walks for a few weeks. An online consult is a quick way to get a vet's view before it becomes a bigger problem." : "Nothing concerning stands out. Keep up the weekly check-ins.",
    flags: [],
    nextStep: flagged ? { action: "online_consult", rationale: "Triggered by: Increased thirst in an older pet" } : { action: "keep_monitoring", rationale: "Normal week." },
    preventionTips: [],
    vetBrief: flagged ? `Patient: ${rec.pet.name}, ${rec.pet.species} (${rec.pet.breed}), ${rec.pet.ageYears}y, ${rec.pet.weightKg}kg. Owner-reported over 3 weeks: water=more, mobility=stiff. Black Box: activity well down over the last 10 days against own baseline; resting breathing up.` : "",
    source: "rules",
    safetyOverride: false,
    safetyReasons: flagged ? ["Increased thirst in an older pet"] : [],
    trend: flagged ? { baseline: 91, delta: -17, note: "Score is 17 points below this pet's own recent baseline (91). Early drift worth a vet's eye." } : { baseline: null, delta: null, note: null },
    creditsEarned: 10,
    disclaimer: "",
    createdAt: new Date(now - daysAgo * DAY + 9 * 3600e3).toISOString(),
    ...extra,
  };
}

function base(id: string, now: number): Omit<PetRecord, "pet" | "profile" | "theme"> {
  return { id, photo: null, swatches: [], photoTheme: null, twinSource: "breed", consent: { vet: true, insurer: true, research: true, updatedAt: new Date(now - 90 * DAY).toISOString() }, setupStep: null, createdAt: new Date(now - 90 * DAY).toISOString() };
}

export function seedDemoPet(which: DemoId, now = Date.now()): PetRecord {
  const id = `demo-${which}`;
  let rec: PetRecord;
  let log: StoredCheckin[];
  let collar: CollarDay[];
  let walks: WalkRecord[] = [];

  if (which === "biscuit") {
    const coat = ["#E2BE7A"];
    rec = {
      ...base(id, now),
      pet: { name: "Biscuit", species: "dog", breed: "Labrador Retriever", ageYears: 8, weightKg: 34, sizeClass: "large", neutered: true, activity: "moderate", pronoun: "he" },
      profile: { species: "dog", breedGuess: "Labrador Retriever", breedConfidence: 1, sizeClass: "large", coatColours: coat, coatPattern: "solid", earShape: "floppy", muzzle: "medium", bodyCondition: "ideal", ageGuess: "senior", notes: "" },
      photo: "/images/biscuit.svg", // illustration, not a stock photo; the owner's own upload replaces it
      swatches: ["#E2BE7A", "#6F7A3E", "#2F3A1E"],
      theme: deriveTheme([], coat),
      blackBox: { device: "collar", enrolledAt: new Date(now - 42 * DAY).toISOString(), restSince: null },
    };
    rec.photoTheme = rec.theme;
    // 12 weekly check-ins: nine normal weeks, then three weeks of stiffness and extra thirst.
    log = Array.from({ length: 12 }, (_, i) => {
      const daysAgo = (12 - i) * 7 - 5;
      return checkin(rec, daysAgo, now, i >= 9 ? { water: "more", mobility: "stiff" } : {});
    });
    const target = dailyTarget(rec, log.slice(0, 9), now);
    // A 10-day dip deep enough that the last week misses even his reduced (stiffness-adjusted) target: 5 of 6 weeks met.
    collar = simulateCollarHistory(rec, target, now, true, 0.35);
    const loop = simulatedLoop().filter((_, i) => i % 6 === 0).map((p) => [p.lat, p.lon] as [number, number]);
    walks = Array.from({ length: 14 }, (_, i) => {
      const daysAgo = 41 - i * 3;
      const late = daysAgo < 10;
      return { id: `${id}-w${i}`, petId: id, startedAt: new Date(now - daysAgo * DAY + 7.5 * 3600e3).toISOString(), minutes: late ? 25 : 45, distanceKm: late ? 1.4 : 2.6, steps: late ? 2600 : 4700, source: "collar", route: loop };
    });
  } else {
    const coat = ["#8E9196"];
    rec = {
      ...base(id, now),
      pet: { name: "Miso", species: "cat", breed: "British Shorthair", ageYears: 4, weightKg: 5, sizeClass: "small", neutered: true, activity: "low", pronoun: "she" },
      profile: { species: "cat", breedGuess: "British Shorthair", breedConfidence: 1, sizeClass: "small", coatColours: coat, coatPattern: "solid", earShape: "upright", muzzle: "short", bodyCondition: "ideal", ageGuess: "adult", notes: "" },
      theme: { bg: "#F2F2EF", accent: "#F2C14E", accentSoft: "#FBEFC9", dark: "#111213" },
      blackBox: { device: "collar", enrolledAt: new Date(now - 42 * DAY).toISOString(), restSince: null },
    };
    // Healthy: three green check-ins spread over six weeks.
    log = [33, 19, 5].map((d) => checkin(rec, d, now, {}));
    const target = dailyTarget(rec, log, now);
    // One quieter week (a busy household week), otherwise on target: 5 of 6 weeks met.
    collar = simulateCollarHistory(rec, target, now).map((d) => {
      const ago = Math.round((now - new Date(d.date).getTime()) / DAY);
      return ago >= 21 && ago < 28 ? { ...d, activeMin: Math.round(d.activeMin * 0.45) } : d;
    });
  }

  const h = loadHousehold();
  const pets = [...h.pets.filter((p) => p.id !== id), rec];
  saveHousehold({ activeId: id, pets });
  writeJson("prevently.checkins", [...readJson<StoredCheckin[]>("prevently.checkins", []).filter((c) => c.petId !== id), ...log]);
  writeJson("prevently.collar", [...readJson<CollarDay[]>("prevently.collar", []).filter((c) => c.petId !== id), ...collar]);
  writeJson("prevently.walks", [...readJson<WalkRecord[]>("prevently.walks", []).filter((w) => w.petId !== id), ...walks]);
  window.dispatchEvent(new Event("prevently:store"));
  return rec;
}
