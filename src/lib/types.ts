import { z } from "zod";

// ---------- Input: one weekly 60-second check-in ----------

export const PetSchema = z.object({
  name: z.string().min(1).max(40),
  species: z.enum(["dog", "cat", "rabbit", "other"]),
  breed: z.string().max(60).default(""),
  ageYears: z.number().min(0).max(30),
  weightKg: z.number().min(0).max(120).optional(),
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

export const DISCLAIMER =
  "This is triage and monitoring support, not a diagnosis. Only a registered veterinary surgeon can diagnose or prescribe. If you are worried, contact your vet.";
