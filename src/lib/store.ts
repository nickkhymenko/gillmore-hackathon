"use client";
import { sameTheme, type ThemeTokens } from "./palette";
import { defaultProfile } from "./profile";
import { SPECIES_THEME, THEME_KEY } from "./theme";
import { NO_CONSENT, type Answers, type CheckinResult, type Consent, type Pet, type TwinProfile, type TwinResult } from "./types";

/**
 * Demo persistence in the browser (localStorage). Swap for Supabase/Postgres later
 * without touching the UI: keep these function signatures.
 *
 * A household holds several pets. Each pet has its own profile answers, Pet Twin (photo, palette,
 * avatar traits), consent and check-ins. One pet is active at a time and themes the whole app.
 */
export type StoredCheckin = CheckinResult & {
  petName: string;
  petId?: string;
  /** The tap answers behind this result, so trends can be charted per question. */
  answers?: Answers;
  notes?: string;
  /** Weight entered with this check-in, if any. */
  weightKg?: number;
};

export type PetRecord = {
  id: string;
  pet: Pet;
  profile: TwinProfile;
  /** Small JPEG data URL. Lives on this device only. */
  photo: string | null;
  /** Colours found in the photo (hex, most dominant first). */
  swatches: string[];
  /** Theme derived from the photo, kept so "Reset theme" can restore it after manual edits. */
  photoTheme: ThemeTokens | null;
  /** Theme currently applied for this pet. */
  theme: ThemeTokens;
  twinSource: TwinResult["source"] | "owner" | "breed";
  consent: Consent;
  /** Prevently Black Box enrolment (device, start date, vet-advised rest mode). */
  blackBox?: { device: "phone" | "collar"; enrolledAt: string; restSince: string | null };
  /** Onboarding step index while setting up; null once finished. */
  setupStep: number | null;
  createdAt: string;
};

export type Household = { activeId: string | null; pets: PetRecord[] };

const HOUSEHOLD_KEY = "prevently.household";
const LOG_KEY = "prevently.checkins";
const QUESTIONS_KEY = "prevently.questions";
const LEGACY_PET_KEY = "prevently.pet";
const LEGACY_TWIN_KEY = "prevently.twin";
const CHANGE_EVENT = "prevently:store";

// ---------- low-level ----------

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
export { HOUSEHOLD_KEY, LOG_KEY };

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `pet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

// ---------- household ----------

type LegacyTwin = { name: string; profile: TwinProfile; theme: ThemeTokens; swatches: string[]; photo: string | null; source: PetRecord["twinSource"] };

/** One-time move from the single-pet keys used before multiple pets existed. */
function migrate(): Household {
  const pet = read<Pet | null>(LEGACY_PET_KEY, null);
  const twin = read<LegacyTwin | null>(LEGACY_TWIN_KEY, null);
  const h: Household = { activeId: null, pets: [] };
  if (pet || twin) {
    const species = pet?.species ?? twin?.profile.species ?? "dog";
    const rec = blankPet(pet?.name || twin?.name || "Your pet", species);
    if (pet) rec.pet = { ...rec.pet, ...pet };
    if (twin) Object.assign(rec, { profile: twin.profile, theme: twin.theme, photoTheme: twin.photo ? twin.theme : null, swatches: twin.swatches, photo: twin.photo, twinSource: twin.source });
    rec.setupStep = null;
    h.pets.push(rec);
    h.activeId = rec.id;
  }
  try {
    localStorage.removeItem(LEGACY_PET_KEY);
    localStorage.removeItem(LEGACY_TWIN_KEY);
  } catch {}
  return h;
}

export function loadHousehold(): Household {
  const h = read<Household | null>(HOUSEHOLD_KEY, null);
  if (h && Array.isArray(h.pets)) return h;
  const migrated = migrate();
  if (migrated.pets.length) saveHousehold(migrated);
  return migrated;
}
export function saveHousehold(h: Household) {
  write(HOUSEHOLD_KEY, h);
}

export function blankPet(name: string, species: Pet["species"] = "dog"): PetRecord {
  return {
    id: newId(),
    pet: { name, species, breed: "", ageYears: 3 },
    profile: defaultProfile(species),
    photo: null,
    swatches: [],
    photoTheme: null,
    theme: SPECIES_THEME[species].theme,
    twinSource: "breed",
    consent: { ...NO_CONSENT },
    setupStep: 0,
    createdAt: new Date().toISOString(),
  };
}

export function activePet(h: Household = loadHousehold()): PetRecord | null {
  return h.pets.find((p) => p.id === h.activeId) ?? h.pets[0] ?? null;
}
export function getPet(id: string): PetRecord | null {
  return loadHousehold().pets.find((p) => p.id === id) ?? null;
}

export function addPet(name: string, species?: Pet["species"]): PetRecord {
  const h = loadHousehold();
  const rec = blankPet(name, species);
  saveHousehold({ activeId: rec.id, pets: [...h.pets, rec] });
  return rec;
}

export function updatePet(id: string, patch: Partial<PetRecord> | ((p: PetRecord) => Partial<PetRecord>)) {
  const h = loadHousehold();
  saveHousehold({ ...h, pets: h.pets.map((p) => (p.id === id ? { ...p, ...(typeof patch === "function" ? patch(p) : patch) } : p)) });
}

export function setActivePet(id: string) {
  const h = loadHousehold();
  if (h.pets.some((p) => p.id === id)) saveHousehold({ ...h, activeId: id });
}

/** Removes a pet and its check-ins. Returns an undo function. */
export function removePet(id: string): () => void {
  const h = loadHousehold();
  const index = h.pets.findIndex((p) => p.id === id);
  if (index < 0) return () => {};
  const removed = h.pets[index];
  const log = read<StoredCheckin[]>(LOG_KEY, []);
  const pets = h.pets.filter((p) => p.id !== id);
  saveHousehold({ activeId: h.activeId === id ? (pets[0]?.id ?? null) : h.activeId, pets });
  write(LOG_KEY, log.filter((c) => c.petId !== id));
  return () => {
    const now = loadHousehold();
    if (now.pets.some((p) => p.id === id)) return;
    const restored = [...now.pets];
    restored.splice(Math.min(index, restored.length), 0, removed);
    saveHousehold({ activeId: id, pets: restored });
    write(LOG_KEY, [...read<StoredCheckin[]>(LOG_KEY, []), ...log.filter((c) => c.petId === id)]);
  };
}

// ---------- photo and theme ----------

/** Deletes the stored photo and reverts to the default palette. Twin traits stay. Returns an undo function. */
export function removePhoto(id: string): () => void {
  const before = getPet(id);
  if (!before) return () => {};
  updatePet(id, (p) => ({ photo: null, swatches: [], photoTheme: null, theme: SPECIES_THEME[p.pet.species].theme }));
  return () => updatePet(id, { photo: before.photo, swatches: before.swatches, photoTheme: before.photoTheme, theme: before.theme });
}

/** Restores the photo's own palette after manual changes. */
export function resetPetTheme(id: string) {
  updatePet(id, (p) => ({ theme: p.photoTheme ?? SPECIES_THEME[p.pet.species].theme }));
}

export const themeEdited = (p: PetRecord) => Boolean(p.photoTheme && !sameTheme(p.photoTheme, p.theme));

// ---------- erase everything ----------

const ALL_KEYS = [HOUSEHOLD_KEY, LOG_KEY, QUESTIONS_KEY, THEME_KEY, LEGACY_PET_KEY, LEGACY_TWIN_KEY, "prevently.walks", "prevently.collar"];

/** UK GDPR right to erasure: removes every Prevently key from this browser. Returns an undo function. */
export function deleteAllData(): () => void {
  const snapshot = ALL_KEYS.map((k) => [k, readRaw(k)] as const);
  try {
    ALL_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {}
  notify();
  return () => {
    try {
      snapshot.forEach(([k, v]) => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)));
    } catch {}
    notify();
  };
}

// ---------- compatibility API (check-in and history pages) ----------

/** The active pet's answers, as used by /api/checkin. */
export const loadPet = (): Pet | null => activePet()?.pet ?? null;

/** Saves answers to the active pet, or creates a first pet when there is none. */
export function savePet(p: Pet) {
  const active = activePet();
  if (!active) {
    const rec = addPet(p.name, p.species);
    updatePet(rec.id, { pet: p, setupStep: null });
    return;
  }
  updatePet(active.id, { pet: { ...active.pet, ...p } });
}

/** Check-ins for the active pet, oldest first. */
export function loadCheckins(): StoredCheckin[] {
  const active = activePet();
  const all = read<StoredCheckin[]>(LOG_KEY, []);
  if (!active) return all;
  return all.filter((c) => (c.petId ? c.petId === active.id : c.petName === active.pet.name));
}

export function addCheckin(c: StoredCheckin) {
  const active = activePet();
  const petId = active && active.pet.name === c.petName ? active.id : c.petId;
  write(LOG_KEY, [...read<StoredCheckin[]>(LOG_KEY, []), { ...c, petId }]);
}

/** Old "reset demo" behaviour: now the same as deleting everything. */
export const clearAll = () => {
  deleteAllData();
};

/** Seed 6 weeks of plausible history so the trend charts and baseline logic show on stage. */
export function seedDemo(pet: Pet) {
  const active = activePet();
  if (!active) savePet(pet);
  const id = active && active.pet.name === pet.name ? active.id : activePet()?.id;
  const scores = [92, 94, 90, 93, 91, 88];
  const normal: Answers = { appetite: "normal", energy: "normal", water: "normal", stool: "normal", vomiting: "none", mobility: "normal", skin: "normal", breathing: "normal", urination: "normal" };
  const variation: Partial<Answers>[] = [{}, {}, { energy: "lower" }, {}, {}, {}];
  const kg = pet.weightKg;
  const wobble = [0, 0.4, -0.2, 0.3, 0.1, 0.5];
  const now = Date.now();
  const week = 7 * 24 * 3600 * 1000;
  const seeded: StoredCheckin[] = scores.map((s, i) => ({
    petName: pet.name,
    petId: id,
    answers: { ...normal, ...variation[i] },
    weightKg: kg ? Math.round((kg + (kg * wobble[i]) / 30) * 10) / 10 : undefined,
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
  // Keep real check-ins from the last six days (for example one just done on the walk); replace older history.
  const recent = now - 6 * 24 * 3600 * 1000;
  const mine = (c: StoredCheckin) => (id ? c.petId === id : c.petName === pet.name);
  const all = read<StoredCheckin[]>(LOG_KEY, []);
  const keep = all.filter((c) => !mine(c) || new Date(c.createdAt).getTime() >= recent);
  write(LOG_KEY, [...keep, ...seeded].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
}

export function streakWeeks(list: StoredCheckin[]) {
  return list.length; // demo simplification: one check-in per week
}
