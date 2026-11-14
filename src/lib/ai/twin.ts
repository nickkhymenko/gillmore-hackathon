import { Type, type Schema } from "@google/genai";
import {
  AGE_GUESSES,
  BODY_CONDITIONS,
  COAT_PATTERNS,
  EAR_SHAPES,
  MUZZLES,
  SIZE_CLASSES,
  SPECIES,
  TwinProfileSchema,
  type Species,
  type TwinInput,
  type TwinProfile,
  type TwinResult,
} from "../types";
import { generateJson } from "./gemini";

export const TWIN_TIMEOUT_MS = 10_000;

const SYSTEM = `You look at one photo of a pet and describe its visible appearance so an app can draw a simple illustrated avatar.
Rules:
- Describe appearance only. This is NOT a health assessment and NOT a diagnosis.
- petVisible: false if there is no dog, cat, rabbit or horse clearly visible. Then give your best neutral defaults.
- species: what you see. If the owner gave a species hint and the photo is ambiguous, trust the hint.
- breedGuess: the most likely breed or cross in plain British English (for example "Labrador Retriever", "Domestic Shorthair", "Cockapoo", "Mixed breed"). breedConfidence is 0 to 1 and must be honest: mixed or unclear animals get a low number.
- sizeClass for the adult size of that breed: toy, small, medium, large or giant. Cats and rabbits are usually "small"; horses "giant".
- coatColours: 1 to 3 hex colours (#RRGGBB) of the ANIMAL'S COAT ONLY, most dominant first. Ignore background, collar, bedding and lighting tint.
- coatPattern: solid, bicolour, tabby, spots or tuxedo. Pick the closest.
- earShape: upright, floppy or semi (upright with folded tips).
- muzzle: short (flat-faced), medium or long.
- bodyCondition: under, ideal or over ONLY if the body is clearly visible, otherwise "unknown". It is a visual impression.
- ageGuess: puppy (any young animal), adult or senior.
- notes: one short friendly sentence about what you can see. No medical claims. No dashes.`;

const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    petVisible: { type: Type.BOOLEAN },
    species: { type: Type.STRING, enum: [...SPECIES] },
    breedGuess: { type: Type.STRING },
    breedConfidence: { type: Type.NUMBER },
    sizeClass: { type: Type.STRING, enum: [...SIZE_CLASSES] },
    coatColours: { type: Type.ARRAY, items: { type: Type.STRING } },
    coatPattern: { type: Type.STRING, enum: [...COAT_PATTERNS] },
    earShape: { type: Type.STRING, enum: [...EAR_SHAPES] },
    muzzle: { type: Type.STRING, enum: [...MUZZLES] },
    bodyCondition: { type: Type.STRING, enum: [...BODY_CONDITIONS] },
    ageGuess: { type: Type.STRING, enum: [...AGE_GUESSES] },
    notes: { type: Type.STRING },
  },
  required: [
    "petVisible", "species", "breedGuess", "breedConfidence", "sizeClass", "coatColours",
    "coatPattern", "earShape", "muzzle", "bodyCondition", "ageGuess", "notes",
  ],
};

const SPECIES_DEFAULTS: Record<Species, Pick<TwinProfile, "sizeClass" | "earShape" | "muzzle">> = {
  dog: { sizeClass: "medium", earShape: "floppy", muzzle: "medium" },
  cat: { sizeClass: "small", earShape: "upright", muzzle: "short" },
  rabbit: { sizeClass: "small", earShape: "upright", muzzle: "short" },
  horse: { sizeClass: "giant", earShape: "upright", muzzle: "long" },
  other: { sizeClass: "small", earShape: "upright", muzzle: "medium" },
};

/** Neutral profile used when the AI is off, slow or unsure. The UI asks the owner to pick instead. */
export function fallbackTwin(species: Species = "dog"): TwinProfile {
  return {
    species,
    breedGuess: "",
    breedConfidence: 0,
    ...SPECIES_DEFAULTS[species],
    coatColours: [],
    coatPattern: "solid",
    bodyCondition: "unknown",
    ageGuess: "adult",
    notes: "",
  };
}

export async function geminiTwin(input: TwinInput): Promise<TwinResult> {
  const raw = (await generateJson({
    system: SYSTEM,
    parts: [
      { text: `Pet name: ${input.name || "unknown"}. Owner's species hint: ${input.species ?? "none"}.` },
      { inlineData: { mimeType: input.photo.mimeType, data: input.photo.dataBase64 } },
    ],
    schema,
    timeoutMs: TWIN_TIMEOUT_MS,
  })) as Record<string, unknown>;

  // Tolerate small model slips instead of failing the whole request.
  const colours = Array.isArray(raw.coatColours) ? raw.coatColours : [];
  const profile = TwinProfileSchema.parse({
    ...raw,
    breedGuess: String(raw.breedGuess ?? "").slice(0, 60),
    breedConfidence: Math.min(1, Math.max(0, Number(raw.breedConfidence) || 0)),
    coatColours: colours
      .map((c) => String(c).trim())
      .map((c) => (c.startsWith("#") ? c : `#${c}`))
      .filter((c) => /^#[0-9a-fA-F]{6}$/.test(c))
      .slice(0, 3),
    notes: String(raw.notes ?? "").replace(/[–—]/g, ",").slice(0, 300),
  });
  const petVisible = raw.petVisible !== false;
  return { profile: petVisible ? profile : { ...profile, breedGuess: "", breedConfidence: 0, bodyCondition: "unknown" }, source: "gemini", petVisible };
}
