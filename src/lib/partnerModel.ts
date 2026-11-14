import { CLAIM_FREQUENCY, UK } from "./economics";

/**
 * The insurer and underwriter business case on /partner. It mirrors the "Insurer Case" sheet of
 * finance/petra-financial-model.xlsx (Base scenario) and docs/15-MARKET-FINANCIALS-PITCH.md section 5:
 * 100,000 policies give about £965k of claims avoided, about £230k net, a 1.24x return and break-even at about 8.6%.
 * Fixed inputs are sourced (ABI) or Petra's proposed pricing; the four levers on the page are assumptions to test in a pilot.
 */
export const CLAIM_COST_PER_POLICY = CLAIM_FREQUENCY * UK.avgClaim; // about £268 a policy a year

/** Fixed inputs from the model's Assumptions sheet. */
export const FIXED = {
  avgPremium: 389, // £ a year, ABI 2024
  retentionUplift: 0.05, // points among engaged members (Base)
  margin: 0.2, // insurer contribution margin on retained premium
  cac: 80, // £ insurer acquisition cost avoided per retained policy
  feePerMember: 1, // £ per engaged member per month
  feePerPolicy: 0.3, // £ per policy per month: the per-member fee spread over a 30%-engaged book
  outcomeShare: 0.15, // share of measured claims savings
};

export type PricingModel = "perPolicy" | "perMember" | "perClaimAvoided" | "hybrid";

export const PRICING: Record<PricingModel, { label: string; price: string; pro: string; con: string }> = {
  perPolicy: { label: "Per policy", price: "£0.30 a policy a month", pro: "Simple to budget.", con: "Pays for owners who never engage." },
  perMember: { label: "Per engaged member", price: "£1 per member a month", pro: "The insurer pays only when owners use it.", con: "Petra carries none of the outcome risk." },
  perClaimAvoided: { label: "Per claim avoided", price: "15% of measured savings", pro: "Pure outcome: no savings, no fee.", con: "Slow cash, and the counterfactual needs a control group." },
  hybrid: { label: "Hybrid", price: "£1 per member a month + 15% of measured savings", pro: "Paid for use, rewarded for results.", con: "Needs an agreed baseline, reconciled each year." },
};

export const RECOMMENDED: PricingModel = "hybrid";

export type BusinessInput = {
  policies: number;
  engagement: number; // share of policies engaged weekly (0..1)
  claimsReduction: number; // claims cost reduction among engaged pets (0..1)
  avgDiscount: number; // average discount actually paid, share of premium (0..1)
  pricing: PricingModel;
};

export const DEFAULT_BUSINESS: BusinessInput = {
  policies: 100_000,
  engagement: 0.3,
  claimsReduction: 0.12,
  avgDiscount: 0.04,
  pricing: RECOMMENDED,
};

/** Petra's fixed fee a year (not linked to outcomes) and its outcome share (0..1) under each pricing model. */
function pricingTerms(i: BusinessInput, engaged: number) {
  switch (i.pricing) {
    case "perPolicy":
      return { fixed: i.policies * FIXED.feePerPolicy * 12, share: 0 };
    case "perMember":
      return { fixed: engaged * FIXED.feePerMember * 12, share: 0 };
    case "perClaimAvoided":
      return { fixed: 0, share: FIXED.outcomeShare };
    case "hybrid":
      return { fixed: engaged * FIXED.feePerMember * 12, share: FIXED.outcomeShare };
  }
}

export function businessCase(i: BusinessInput) {
  const engaged = Math.round(i.policies * i.engagement);
  const engagedClaims = engaged * CLAIM_COST_PER_POLICY;
  const claimsAvoided = engagedClaims * i.claimsReduction;
  const retentionValue = engaged * FIXED.retentionUplift * (FIXED.avgPremium * FIXED.margin + FIXED.cac);
  const { fixed, share } = pricingTerms(i, engaged);
  const outcomeFee = claimsAvoided * share;
  const fees = fixed + outcomeFee;
  const discounts = engaged * FIXED.avgPremium * i.avgDiscount;
  const benefit = claimsAvoided + retentionValue;
  const cost = fees + discounts;
  const net = benefit - cost;
  const returnOnCost = cost ? benefit / cost : 0;
  // The claims reduction at which net benefit is zero: avoided × (1 − share) = fixed fee + discounts − retention value.
  const breakEven = engagedClaims ? Math.max(0, fixed + discounts - retentionValue) / (engagedClaims * (1 - share)) : 0;
  const memberSaving = FIXED.avgPremium * i.avgDiscount;
  return { engaged, engagedClaims, claimsAvoided, retentionValue, fixedFee: fixed, outcomeFee, fees, discounts, benefit, cost, net, returnOnCost, breakEven, memberSaving };
}
