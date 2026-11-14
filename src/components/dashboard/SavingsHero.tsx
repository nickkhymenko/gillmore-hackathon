"use client";

import { TIERS, basePremium, discountStatus } from "@/lib/discount";
import type { PetRecord, StoredCheckin } from "@/lib/store";

const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

/**
 * The hero metric: what check-ins are worth on this pet's premium. Dark band, accent numbers.
 * Earned = the tier reached by check-ins so far this policy year. On track = projected at the current pace.
 */
export function SavingsHero({ rec, log, now }: { rec: PetRecord; log: StoredCheckin[]; now: number }) {
  const d = discountStatus(log, rec.createdAt, now);
  const premium = basePremium(rec.pet);
  const saved = (premium * d.earned) / 100;
  const onTrack = (premium * d.onTrack) / 100;
  const pct = Math.min(100, (d.done / TIERS[TIERS.length - 1].checkins) * 100);

  return (
    <section aria-labelledby="savings-title" className="rounded-brand p-6 text-white sm:p-10" style={{ background: "var(--dark)" }}>
      <p id="savings-title" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
        Premium savings
      </p>
      {d.earned > 0 ? (
        <h2 className="mt-4 max-w-3xl text-[clamp(2rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
          You&apos;ve saved <span className="text-accent">{gbp(saved)}</span> on {rec.pet.name}&apos;s premium this year.
        </h2>
      ) : d.onTrack > 0 ? (
        <h2 className="mt-4 max-w-3xl text-[clamp(2rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
          On track to save <span className="text-accent">{gbp(onTrack)}</span> on {rec.pet.name}&apos;s premium.
        </h2>
      ) : (
        <h2 className="mt-4 max-w-3xl text-[clamp(2rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
          Check in weekly to save up to <span className="text-accent">{gbp((premium * d.max) / 100)}</span> on {rec.pet.name}&apos;s premium.
        </h2>
      )}
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="relative h-3 rounded-full bg-white/15" role="meter" aria-valuemin={0} aria-valuemax={48} aria-valuenow={Math.min(d.done, 48)} aria-label="Check-ins this policy year towards the top discount">
            <div className="h-3 rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
            {TIERS.map((t) => (
              <span key={t.checkins} aria-hidden className="absolute top-1/2 h-5 w-px -translate-y-1/2 bg-white/50" style={{ left: `${(t.checkins / 48) * 100}%` }} />
            ))}
          </div>
          <div className="relative mt-1 h-5 text-[11px] text-white/60">
            {TIERS.map((t) => (
              <span key={t.checkins} className="tnum absolute -translate-x-full whitespace-nowrap pr-1" style={{ left: `${(t.checkins / 48) * 100}%` }}>
                {t.pct}%
              </span>
            ))}
          </div>
          <p className="mt-3 text-lg">
            {d.next ? (
              <>
                <strong className="text-accent">{d.next.needed} more check-in{d.next.needed === 1 ? "" : "s"}</strong> to reach {d.next.pct}% off.
              </>
            ) : (
              <>Top tier reached: {d.max}% off at renewal.</>
            )}
          </p>
          <p className="mt-1 text-sm text-white/60">5% at 26 check-ins in a policy year, 7.5% at 40, 10% at 48.</p>
        </div>
        <dl className="grid grid-cols-3 gap-4 lg:col-span-5">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-white/60">Check-ins</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-accent">{d.done}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-white/60">Earned</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-accent">{d.earned}%</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-white/60">On track for</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-accent">{d.onTrack}%</dd>
          </div>
        </dl>
      </div>
      <p className="mt-8 border-t border-white/15 pt-4 text-sm text-white/75">
        Your check-in data can only lower your premium. Never raise it, never add exclusions. Based on an illustrative premium of {gbp(premium)} a year.
      </p>
    </section>
  );
}
