import type { CheckinInput } from "./types";
import { STATUS } from "./types";

/**
 * Deterministic safety layer. Runs BEFORE and AFTER the AI.
 * The AI can escalate a case, but it can never downgrade below what these rules say.
 * This is our answer to "what if the AI is wrong?" in Q&A.
 */

type Level = (typeof STATUS)[number];

export type SafetyResult = { minimumStatus: Level; reasons: string[]; emergency: boolean };

const EMERGENCY_KEYWORDS: { pattern: RegExp; reason: string }[] = [
  { pattern: /collaps|faint/i, reason: "Collapse or fainting reported" },
  { pattern: /seizure|fit\b|convuls/i, reason: "Seizure reported" },
  { pattern: /not breathing|can'?t breathe|choking/i, reason: "Breathing emergency reported" },
  { pattern: /poison|chocolate|xylitol|grape|raisin|rat bait|antifreeze|ibuprofen|paracetamol/i, reason: "Possible toxin ingestion" },
  { pattern: /\blil(y|ies)\b/i, reason: "Lily exposure (highly toxic to cats)" },
  { pattern: /bloat|swollen (belly|stomach|abdomen)|retching/i, reason: "Possible bloat (GDV) signs" },
  { pattern: /hit by (a )?car|road accident|fell from/i, reason: "Trauma reported" },
  { pattern: /pale gums|blue gums|white gums/i, reason: "Abnormal gum colour" },
];

const RANK: Record<Level, number> = { green: 0, amber: 1, red: 2 };

export function maxStatus(a: Level, b: Level): Level {
  return RANK[a] >= RANK[b] ? a : b;
}

export function runSafetyRules(input: CheckinInput): SafetyResult {
  const { answers: a, pet, notes } = input;
  const red: string[] = [];
  const amber: string[] = [];

  if (a.breathing === "laboured") red.push("Laboured breathing");
  if (a.mobility === "unable") red.push("Unable to stand or walk");
  if (a.urination === "none" || a.urination === "straining") {
    // Straining or no urine is an emergency in male cats (urethral obstruction risk).
    if (pet.species === "cat") red.push("Cat straining or unable to urinate");
    else amber.push("Urination problems");
  }
  if (a.stool === "blood" && a.vomiting === "repeated") red.push("Bloody stool with repeated vomiting");
  if (a.energy === "very_low" && a.appetite === "none") red.push("Very low energy and not eating");

  if (a.appetite === "none" && pet.species === "cat") amber.push("Cat not eating (risk rises after 24 to 48h)");
  if (a.appetite === "none" && pet.species === "rabbit") red.push("Rabbit not eating (gut stasis risk)");
  if (a.vomiting === "repeated") amber.push("Repeated vomiting");
  if (a.stool === "blood") amber.push("Blood in stool");
  if (a.breathing === "fast") amber.push("Fast breathing at rest");
  if (a.skin === "lump") amber.push("New lump reported");
  if (a.water === "more" && pet.ageYears >= 7) amber.push("Increased thirst in an older pet");

  for (const k of EMERGENCY_KEYWORDS) if (k.pattern.test(notes)) red.push(k.reason);

  if (red.length) return { minimumStatus: "red", reasons: [...red, ...amber], emergency: true };
  if (amber.length) return { minimumStatus: "amber", reasons: amber, emergency: false };
  return { minimumStatus: "green", reasons: [], emergency: false };
}

/** Compare this pet against ITS OWN baseline, not a population average. */
export function computeTrend(history: number[], currentScore: number) {
  if (history.length < 2) return { baseline: null, delta: null, note: null };
  const recent = history.slice(-4);
  const baseline = Math.round(recent.reduce((s, x) => s + x, 0) / recent.length);
  const delta = currentScore - baseline;
  let note: string | null = null;
  if (delta <= -15) note = `Score is ${Math.abs(delta)} points below this pet's own recent baseline (${baseline}). Early drift worth a vet's eye.`;
  else if (delta <= -8) note = `Slight dip of ${Math.abs(delta)} points vs. baseline (${baseline}). Keep an eye on it.`;
  else if (delta >= 8) note = `Improving: ${delta} points above baseline (${baseline}).`;
  return { baseline, delta, note };
}

export function creditsFor(input: CheckinInput): number {
  let c = 10; // completed check-in
  if (input.photo) c += 5; // photo evidence
  if (input.streakWeeks >= 4) c += 10; // consistency bonus
  return c;
}
