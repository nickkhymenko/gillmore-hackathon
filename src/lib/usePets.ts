"use client";
import { useMemo, useSyncExternalStore } from "react";
import { HOUSEHOLD_KEY, LOG_KEY, readRaw, subscribe, type Household, type PetRecord, type StoredCheckin } from "./store";

const EMPTY: Household = { activeId: null, pets: [] };

/** Pet names are shown capitalised everywhere ("Biscuit", never "biscuit"); the rest is kept as typed. */
export function displayName(name: string) {
  return (name ?? "").trim().replace(/(^|[\s-])(\p{Ll})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * The household, live. Empty on the server and on the first client render (so hydration matches),
 * then the stored value. `ready` tells the two apart so pages can avoid flashing an empty state.
 */
export function useHousehold(): { household: Household; ready: boolean } {
  const raw = useSyncExternalStore(subscribe, () => readRaw(HOUSEHOLD_KEY) ?? "", () => null);
  return useMemo(() => {
    if (raw === null) return { household: EMPTY, ready: false };
    if (!raw) return { household: EMPTY, ready: true };
    try {
      const h = JSON.parse(raw) as Household;
      if (!Array.isArray(h.pets)) return { household: EMPTY, ready: true };
      return { household: { ...h, pets: h.pets.map((p) => ({ ...p, pet: { ...p.pet, name: displayName(p.pet.name) } })) }, ready: true };
    } catch {
      return { household: EMPTY, ready: true };
    }
  }, [raw]);
}

/** Check-ins for one pet, live, oldest first. */
export function useCheckins(petId: string | null | undefined, petName?: string): StoredCheckin[] {
  const raw = useSyncExternalStore(subscribe, () => readRaw(LOG_KEY) ?? "", () => "");
  return useMemo(() => {
    if (!raw || !petId) return [];
    try {
      const all = JSON.parse(raw) as StoredCheckin[];
      return all.filter((c) => (c.petId ? c.petId === petId : c.petName?.toLowerCase() === petName?.toLowerCase())).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch {
      return [];
    }
  }, [raw, petId, petName]);
}

export function useActivePet(): { pet: PetRecord | null; ready: boolean } {
  const { household, ready } = useHousehold();
  const pet = household.pets.find((p) => p.id === household.activeId) ?? household.pets[0] ?? null;
  return { pet, ready };
}

let clientNow: number | null = null;
const noSubscribe = () => () => {};

/**
 * The time the page was first rendered on the client, stable across re-renders.
 * 0 on the server: prerendering must not read the clock (Next.js Cache Components). Pages using it
 * only show time-based values after `ready`, so the 0 is never displayed.
 */
export function useNow() {
  return useSyncExternalStore(noSubscribe, () => (clientNow ??= Date.now()), () => 0);
}
