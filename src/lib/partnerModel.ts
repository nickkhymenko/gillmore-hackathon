import { CLAIM_FREQUENCY, UK } from "./economics";

/**
 * Partner (insurer + underwriter) model. Base figures from the Gillmore reading guide; everything else is an
 * adjustable ASSUMPTION, labelled as such in the UI. Defaults reproduce docs/06-PS1-PLAN.md section 5.
 */
export const CLAIM_COST_PER_POLICY = CLAIM_FREQUENCY * UK.avgClaim; // about £268

export type PricingModel = "perPolicy" | "perMember" | "perClaimAvoided" | "hybrid";

export const PRICING: Record<PricingModel, { label: string; detail: string }> = {
  perPolicy: { label: "Per policy", detail: "£0.40 a month for every policy. Simple to budget; pays for owners who never engage." },
  perMember: { label: "Per engaged member", detail: "£1.25 a month for each member who checks in. Aligned with use." },
  perClaimAvoided: { label: "Per claim avoided", detail: "35% of measured claims savings against a control group. Pure outcome, slower cash." },
  hybrid: { label: "Hybrid (recommended)", detail: "£1.25 per engaged member a month plus 20% of savings above an agreed baseline." },
};

export type BusinessInput = {
  policies: number;
  engagement: number; // share of policies engaged (0..1)
  claimsReduction: number; // among engaged (0..1)
  avgPremium: number; // £ a year
  avgDiscount: number; // share of premium (0..1)
  retentionUplift: number; // points of the book retained (0..1)
  margin: number; // contribution margin on a retained policy (0..1)
  pricing: PricingModel;
};

export const DEFAULT_BUSINESS: BusinessInput = {
  policies: 100_000,
  engagement: 0.3,
  claimsReduction: 0.1,
  avgPremium: 300,
  avgDiscount: 0.03,
  retentionUplift: 0.03,
  margin: 0.3,
  pricing: "perMember",
};

export function platformFee(i: BusinessInput, engaged: number, claimsAvoided: number) {
  switch (i.pricing) {
    case "perPolicy":
      return i.policies * 0.4 * 12;
    case "perMember":
      return engaged * 1.25 * 12;
    case "perClaimAvoided":
      return claimsAvoided * 0.35;
    case "hybrid":
      return engaged * 1.25 * 12 + claimsAvoided * 0.2;
  }
}

export function businessCase(i: BusinessInput) {
  const engaged = Math.round(i.policies * i.engagement);
  const engagedClaims = engaged * Math.round(CLAIM_COST_PER_POLICY);
  const claimsAvoided = engagedClaims * i.claimsReduction;
  const retained = Math.round(i.policies * i.retentionUplift);
  const retentionValue = retained * i.avgPremium * i.margin;
  const fee = platformFee(i, engaged, claimsAvoided);
  const discounts = engaged * i.avgPremium * i.avgDiscount;
  const net = claimsAvoided + retentionValue - fee - discounts;
  const fixedCost = (i.pricing === "perClaimAvoided" ? 0 : i.pricing === "hybrid" ? engaged * 1.25 * 12 : fee) + discounts;
  const breakEven = engagedClaims ? fixedCost / engagedClaims : 0;
  const breakEvenWithRetention = engagedClaims ? Math.max(0, fixedCost - retentionValue) / engagedClaims : 0;
  // Underwriter view: loss ratio on the whole book, before and after.
  const premiumIncome = i.policies * i.avgPremium;
  const claimsBefore = i.policies * CLAIM_COST_PER_POLICY;
  const lossBefore = claimsBefore / premiumIncome;
  const lossAfter = (claimsBefore - claimsAvoided) / (premiumIncome - discounts);
  return { engaged, engagedClaims, claimsAvoided, retained, retentionValue, fee, discounts, net, breakEven, breakEvenWithRetention, lossBefore, lossAfter, perMemberBefore: CLAIM_COST_PER_POLICY, perMemberAfter: CLAIM_COST_PER_POLICY * (1 - i.claimsReduction) };
}

/** Illustrative weekly operations for the insurer dashboard, scaled from the business case (synthetic). */
export function insurerKpis(i: BusinessInput) {
  const b = businessCase(i);
  return {
    members: b.engaged,
    weeklyActive: 0.72,
    avgStreak: 9.4,
    amberThisWeek: Math.round(b.engaged * 0.018),
    consultsBooked: Math.round(b.engaged * 0.018 * 0.45),
    claimsAvoided: b.claimsAvoided,
    retentionGap: i.retentionUplift,
    discountsPaid: b.discounts,
  };
}

// ---------- Black Box ----------

export type BlackBoxInput = {
  policies: number;
  adoption: number; // share of policies with a Black Box (0..1)
  hitRate: number; // share of members hitting their target in most weeks (0..1)
  extraReduction: number; // extra claims reduction for Black Box members (0..1), ASSUMPTION
  discount: number; // average discount paid to members hitting targets (0..1)
  retentionUplift: number; // extra points retained among Black Box members (0..1)
  avgPremium: number;
  collarCost: number; // £ to make, illustrative 40 to 60
  offer: "free2yr" | "bundled";
};

export const DEFAULT_BLACKBOX: BlackBoxInput = {
  policies: 100_000,
  adoption: 0.15,
  hitRate: 0.65,
  extraReduction: 0.12,
  discount: 0.075,
  retentionUplift: 0.06,
  avgPremium: 300,
  collarCost: 50,
  offer: "free2yr",
};

export function blackBoxCase(i: BlackBoxInput) {
  const members = Math.round(i.policies * i.adoption);
  const hitting = Math.round(members * i.hitRate);
  const flags = Math.round(members * 0.08); // sustained activity changes a year, ASSUMPTION
  const consults = Math.round(flags * 0.5);
  const claimsAvoided = members * CLAIM_COST_PER_POLICY * i.extraReduction;
  const discounts = hitting * i.avgPremium * i.discount;
  const retentionValue = members * i.retentionUplift * i.avgPremium * 0.3;
  // Hardware: free with a 2-year policy (insurer pays, spread over 2 years), or £5 a month bundled (owner pays over 12 months).
  const hardwareYear = i.offer === "free2yr" ? (members * i.collarCost) / 2 : 0;
  const bundleIncome = i.offer === "bundled" ? members * 5 * 12 - members * i.collarCost : 0;
  const net = claimsAvoided + retentionValue - discounts - hardwareYear + bundleIncome;
  const monthlyPerMember = members ? (claimsAvoided + retentionValue - discounts) / members / 12 : 0;
  const paybackMonths = i.offer === "bundled" ? Math.ceil(i.collarCost / 5) : monthlyPerMember > 0 ? Math.ceil(i.collarCost / monthlyPerMember) : Infinity;
  return { members, hitting, flags, consults, claimsAvoided, discounts, retentionValue, hardwareYear, bundleIncome, net, paybackMonths };
}
