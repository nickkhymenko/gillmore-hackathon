import type { NextRequest } from "next/server";
import { CLAIM_FREQUENCY, DEFAULT_ECONOMICS, UK, computeEconomics, type EconomicsInput } from "@/lib/economics";

/**
 * GET /api/economics?policies=100000&engagementRate=0.3&feePerPetMonth=1&claimCostReduction=0.1&creditsPerPetYear=6
 * Partner-facing ROI model (insurer / vet group). All params optional.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const num = (k: keyof EconomicsInput) => {
    const v = q.get(k);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_ECONOMICS[k];
  };
  // Rates are fractions: anything outside 0..1 is invalid, so use the default rather than clamping to 100%.
  const rate = (k: "engagementRate" | "claimCostReduction") => {
    const v = num(k);
    return v <= 1 ? v : DEFAULT_ECONOMICS[k];
  };
  const input: EconomicsInput = {
    policies: num("policies"),
    engagementRate: rate("engagementRate"),
    feePerPetMonth: num("feePerPetMonth"),
    claimCostReduction: rate("claimCostReduction"),
    creditsPerPetYear: num("creditsPerPetYear"),
  };
  return Response.json({
    input,
    assumptions: { ...UK, claimFrequency: Number(CLAIM_FREQUENCY.toFixed(3)) },
    output: computeEconomics(input),
  });
}
