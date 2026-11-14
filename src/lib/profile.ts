import { findBreed } from "@/data/breeds";
import type { Species, TwinProfile } from "./types";

/** Avatar shape defaults per species, before a photo or breed tells us more. */
export const SPECIES_DEFAULT_SHAPE: Record<Species, Pick<TwinProfile, "sizeClass" | "earShape" | "muzzle">> = {
  dog: { sizeClass: "medium", earShape: "floppy", muzzle: "medium" },
  cat: { sizeClass: "small", earShape: "upright", muzzle: "short" },
  rabbit: { sizeClass: "small", earShape: "upright", muzzle: "short" },
  horse: { sizeClass: "giant", earShape: "upright", muzzle: "long" },
  other: { sizeClass: "small", earShape: "upright", muzzle: "medium" },
};

/** A neutral twin profile for a species. */
export function defaultProfile(species: Species = "dog"): TwinProfile {
  return {
    species,
    breedGuess: "",
    breedConfidence: 0,
    ...SPECIES_DEFAULT_SHAPE[species],
    coatColours: [],
    coatPattern: "solid",
    bodyCondition: "unknown",
    ageGuess: "adult",
    notes: "",
  };
}

/** Twin profile built from the owner's answers when there is no photo: the breed's typical look. */
export function profileFromBreed(species: Species, breed: string, base?: TwinProfile): TwinProfile {
  const b = findBreed(breed, species);
  const start = base && base.species === species ? base : defaultProfile(species);
  if (!b) return { ...start, species, breedGuess: breed, breedConfidence: breed ? 1 : 0 };
  return {
    ...start,
    species,
    breedGuess: b.name,
    breedConfidence: 1,
    sizeClass: b.size,
    coatColours: b.look.coat,
    coatPattern: b.look.pattern,
    earShape: b.look.ears,
    muzzle: b.look.muzzle,
  };
}
