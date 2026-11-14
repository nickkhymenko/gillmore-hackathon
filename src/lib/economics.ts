/**
 * Shared-savings model for an insurer (or vet group) partner.
 * Base figures from the Gillmore Hackathon 2026 Participant Reading Guide (UK, 2024):
 *   claims paid  = GBP 1.23bn, average claim = GBP 685, ~1.8m claims/yr, ~4.6m policies.
 * Everything else is an explicit, adjustable ASSUMPTION. Say so in the pitch.
 */
export const UK = {
  avgClaim: 685,
  claimsPerYear: 1_800_000,
  policies: 4_600_000,
  annualSpendPerPet: 1900,
  vetPriceRise10y: 0.75,
};

export const CLAIM_FREQUENCY = UK.claimsPerYear / UK.policies; // ~0.39 claims per policy per year

export type EconomicsInput = {
  policies: number; // partner's book size
  engagementRate: number; // share of policyholders doing weekly check-ins (0..1)
  feePerPetMonth: number; // GBP charged to partner per engaged pet per month
  claimCostReduction: number; // reduction in claim cost among engaged pets (0..1), from earlier detection
  creditsPerPetYear: number; // GBP of Prevention Credits funded per engaged pet per year
};

export const DEFAULT_ECONOMICS: EconomicsInput = {
  policies: 100_000,
  engagementRate: 0.3,
  feePerPetMonth: 1,
  claimCostReduction: 0.1,
  creditsPerPetYear: 6,
};

export function computeEconomics(i: EconomicsInput) {
  const engagedPets = Math.round(i.policies * i.engagementRate);
  const expectedClaimCostPerPet = CLAIM_FREQUENCY * UK.avgClaim; // ~GBP 268
  const engagedClaimCost = engagedPets * expectedClaimCostPerPet;
  const grossSavings = engagedClaimCost * i.claimCostReduction;
  const platformFees = engagedPets * i.feePerPetMonth * 12;
  const creditsCost = engagedPets * i.creditsPerPetYear;
  const totalCost = platformFees + creditsCost;
  const netBenefit = grossSavings - totalCost;
  const roi = totalCost > 0 ? grossSavings / totalCost : 0;
  const breakEvenReduction = engagedClaimCost > 0 ? totalCost / engagedClaimCost : 0;

  return {
    engagedPets,
    expectedClaimCostPerPet: Math.round(expectedClaimCostPerPet),
    engagedClaimCost: Math.round(engagedClaimCost),
    grossSavings: Math.round(grossSavings),
    platformFees: Math.round(platformFees),
    creditsCost: Math.round(creditsCost),
    netBenefit: Math.round(netBenefit),
    roi: Number(roi.toFixed(2)),
    breakEvenReduction: Number(breakEvenReduction.toFixed(4)),
  };
}

export const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
