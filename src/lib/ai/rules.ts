import type { Assessment, CheckinInput } from "../types";
import type { SafetyResult } from "../safety";

/**
 * Rules-only assessment. Used when no GEMINI_API_KEY is set, or the AI call fails or times out.
 * Guarantees the live demo never breaks on stage.
 */
const PENALTY: Record<string, Record<string, number>> = {
  appetite: { normal: 0, increased: 5, reduced: 10, none: 25 },
  energy: { normal: 0, lower: 10, very_low: 25 },
  water: { normal: 0, more: 10, less: 8 },
  stool: { normal: 0, soft: 5, diarrhoea: 15, blood: 25, none: 10 },
  vomiting: { none: 0, once: 5, repeated: 20 },
  mobility: { normal: 0, stiff: 8, limping: 15, unable: 35 },
  skin: { normal: 0, itchy: 6, lump: 12, wound: 12 },
  breathing: { normal: 0, fast: 15, laboured: 35 },
  urination: { normal: 0, more: 8, straining: 25, none: 30 },
};

const AREA: Record<string, string> = {
  appetite: "Appetite",
  energy: "Energy",
  water: "Thirst",
  stool: "Digestion",
  vomiting: "Digestion",
  mobility: "Mobility",
  skin: "Skin and coat",
  breathing: "Breathing",
  urination: "Urinary",
};

export function rulesAssessment(input: CheckinInput, safety: SafetyResult): Assessment {
  const { answers, pet } = input;
  let score = 100;
  const flags: Assessment["flags"] = [];

  for (const [key, value] of Object.entries(answers)) {
    const p = PENALTY[key]?.[value] ?? 0;
    score -= p;
    if (p > 0) {
      flags.push({
        area: AREA[key] ?? key,
        observation: `${AREA[key] ?? key}: ${value.replace("_", " ")}`,
        whyItMatters: "A change from normal can be an early sign worth tracking.",
        urgency: p >= 25 ? "high" : p >= 12 ? "medium" : "low",
      });
    }
  }
  score = Math.max(5, Math.min(100, score));

  const status = safety.minimumStatus !== "green" ? safety.minimumStatus : score < 70 ? "amber" : "green";
  const action =
    status === "red" ? (safety.emergency ? "emergency_now" : "vet_within_48h") : status === "amber" ? "online_consult" : "keep_monitoring";

  const tips =
    pet.species === "cat"
      ? ["Keep fresh water in several spots", "Monitor litter tray habits daily", "Book an annual dental and weight check"]
      : pet.species === "dog"
        ? ["Weigh monthly and keep a body-condition note", "Check paws, ears and teeth weekly", "Keep vaccinations and parasite control up to date"]
        : ["Keep a daily eating and droppings log", "Book an annual health check", "Provide species-appropriate enrichment"];

  return {
    status,
    healthScore: score,
    headline:
      status === "green" ? `${pet.name} looks on track this week` : status === "amber" ? `A few changes worth a vet's view for ${pet.name}` : `${pet.name} needs a vet now`,
    ownerMessage:
      status === "green"
        ? "Nothing concerning stands out. Keep up the weekly check-ins so we can spot changes early."
        : status === "amber"
          ? "Some answers are different from a typical healthy week. An online consult is a quick, low-cost way to get a vet's opinion before it becomes a bigger problem."
          : `Please contact a vet straight away. Reasons: ${safety.reasons.join("; ")}.`,
    flags,
    nextStep: {
      action,
      rationale: safety.reasons.length ? `Triggered by: ${safety.reasons.join("; ")}` : "Based on this week's answers.",
    },
    preventionTips: tips,
    vetBrief: [
      `Patient: ${pet.name}, ${pet.species}${pet.breed ? ` (${pet.breed})` : ""}, ${pet.ageYears}y${pet.weightKg ? `, ${pet.weightKg}kg` : ""}.`,
      `Owner-reported: ${Object.entries(answers)
        .filter(([, v]) => v !== "normal" && v !== "none")
        .map(([k, v]) => `${k}=${v}`)
        .join(", ") || "no abnormal answers"}.`,
      input.notes ? `Notes: "${input.notes}".` : "",
      safety.reasons.length ? `Safety rules fired: ${safety.reasons.join("; ")}.` : "",
      `Check-in score ${score}/100.`,
    ]
      .filter(Boolean)
      .join(" "),
  };
}
