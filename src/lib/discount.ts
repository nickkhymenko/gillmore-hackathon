import type { StoredCheckin } from "./store";
import type { Pet } from "./types";

/**
 * Engagement discount: rewards doing the check-ins, never the health result, never buying products.
 * Tiers by check-ins in the policy year (from docs/09): 26+ = 5%, 40+ = 7.5%, 48+ = 10% off renewal.
 */
export const TIERS = [
  { checkins: 26, pct: 5 },
  { checkins: 40, pct: 7.5 },
  { checkins: 48, pct: 10 },
] as const;

const WEEK = 7 * 24 * 3600 * 1000;

export function discountStatus(log: StoredCheckin[], startedAt?: string, now = Date.now()) {
  const yearAgo = now - 52 * WEEK;
  const thisYear = log.filter((c) => new Date(c.createdAt).getTime() >= yearAgo);
  const done = thisYear.length;
  const firstTs = Math.min(...[startedAt, thisYear[0]?.createdAt].filter(Boolean).map((d) => new Date(d!).getTime()), now);
  const weeksElapsed = Math.max(1, Math.round((now - firstTs) / WEEK));
  const weeksLeft = Math.max(0, 52 - weeksElapsed);
  const rate = done === 0 ? 1 : Math.min(1, done / weeksElapsed);
  const projected = Math.min(52, Math.round(done + weeksLeft * rate));

  const tierFor = (n: number) => [...TIERS].reverse().find((t) => n >= t.checkins)?.pct ?? 0;
  const earned = tierFor(done);
  const onTrack = tierFor(projected);
  const next = TIERS.find((t) => done < t.checkins) ?? null;
  return {
    done,
    projected,
    earned,
    onTrack,
    next: next ? { pct: next.pct, needed: next.checkins - done } : null,
    max: TIERS[TIERS.length - 1].pct,
  };
}

export function streak(log: StoredCheckin[], now = Date.now()) {
  // Consecutive weeks with at least one check-in, counting back from this week.
  let weeks = 0;
  for (let w = 0; w < 104; w++) {
    const from = now - (w + 1) * WEEK, to = now - w * WEEK;
    const hit = log.some((c) => {
      const t = new Date(c.createdAt).getTime();
      return t > from && t <= to;
    });
    if (hit) weeks++;
    else if (w > 0) break;
  }
  return weeks;
}

/** Illustrative annual premium for a pet, by species, age and size (synthetic, for the demo only). */
export function basePremium(pet: Pet) {
  const species = { dog: 330, cat: 210, rabbit: 140, horse: 720, other: 160 }[pet.species];
  const size = pet.species === "dog" ? { toy: 0.85, small: 0.9, medium: 1, large: 1.15, giant: 1.35 }[pet.sizeClass ?? "medium"] : 1;
  const age = 1 + Math.max(0, pet.ageYears - 4) * 0.07;
  return species * size * age;
}
