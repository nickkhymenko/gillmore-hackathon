import { maxSaving } from "@/data/premiums";
import type { blackBoxDiscount } from "./blackbox";
import { basePremium, discountStatus } from "./discount";
import type { PetRecord, StoredCheckin } from "./store";

/**
 * One reading of "what has this pet saved", used by the dashboard's savings card and the price card, so the
 * header (health score, streak) and the savings numbers can never disagree.
 *
 *  - new:      no check-ins and no walks yet. Only the potential is shown, never a saved amount.
 *  - building: something has started (a first walk, a few check-ins) but nothing is earned yet.
 *  - walks:    on the Walk Companion or phone with at least one full week counted and a discount earned.
 *  - checkins: no walk data; the discount comes from weekly check-ins alone.
 */
export type SavingsView =
  | { kind: "new"; upTo: number; premium: number }
  | { kind: "building"; upTo: number; premium: number; via: "walks" | "checkins"; weeksMet: number; weeksCounted: number; checkins: number; needed: number | null }
  | { kind: "walks"; upTo: number; premium: number; pct: number; saved: number; weeksMet: number; weeksCounted: number; targetPct: number; checkinPct: number; metRatio: number; nextTier: { ratio: number; pct: number } | null }
  | { kind: "checkins"; upTo: number; premium: number; pct: number; saved: number; onTrackPct: number; done: number; next: { pct: number; needed: number } | null };

export function savingsView(rec: PetRecord, log: StoredCheckin[], hasWalkData: boolean, bb: ReturnType<typeof blackBoxDiscount>, now: number): SavingsView {
  const premium = basePremium(rec.pet);
  const upTo = maxSaving(rec.pet);
  if (!hasWalkData && log.length === 0) return { kind: "new", upTo, premium };

  if (rec.blackBox && hasWalkData) {
    if (bb.completeWeeks === 0 || bb.total === 0)
      return { kind: "building", upTo, premium, via: "walks", weeksMet: bb.completeWeeks ? bb.weeksMet : 0, weeksCounted: bb.completeWeeks, checkins: log.length, needed: null };
    return {
      kind: "walks",
      upTo,
      premium,
      pct: bb.total,
      saved: savedSoFar(premium, bb.total, bb.weeksCounted),
      weeksMet: bb.weeksMet,
      weeksCounted: bb.weeksCounted,
      targetPct: bb.target,
      checkinPct: bb.checkins,
      metRatio: bb.metRatio,
      nextTier: bb.nextTier,
    };
  }

  const d = discountStatus(log, rec.createdAt, now);
  if (d.earned === 0) return { kind: "building", upTo, premium, via: "checkins", weeksMet: 0, weeksCounted: 0, checkins: d.done, needed: d.next?.needed ?? null };
  return { kind: "checkins", upTo, premium, pct: d.earned, saved: (premium * d.earned) / 100, onTrackPct: d.onTrack, done: d.done, next: d.next };
}

/** The share of a year's discount earned over the weeks counted so far. Illustrative. */
export const savedSoFar = (yearlyPremium: number, pct: number, weeksCounted: number) => ((yearlyPremium * pct) / 100) * (weeksCounted / 52);
