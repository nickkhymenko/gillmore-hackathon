import { AVG_MEMBER_PCT, TOP_TIER_PCT, annualPremium } from "@/data/premiums";
import { baseHealthyYears, lifespanFor } from "@/data/evidence";
import type { Pet } from "./types";

export type LifetimeRow = { age: number; typical: number; average: number; petra: number; gap: [number, number]; healthier: number | null };

/**
 * Illustrative annual premium from the pet's age now to the breed's typical lifespan (src/data/premiums.ts):
 * a typical owner, the average member (4% off) and the top Petra tier (15% off). Not a quote.
 */
export function lifetimeCost(pet: Pet) {
  const life = lifespanFor(pet);
  const start = Math.floor(pet.ageYears);
  const end = Math.max(Math.round((life.range[0] + life.range[1]) / 2), start + 4);
  const healthyFrom = Math.round(baseHealthyYears(life.range, pet.species));
  const rows: LifetimeRow[] = [];
  for (let age = start; age <= end; age++) {
    const typical = Math.round(annualPremium(pet, age));
    const petra = Math.round(typical * (1 - TOP_TIER_PCT / 100));
    const average = Math.round(typical * (1 - AVG_MEMBER_PCT / 100));
    rows.push({ age, typical, average, petra, gap: [petra, typical], healthier: age >= healthyFrom ? petra : null });
  }
  const saved = rows.reduce((s, r) => s + r.typical - r.petra, 0);
  const savedAvg = rows.reduce((s, r) => s + r.typical - r.average, 0);
  return { rows, saved, savedAvg, lifespan: end, healthyFrom: Math.max(start, healthyFrom) };
}
