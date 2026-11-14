import type { AGE_GUESSES, COAT_PATTERNS, EAR_SHAPES, MUZZLES, SizeClass, Species } from "@/lib/types";

/**
 * Common UK breeds, used for the onboarding breed list, weight prefill and the avatar when there is no photo.
 * typicalKg is a broad adult range for prefilling the weight question only; the owner always confirms it.
 * Health figures (lifespan, risks) live separately with their sources.
 */
export type Breed = {
  id: string;
  name: string;
  species: Species;
  size: SizeClass;
  typicalKg: [number, number];
  aliases?: string[];
  look: {
    coat: string[];
    pattern: (typeof COAT_PATTERNS)[number];
    ears: (typeof EAR_SHAPES)[number];
    muzzle: (typeof MUZZLES)[number];
  };
};

export const BREEDS: Breed[] = [
  // Dogs
  { id: "labrador", name: "Labrador Retriever", species: "dog", size: "large", typicalKg: [25, 36], aliases: ["labrador", "lab"], look: { coat: ["#E2BE7A"], pattern: "solid", ears: "floppy", muzzle: "medium" } },
  { id: "cockapoo", name: "Cockapoo", species: "dog", size: "small", typicalKg: [6, 11], aliases: ["cocker poodle"], look: { coat: ["#B9824D"], pattern: "solid", ears: "floppy", muzzle: "medium" } },
  { id: "french-bulldog", name: "French Bulldog", species: "dog", size: "small", typicalKg: [8, 14], aliases: ["frenchie"], look: { coat: ["#8D7A6B", "#F2EDE6"], pattern: "bicolour", ears: "upright", muzzle: "short" } },
  { id: "cocker-spaniel", name: "Cocker Spaniel", species: "dog", size: "medium", typicalKg: [12, 15], aliases: ["cocker", "english cocker spaniel"], look: { coat: ["#9B5A2C"], pattern: "solid", ears: "floppy", muzzle: "medium" } },
  { id: "dachshund", name: "Dachshund", species: "dog", size: "small", typicalKg: [5, 12], aliases: ["sausage dog", "miniature dachshund"], look: { coat: ["#2B2422", "#B9783F"], pattern: "bicolour", ears: "floppy", muzzle: "long" } },
  { id: "border-collie", name: "Border Collie", species: "dog", size: "medium", typicalKg: [14, 22], aliases: ["collie"], look: { coat: ["#1F1D1C", "#F4F1EC"], pattern: "bicolour", ears: "semi", muzzle: "long" } },
  { id: "golden-retriever", name: "Golden Retriever", species: "dog", size: "large", typicalKg: [25, 34], aliases: ["golden"], look: { coat: ["#D19A4F"], pattern: "solid", ears: "floppy", muzzle: "medium" } },
  { id: "german-shepherd", name: "German Shepherd", species: "dog", size: "large", typicalKg: [22, 40], aliases: ["alsatian", "gsd"], look: { coat: ["#2B2422", "#B9783F"], pattern: "bicolour", ears: "upright", muzzle: "long" } },
  { id: "staffie", name: "Staffordshire Bull Terrier", species: "dog", size: "medium", typicalKg: [11, 17], aliases: ["staffie", "staffy", "staffordshire"], look: { coat: ["#6E4B36", "#F2EDE6"], pattern: "bicolour", ears: "semi", muzzle: "short" } },
  { id: "jack-russell", name: "Jack Russell Terrier", species: "dog", size: "small", typicalKg: [5, 8], aliases: ["jack russell", "jrt"], look: { coat: ["#F4F1EC", "#A86A3A"], pattern: "spots", ears: "semi", muzzle: "medium" } },
  { id: "shih-tzu", name: "Shih Tzu", species: "dog", size: "toy", typicalKg: [4, 8], look: { coat: ["#C9B293", "#F4F1EC"], pattern: "bicolour", ears: "floppy", muzzle: "short" } },
  { id: "pug", name: "Pug", species: "dog", size: "small", typicalKg: [6, 9], look: { coat: ["#D8C7A0", "#221F1E"], pattern: "bicolour", ears: "floppy", muzzle: "short" } },
  { id: "cavalier", name: "Cavalier King Charles Spaniel", species: "dog", size: "small", typicalKg: [5, 9], aliases: ["cavalier", "king charles"], look: { coat: ["#F4F1EC", "#A3542A"], pattern: "bicolour", ears: "floppy", muzzle: "short" } },
  { id: "springer", name: "English Springer Spaniel", species: "dog", size: "medium", typicalKg: [18, 25], aliases: ["springer"], look: { coat: ["#F4F1EC", "#5A3324"], pattern: "bicolour", ears: "floppy", muzzle: "medium" } },
  { id: "beagle", name: "Beagle", species: "dog", size: "medium", typicalKg: [9, 14], look: { coat: ["#B9783F", "#F4F1EC"], pattern: "bicolour", ears: "floppy", muzzle: "medium" } },
  { id: "mini-schnauzer", name: "Miniature Schnauzer", species: "dog", size: "small", typicalKg: [5, 9], aliases: ["schnauzer"], look: { coat: ["#8A8A88", "#E2E0DC"], pattern: "bicolour", ears: "semi", muzzle: "medium" } },
  { id: "bichon", name: "Bichon Frise", species: "dog", size: "toy", typicalKg: [3, 6], aliases: ["bichon"], look: { coat: ["#F7F4EE"], pattern: "solid", ears: "floppy", muzzle: "short" } },
  { id: "border-terrier", name: "Border Terrier", species: "dog", size: "small", typicalKg: [5, 7], look: { coat: ["#9C7650"], pattern: "solid", ears: "semi", muzzle: "medium" } },
  { id: "yorkie", name: "Yorkshire Terrier", species: "dog", size: "toy", typicalKg: [2, 4], aliases: ["yorkie"], look: { coat: ["#3D3A3A", "#C99A5B"], pattern: "bicolour", ears: "upright", muzzle: "medium" } },
  { id: "chihuahua", name: "Chihuahua", species: "dog", size: "toy", typicalKg: [1.5, 3], look: { coat: ["#D9B98A"], pattern: "solid", ears: "upright", muzzle: "short" } },
  { id: "labradoodle", name: "Labradoodle", species: "dog", size: "large", typicalKg: [20, 30], aliases: ["doodle"], look: { coat: ["#D9B98A"], pattern: "solid", ears: "floppy", muzzle: "medium" } },
  { id: "westie", name: "West Highland White Terrier", species: "dog", size: "small", typicalKg: [6, 10], aliases: ["westie"], look: { coat: ["#F7F4EE"], pattern: "solid", ears: "upright", muzzle: "medium" } },
  { id: "english-bulldog", name: "English Bulldog", species: "dog", size: "medium", typicalKg: [18, 25], aliases: ["british bulldog", "bulldog"], look: { coat: ["#F4F1EC", "#B9783F"], pattern: "bicolour", ears: "semi", muzzle: "short" } },
  { id: "boxer", name: "Boxer", species: "dog", size: "large", typicalKg: [25, 32], look: { coat: ["#B06A35", "#F4F1EC"], pattern: "bicolour", ears: "semi", muzzle: "short" } },
  { id: "whippet", name: "Whippet", species: "dog", size: "medium", typicalKg: [10, 15], look: { coat: ["#C7AE8F", "#F4F1EC"], pattern: "bicolour", ears: "semi", muzzle: "long" } },
  { id: "greyhound", name: "Greyhound", species: "dog", size: "large", typicalKg: [25, 35], look: { coat: ["#5E5A57"], pattern: "solid", ears: "semi", muzzle: "long" } },
  { id: "husky", name: "Siberian Husky", species: "dog", size: "large", typicalKg: [16, 27], aliases: ["husky"], look: { coat: ["#5D6168", "#F4F1EC"], pattern: "bicolour", ears: "upright", muzzle: "medium" } },
  { id: "rottweiler", name: "Rottweiler", species: "dog", size: "giant", typicalKg: [35, 60], aliases: ["rottie"], look: { coat: ["#1E1B1A", "#A9622F"], pattern: "bicolour", ears: "floppy", muzzle: "medium" } },
  { id: "great-dane", name: "Great Dane", species: "dog", size: "giant", typicalKg: [45, 80], aliases: ["dane"], look: { coat: ["#B48A5E"], pattern: "solid", ears: "floppy", muzzle: "long" } },
  // Cats
  { id: "dsh", name: "Domestic Shorthair", species: "cat", size: "small", typicalKg: [3.5, 5.5], aliases: ["moggy", "moggie", "shorthair", "tabby"], look: { coat: ["#9A8266"], pattern: "tabby", ears: "upright", muzzle: "medium" } },
  { id: "dlh", name: "Domestic Longhair", species: "cat", size: "small", typicalKg: [3.5, 6], aliases: ["longhair"], look: { coat: ["#8E8A86", "#F4F1EC"], pattern: "bicolour", ears: "upright", muzzle: "medium" } },
  { id: "bsh", name: "British Shorthair", species: "cat", size: "small", typicalKg: [4, 8], aliases: ["british blue"], look: { coat: ["#8E9196"], pattern: "solid", ears: "upright", muzzle: "short" } },
  { id: "ragdoll", name: "Ragdoll", species: "cat", size: "small", typicalKg: [4.5, 9], look: { coat: ["#EDE6DA", "#7A6656"], pattern: "bicolour", ears: "upright", muzzle: "medium" } },
  { id: "maine-coon", name: "Maine Coon", species: "cat", size: "medium", typicalKg: [5, 10], look: { coat: ["#8A6A4C"], pattern: "tabby", ears: "upright", muzzle: "medium" } },
  { id: "bengal", name: "Bengal", species: "cat", size: "small", typicalKg: [3.5, 7], look: { coat: ["#C99A5B", "#3A2A22"], pattern: "spots", ears: "upright", muzzle: "medium" } },
  { id: "siamese", name: "Siamese", species: "cat", size: "small", typicalKg: [3, 5.5], look: { coat: ["#EFE4D2", "#4B3A30"], pattern: "bicolour", ears: "upright", muzzle: "long" } },
  { id: "persian", name: "Persian", species: "cat", size: "small", typicalKg: [3, 6], look: { coat: ["#F2EDE6"], pattern: "solid", ears: "upright", muzzle: "short" } },
  { id: "sphynx", name: "Sphynx", species: "cat", size: "small", typicalKg: [3, 5], look: { coat: ["#D8B7A6"], pattern: "solid", ears: "upright", muzzle: "medium" } },
  // Rabbits
  { id: "lionhead", name: "Lionhead", species: "rabbit", size: "toy", typicalKg: [1.2, 1.7], look: { coat: ["#C9B293"], pattern: "solid", ears: "upright", muzzle: "short" } },
  { id: "netherland-dwarf", name: "Netherland Dwarf", species: "rabbit", size: "toy", typicalKg: [0.9, 1.3], look: { coat: ["#8A6A4C"], pattern: "solid", ears: "upright", muzzle: "short" } },
  { id: "holland-lop", name: "Holland Lop", species: "rabbit", size: "toy", typicalKg: [1.3, 1.8], look: { coat: ["#B9824D", "#F4F1EC"], pattern: "bicolour", ears: "floppy", muzzle: "short" } },
  { id: "mini-lop", name: "Mini Lop", species: "rabbit", size: "small", typicalKg: [1.5, 2.5], look: { coat: ["#9C7650", "#F4F1EC"], pattern: "bicolour", ears: "floppy", muzzle: "short" } },
  { id: "rex", name: "Rex", species: "rabbit", size: "small", typicalKg: [3, 4.5], look: { coat: ["#6E5A4A"], pattern: "solid", ears: "upright", muzzle: "short" } },
  // Horses and ponies
  { id: "cob", name: "Cob", species: "horse", size: "giant", typicalKg: [450, 650], look: { coat: ["#3A2A22", "#F4F1EC"], pattern: "bicolour", ears: "upright", muzzle: "long" } },
  { id: "thoroughbred", name: "Thoroughbred", species: "horse", size: "giant", typicalKg: [450, 550], look: { coat: ["#7A4A2A"], pattern: "solid", ears: "upright", muzzle: "long" } },
  { id: "warmblood", name: "Warmblood", species: "horse", size: "giant", typicalKg: [550, 700], look: { coat: ["#5A3A26"], pattern: "solid", ears: "upright", muzzle: "long" } },
  { id: "welsh", name: "Welsh Pony", species: "horse", size: "large", typicalKg: [200, 350], aliases: ["welsh cob", "welsh section"], look: { coat: ["#B8B3AC"], pattern: "solid", ears: "upright", muzzle: "long" } },
  { id: "shetland", name: "Shetland Pony", species: "horse", size: "medium", typicalKg: [150, 200], aliases: ["shetland"], look: { coat: ["#6E4B36"], pattern: "solid", ears: "upright", muzzle: "medium" } },
  { id: "arab", name: "Arab", species: "horse", size: "giant", typicalKg: [380, 450], aliases: ["arabian"], look: { coat: ["#D8D2C8"], pattern: "solid", ears: "upright", muzzle: "long" } },
];

/** Typical adult weight by size class, used when the breed is mixed or unknown. */
export const SIZE_KG: Record<Species, Record<SizeClass, [number, number]>> = {
  dog: { toy: [2, 5], small: [5, 10], medium: [10, 25], large: [25, 45], giant: [45, 80] },
  cat: { toy: [2.5, 3.5], small: [3.5, 5.5], medium: [5, 8], large: [6, 9], giant: [7, 11] },
  rabbit: { toy: [1, 1.8], small: [1.8, 3], medium: [3, 5], large: [5, 7], giant: [6, 9] },
  horse: { toy: [100, 150], small: [150, 250], medium: [250, 400], large: [400, 550], giant: [500, 750] },
  other: { toy: [0.1, 1], small: [1, 5], medium: [5, 15], large: [15, 40], giant: [40, 80] },
};

/** Sensible starting age for each life stage the photo suggests. */
export const AGE_FOR_STAGE: Record<Species, Record<(typeof AGE_GUESSES)[number], number>> = {
  dog: { puppy: 1, adult: 4, senior: 10 },
  cat: { puppy: 1, adult: 5, senior: 13 },
  rabbit: { puppy: 1, adult: 3, senior: 7 },
  horse: { puppy: 2, adult: 10, senior: 20 },
  other: { puppy: 1, adult: 3, senior: 8 },
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

export function breedsFor(species: Species) {
  return BREEDS.filter((b) => b.species === species);
}

export function findBreed(name: string | undefined, species?: Species): Breed | undefined {
  if (!name) return undefined;
  const n = norm(name);
  if (!n) return undefined;
  const pool = species ? breedsFor(species) : BREEDS;
  return (
    pool.find((b) => norm(b.name) === n) ??
    pool.find((b) => b.aliases?.some((a) => norm(a) === n)) ??
    pool.find((b) => n.includes(norm(b.name)) || norm(b.name).includes(n)) ??
    pool.find((b) => b.aliases?.some((a) => n.includes(norm(a))))
  );
}

/** Midpoint of a weight range, rounded sensibly for the scale. */
export function midKg([lo, hi]: [number, number]) {
  const m = (lo + hi) / 2;
  return m >= 100 ? Math.round(m / 10) * 10 : m >= 10 ? Math.round(m) : Math.round(m * 2) / 2;
}
