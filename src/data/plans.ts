/**
 * Synthetic insurers and illustrative plans for the demo. Not real companies or prices.
 * Prices scale from basePremium() in src/lib/discount.ts.
 */
export const INSURERS = [
  { id: "harbourline", name: "Harbourline", note: "Example insurer" },
  { id: "kestrel", name: "Kestrel Mutual", note: "Example insurer" },
  { id: "fernbank", name: "Fernbank", note: "Example insurer" },
] as const;

export type PlanId = "accident" | "time" | "lifetime";

export const PLANS: { id: PlanId; name: string; factor: number; summary: string; points: string[] }[] = [
  { id: "accident", name: "Accident only", factor: 0.32, summary: "For the unexpected: injuries, not illness.", points: ["Accidents and injuries", "No illness cover", "Lowest price"] },
  { id: "time", name: "Time-limited", factor: 0.72, summary: "Covers each new condition for 12 months.", points: ["Illness and injury", "Each condition covered for 12 months", "Good for younger pets"] },
  { id: "lifetime", name: "Lifetime", factor: 1.18, summary: "Ongoing conditions covered every year you renew.", points: ["Illness and injury", "Long-term conditions renew yearly", "Most complete cover"] },
];

/** Small insurer-to-insurer price variation so the choice feels real. */
export const INSURER_FACTOR: Record<(typeof INSURERS)[number]["id"], number> = { harbourline: 1, kestrel: 0.96, fernbank: 1.05 };
