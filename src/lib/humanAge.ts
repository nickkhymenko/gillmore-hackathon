import type { Species } from "./types";

/**
 * Approximate human-equivalent age.
 *  - Dogs: 16 × ln(age) + 31, from Wang et al. (2020) Cell Systems (epigenetic clock, derived in Labradors).
 *    Only meaningful from about 1 year; younger dogs are shown as "under 31".
 *  - Cats: the widely used vet chart (about 15 at 1 year, 24 at 2, then about 4 per year).
 * Rabbits and horses: no widely agreed conversion, so none is shown.
 */
export function humanYears(species: Species, age: number): { value: number; prefix?: string; source: string } | null {
  if (species === "dog") {
    if (age < 1) return { value: 31, prefix: "under", source: "wang2020" };
    return { value: Math.round(16 * Math.log(age) + 31), source: "wang2020" };
  }
  if (species === "cat") {
    if (age < 1) return { value: 15, prefix: "under", source: "catchart" };
    if (age < 2) return { value: Math.round(15 + (age - 1) * 9), source: "catchart" };
    return { value: Math.round(24 + (age - 2) * 4), source: "catchart" };
  }
  return null;
}
