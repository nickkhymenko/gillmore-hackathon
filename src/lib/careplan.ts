import { CARE_RULES, type CareRec } from "@/data/careRules";
import { isFlatFaced } from "./metrics";
import type { StoredCheckin } from "./store";
import type { Pet, TwinProfile } from "./types";

/**
 * Care plan engine. Deterministic and testable: same inputs, same plan.
 * Guardrails (non-negotiable):
 *  - No supplements while an amber or red flag is active: the vet step comes first.
 *  - No doses, no prescription medicines, generic ingredient names only.
 *  - Partner offers are examples, clearly labelled, and never linked to the premium discount.
 */
export type CareContext = {
  pet: Pet;
  profile: TwinProfile;
  name: string;
  senior: boolean;
  big: boolean;
  flatFaced: boolean;
  latest: StoredCheckin | null;
  trend: { mobilityDown: boolean; thirstUp: boolean; itchyWeeks: number };
  /** From the Black Box, when enrolled: average active minutes over the last 10 days against the daily target. */
  activity?: { recentAvg: number; target: number };
};

export type CarePlan = {
  recs: CareRec[];
  /** True when an amber or red flag paused the supplement and product suggestions. */
  paused: boolean;
  pausedReason: string | null;
};

const SENIOR_AGE = { dog: 8, cat: 11, rabbit: 6, horse: 18, other: 8 } as const;

export function careContext(pet: Pet, profile: TwinProfile, log: StoredCheckin[], activity?: CareContext["activity"]): CareContext {
  const recent = log.slice(-4);
  const latest = log.at(-1) ?? null;
  const stiff = (c: StoredCheckin) => c.answers && c.answers.mobility !== "normal";
  const itchy = (c: StoredCheckin) => c.answers?.skin === "itchy";
  let itchyWeeks = 0;
  for (let i = log.length - 1; i >= 0 && itchy(log[i]); i--) itchyWeeks++;
  return {
    pet,
    profile,
    name: pet.name,
    senior: pet.ageYears >= SENIOR_AGE[pet.species],
    big: pet.sizeClass === "large" || pet.sizeClass === "giant",
    flatFaced: Boolean(isFlatFaced(pet, profile)),
    latest,
    activity,
    trend: {
      mobilityDown: recent.filter(stiff).length >= 1,
      thirstUp: recent.filter((c) => c.answers?.water === "more").length >= 2 || latest?.answers?.water === "more",
      itchyWeeks,
    },
  };
}

export function buildCarePlan(ctx: CareContext, max = 6): CarePlan {
  const status = ctx.latest?.status;
  const paused = status === "amber" || status === "red";
  const seen = new Set<string>();
  const all = CARE_RULES.filter((r) => r.when(ctx))
    .flatMap((r) => r.recs(ctx))
    .filter((rec) => (seen.has(rec.id) ? false : (seen.add(rec.id), true)));

  // Guardrail: while a flag is active, no supplements or products at all, and vet steps go first.
  const vetFirst = paused
    ? all.filter((r) => r.type !== "supplement" && r.type !== "product").map((r) => (r.type === "vet" ? { ...r, priority: r.priority + 100 } : r))
    : all;
  const ranked = vetFirst.sort((a, b) => b.priority - a.priority);
  // Keep the plan varied: at most two supplements and one product.
  const out: CareRec[] = [];
  let supplements = 0, products = 0;
  for (const r of ranked) {
    if (r.type === "supplement" && ++supplements > 2) continue;
    if (r.type === "product" && ++products > 1) continue;
    out.push(r);
    if (out.length >= max) break;
  }
  return {
    recs: out,
    paused,
    pausedReason: paused
      ? status === "red"
        ? `${ctx.name} needs a vet first. Supplement and product ideas are paused until then.`
        : `This week's check-in raised a flag, so supplement and product ideas are paused. Talk to a vet first.`
      : null,
  };
}

export const SUPPLEMENT_WARNING = "Supplements support, they don't treat. Check with your vet first, especially if your pet takes medication.";
