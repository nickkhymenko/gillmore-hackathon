"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { BB_TIERS, type blackBoxDiscount } from "@/lib/blackbox";
import { basePremium } from "@/lib/discount";
import type { PetRecord } from "@/lib/store";

const gbp = (n: number, dp = 0) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);

/** Savings hero for pets on the Black Box: target weeks plus check-ins, capped at 15%, updated live after each walk. */
export function BlackBoxHero({ rec, d }: { rec: PetRecord; d: ReturnType<typeof blackBoxDiscount> }) {
  const premium = basePremium(rec.pet);
  const saved = ((premium * d.total) / 100) * (d.weeksCounted / 52);
  return (
    <section aria-labelledby="savings-title" className="rounded-brand p-6 text-white sm:p-10" style={{ background: "var(--dark)" }}>
      <p id="savings-title" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
        Premium savings, Black Box
      </p>
      <h2 className="mt-4 max-w-3xl text-[clamp(2rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
        {d.total > 0 ? (
          <>
            {d.total}% off {rec.pet.name}&apos;s premium. You&apos;ve saved <span className="text-accent">{gbp(saved, 2)}</span> so far.
          </>
        ) : (
          <>
            Hit {rec.pet.name}&apos;s target most weeks to save up to <span className="text-accent">{gbp(premium * 0.15)}</span> a year.
          </>
        )}
      </h2>
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="relative h-3 rounded-full bg-white/15" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(d.metRatio * 100)} aria-label="Share of weeks with the target met">
            <div className="h-3 rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${Math.round(d.metRatio * 100)}%` }} />
            {BB_TIERS.map((t) => (
              <span key={t.ratio} aria-hidden className="absolute top-1/2 h-5 w-px -translate-y-1/2 bg-white/50" style={{ left: `${t.ratio * 100}%` }} />
            ))}
          </div>
          <p className="mt-3 text-lg">
            Target met in <strong className="text-accent">{d.weeksMet} of {d.weeksCounted}</strong> weeks. {d.nextTier ? `${Math.round(d.nextTier.ratio * 100)}% of weeks unlocks ${d.nextTier.pct}%.` : "Top tier reached."}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-4 lg:col-span-5">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-white/60">Targets</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-accent">{d.target}%</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-white/60">Check-ins</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-accent">+{d.checkins}%</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-white/60">Total</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-accent">{d.total}%</dd>
          </div>
        </dl>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-4">
        <p className="text-sm text-white/75">It can only lower your premium. Never raise it, never add exclusions. Illustrative, example premium of {gbp(premium)} a year.</p>
        <Link href="/blackbox" className="btn btn-primary">
          Open Black Box <ArrowUpRight size={16} weight="bold" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
