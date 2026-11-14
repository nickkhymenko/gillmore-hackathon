"use client";
import { useMemo, useSyncExternalStore } from "react";
import { HOUSEHOLD_KEY, readRaw, subscribe, type Household, type PetRecord } from "./store";

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

export function useActivePet(): { pet: PetRecord | null; ready: boolean } {
  const { household, ready } = useHousehold();
  const pet = household.pets.find((p) => p.id === household.activeId) ?? household.pets[0] ?? null;
  return { pet, ready };
}
