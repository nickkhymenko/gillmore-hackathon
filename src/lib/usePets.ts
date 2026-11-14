"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import { HOUSEHOLD_KEY, LOG_KEY, readRaw, subscribe, type Household, type PetRecord, type StoredCheckin } from "./store";

const EMPTY: Household = { activeId: null, pets: [] };

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
      return { household: Array.isArray(h.pets) ? h : EMPTY, ready: true };
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
      return all.filter((c) => (c.petId ? c.petId === petId : c.petName === petName)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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

/** The time when the component first rendered on the client. Stable across re-renders (pure render). */
export function useNow() {
  const [now] = useState(() => Date.now());
  return now;
}
