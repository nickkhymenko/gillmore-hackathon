import { BB_CAP } from "./blackbox";
import { basePremium } from "./discount";
import { baseHealthyYears, lifespanFor } from "@/data/evidence";
import type { Pet } from "./types";

/** UK vet prices rose about 75% in ten years: roughly 6% a year, carried into the typical premium. */
const PREMIUM_RISE = 0.06;

export type LifetimeRow = { age: number; typical: number; petra: number; gap: [number, number]; healthier: number | null };

/**
 * Illustrative annual premium from the pet's age now to the breed's typical lifespan: a typical owner (rising
 * with age and vet prices) against the same cover at the top Petra tier. Not a quote.
 */
export function lifetimeCost(pet: Pet) {
  const life = lifespanFor(pet);
  const start = Math.floor(pet.ageYears);
  const end = Math.max(Math.round((life.range[0] + life.range[1]) / 2), start + 4);
  const healthyFrom = Math.round(baseHealthyYears(life.range, pet.species));
  const rows: LifetimeRow[] = [];
  for (let age = start; age <= end; age++) {
    const typical = Math.round(basePremium({ ...pet, ageYears: age }) * (1 + PREMIUM_RISE) ** (age - start));
    const petra = Math.round(typical * (1 - BB_CAP / 100));
    rows.push({ age, typical, petra, gap: [petra, typical], healthier: age >= healthyFrom ? petra : null });
  }
  const saved = rows.reduce((s, r) => s + r.typical - r.petra, 0);
  return { rows, saved, lifespan: end, healthyFrom: Math.max(start, healthyFrom) };
}
