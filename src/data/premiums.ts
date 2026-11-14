import { findBreed } from "./breeds";
import type { Pet } from "@/lib/types";

/**
 * Illustrative annual pet insurance premiums, breed- and age-aware. One source for every price in the demo:
 * the poo number, the lifetime chart, the Savings prices and the dashboard's average saving. Not a quote.
 *
 * Sources (all public, figures rounded):
 * - ABI, UK pet insurance 2024: owners paid an average of £389 per pet. Used as the anchor for a dog at ANCHOR_AGE.
 * - MoneySuperMarket monthly averages: French Bulldog about £16.62 vs Labrador about £13.29, so about 1.25x Labrador.
 * - ManyPets breed rankings: Border Collie among the cheapest breeds to insure (about 0.75x Labrador here).
 * - Age: "a 13-year-old costs about 4x a 1-year-old to insure" (1.12^12 is about 3.9) and Pearson Ham's
 *   "+26% in a year for pets over 6", so about 12% a year, compounding.
 * Cats, rabbits and horses: relative factors, illustrative.
 */
export const ABI_AVG_PREMIUM_2024 = 389;
/** The age at which a dog with a 1.0 multiplier pays the ABI average. */
export const ANCHOR_AGE = 5;
/** About 12% a year, compounding. */
export const AGE_RISE = 0.12;
/** The top Petra tier and the model's average member discount. */
export const TOP_TIER_PCT = 15;
export const AVG_MEMBER_PCT = 4;

/** Breed multipliers against a Labrador (1.0). Anything not listed is 1.0. */
export const BREED_MULTIPLIER: Record<string, number> = {
  labrador: 1.0,
  "french-bulldog": 1.25,
  "english-bulldog": 1.35,
  pug: 1.2,
  "border-collie": 0.75,
};

const SPECIES_FACTOR: Record<Pet["species"], number> = { dog: 1, cat: 0.6, rabbit: 0.45, horse: 2.2, other: 0.5 };

export function breedMultiplier(pet: Pick<Pet, "breed" | "species">) {
  if (pet.species !== "dog") return 1;
  const b = findBreed(pet.breed, pet.species);
  return (b && BREED_MULTIPLIER[b.id]) ?? 1;
}

/** Illustrative annual premium for this pet at a given age (defaults to its age now). */
export function annualPremium(pet: Pick<Pet, "breed" | "species" | "ageYears">, age = pet.ageYears) {
  const a = Number.isFinite(age) ? Math.max(0, age) : ANCHOR_AGE;
  return ABI_AVG_PREMIUM_2024 * SPECIES_FACTOR[pet.species] * breedMultiplier(pet) * (1 + AGE_RISE) ** (a - ANCHOR_AGE);
}

/** "Up to": the most the top tier takes off a year. */
export const maxSaving = (pet: Pick<Pet, "breed" | "species" | "ageYears">) => annualPremium(pet) * (TOP_TIER_PCT / 100);
/** What the average member saves a year on this premium. */
export const avgSaving = (pet: Pick<Pet, "breed" | "species" | "ageYears">) => annualPremium(pet) * (AVG_MEMBER_PCT / 100);
