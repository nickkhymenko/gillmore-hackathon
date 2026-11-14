import { z } from "zod";

// ---------- Input: one weekly 60-second check-in ----------

export const SPECIES = ["dog", "cat", "rabbit", "horse", "other"] as const;
export const SIZE_CLASSES = ["toy", "small", "medium", "large", "giant"] as const;
export type Species = (typeof SPECIES)[number];
export type SizeClass = (typeof SIZE_CLASSES)[number];

export const ACTIVITY_LEVELS = ["low", "moderate", "high"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const PetSchema = z.object({
  name: z.string().min(1).max(40),
  species: z.enum(SPECIES),
  breed: z.string().max(60).default(""),
  ageYears: z.number().min(0).max(40),
  weightKg: z.number().min(0).max(1200).optional(), // horses weigh 200 to 1,000 kg
  // Optional onboarding details (additive: older clients can omit them).
  sizeClass: z.enum(SIZE_CLASSES).optional(),
  neutered: z.boolean().optional(),
  activity: z.enum(ACTIVITY_LEVELS).optional(),
});

export const AnswersSchema = z.object({
  appetite: z.enum(["normal", "increased", "reduced", "none"]),
  energy: z.enum(["normal", "lower", "very_low"]),
  water: z.enum(["normal", "more", "less"]),
  stool: z.enum(["normal", "soft", "diarrhoea", "blood", "none"]),
  vomiting: z.enum(["none", "once", "repeated"]),
  mobility: z.enum(["normal", "stiff", "limping", "unable"]),
  skin: z.enum(["normal", "itchy", "lump", "wound"]),
  breathing: z.enum(["normal", "fast", "laboured"]),
  urination: z.enum(["normal", "more", "straining", "none"]),
});

export const CheckinInputSchema = z.object({
  pet: PetSchema,
  answers: AnswersSchema,
  notes: z.string().max(1000).default(""),
  photo: z
    .object({
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      dataBase64: z.string().max(2_000_000),
    })
    .optional(),
  // Previous health scores for this pet (oldest first). Enables "vs. own baseline" detection.
  history: z.array(z.number().min(0).max(100)).max(52).default([]),
  streakWeeks: z.number().int().min(0).max(520).default(0),
});

export type Pet = z.infer<typeof PetSchema>;
export type Answers = z.infer<typeof AnswersSchema>;
export type CheckinInput = z.infer<typeof CheckinInputSchema>;

// ---------- Output: the assessment ----------

export const STATUS = ["green", "amber", "red"] as const;
export const ACTIONS = ["keep_monitoring", "online_consult", "vet_within_48h", "emergency_now"] as const;

export const AssessmentSchema = z.object({
  status: z.enum(STATUS),
  healthScore: z.number().min(0).max(100),
  headline: z.string(),
  ownerMessage: z.string(),
  flags: z.array(
    z.object({
      area: z.string(),
      observation: z.string(),
      whyItMatters: z.string(),
      urgency: z.enum(["low", "medium", "high"]),
    }),
  ),
  nextStep: z.object({
    action: z.enum(ACTIONS),
    rationale: z.string(),
  }),
  preventionTips: z.array(z.string()),
  vetBrief: z.string(),
  photoObservations: z.string().optional(),
});

export type Assessment = z.infer<typeof AssessmentSchema>;

export type CheckinResult = Assessment & {
  source: "gemini" | "rules";
  safetyOverride: boolean;
  safetyReasons: string[];
  trend: { baseline: number | null; delta: number | null; note: string | null };
  creditsEarned: number;
  disclaimer: string;
  createdAt: string;
};

export const ACTION_LABEL: Record<(typeof ACTIONS)[number], string> = {
  keep_monitoring: "Keep monitoring at home",
  online_consult: "Book an online vet consult",
  vet_within_48h: "See a vet within 48 hours",
  emergency_now: "Contact an emergency vet now",
};

// ---------- Pet Twin: what the photo tells us (POST /api/twin) ----------

export const COAT_PATTERNS = ["solid", "bicolour", "tabby", "spots", "tuxedo"] as const;
export const EAR_SHAPES = ["upright", "floppy", "semi"] as const;
export const MUZZLES = ["short", "medium", "long"] as const;
export const BODY_CONDITIONS = ["under", "ideal", "over", "unknown"] as const;
export const AGE_GUESSES = ["puppy", "adult", "senior"] as const;

const PhotoSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  dataBase64: z.string().min(1).max(2_000_000),
});

export const TwinInputSchema = z.object({
  name: z.string().max(40).default(""),
  species: z.enum(SPECIES).optional(), // owner's hint, if they already told us
  photo: PhotoSchema,
});

export const TwinProfileSchema = z.object({
  species: z.enum(SPECIES),
  breedGuess: z.string().max(60),
  breedConfidence: z.number().min(0).max(1),
  sizeClass: z.enum(SIZE_CLASSES),
  coatColours: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(4),
  coatPattern: z.enum(COAT_PATTERNS),
  earShape: z.enum(EAR_SHAPES),
  muzzle: z.enum(MUZZLES),
  bodyCondition: z.enum(BODY_CONDITIONS),
  ageGuess: z.enum(AGE_GUESSES),
  notes: z.string().max(300),
});

export type TwinInput = z.infer<typeof TwinInputSchema>;
export type TwinProfile = z.infer<typeof TwinProfileSchema>;

export type TwinResult = {
  profile: TwinProfile;
  source: "gemini" | "fallback";
  /** False when the model could not see an animal: the UI then asks the owner to pick. */
  petVisible: boolean;
};

/** Granular, revocable consent (UK GDPR). All off until the owner turns them on. */
export type Consent = { vet: boolean; insurer: boolean; research: boolean; updatedAt: string | null };
export const NO_CONSENT: Consent = { vet: false, insurer: false, research: false, updatedAt: null };

/** Owner-facing wording. Never a diagnosis: a visual impression to confirm with a vet. */
export const BODY_CONDITION_LABEL: Record<(typeof BODY_CONDITIONS)[number], string | null> = {
  under: "looks lean",
  ideal: "looks ideal",
  over: "looks a bit heavy",
  unknown: null,
};

export const DISCLAIMER =
  "This is triage and monitoring support, not a diagnosis. Only a registered veterinary surgeon can diagnose or prescribe. If you are worried, contact your vet.";
