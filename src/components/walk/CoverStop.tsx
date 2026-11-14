"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check } from "@phosphor-icons/react";
import { PilotSheet } from "../Sheet";
import { INSURERS, INSURER_FACTOR, PLANS, type PlanId } from "@/data/plans";
import { TIERS, basePremium, discountStatus } from "@/lib/discount";
import type { PetRecord, StoredCheckin } from "@/lib/store";
import { useNow } from "@/lib/usePets";

const gbp = (n: number, dp = 2) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);

/** Savings meter: check-ins this policy year against the tiers. */
export function SavingsMeter({ done, next }: { done: number; next: { pct: number; needed: number } | null }) {
  const pct = Math.min(100, (done / 52) * 100);
  return (
    <div>
      <div className="relative h-3 rounded-full bg-ink/10" role="meter" aria-valuemin={0} aria-valuemax={52} aria-valuenow={done} aria-label="Check-ins this policy year">
        <div className="h-3 rounded-full bg-ink transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
        {TIERS.map((t) => (
          <span key={t.checkins} className="absolute top-1/2 h-5 w-px -translate-y-1/2 bg-ink/50" style={{ left: `${(t.checkins / 52) * 100}%` }} aria-hidden />
        ))}
      </div>
      <div className="relative mt-1 h-5 text-[11px] text-muted">
        {TIERS.map((t) => (
          <span key={t.checkins} className="tnum absolute -translate-x-1/2" style={{ left: `${(t.checkins / 52) * 100}%` }}>
            {t.pct}%
          </span>
        ))}
      </div>
      <p className="mt-2 text-sm font-medium">
        {done} check-in{done === 1 ? "" : "s"} this policy year.{" "}
        {next ? (
          <>
            {next.needed} more to reach <strong>{next.pct}% off</strong>.
          </>
        ) : (
          <>Top tier reached.</>
        )}
      </p>
    </div>
  );
}

/**
 * Your cover, revealed only when the paw gets here: example insurers and illustrative plans, each showing
 * the Petra discount this pet is on track for. How you pay appears only after a plan is picked.
 */
export function CoverStop({ rec, log }: { rec: PetRecord; log: StoredCheckin[] }) {
  const [insurer, setInsurer] = useState<(typeof INSURERS)[number]["id"]>("harbourline");
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [annual, setAnnual] = useState(false);
  const [sheet, setSheet] = useState(false);
  const now = useNow();
  const d = discountStatus(log, rec.createdAt, now);
  const base = basePremium(rec.pet) * INSURER_FACTOR[insurer];
  const name = rec.pet.name;
  const chosen = PLANS.find((p) => p.id === plan);
  const yearly = chosen ? base * chosen.factor : 0;
  const discountPct = d.onTrack;
  const payBase = annual ? yearly * 0.95 : yearly / 12;
  const saving = payBase * (discountPct / 100);

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <div className="max-w-2xl">
          <h3 className="display text-[clamp(2rem,5vw,3.5rem)]">
            Cover that <span className="accent-word">rewards</span> check-ins.
          </h3>
          <p className="mt-3 text-muted">
            At this pace {name} is on track for <strong className="text-ink">{discountPct}% off</strong> at renewal. The discount is for doing check-ins, never for {name}&apos;s health results.
          </p>
        </div>

        <div role="radiogroup" aria-label="Insurer" className="flex flex-wrap gap-2">
          {INSURERS.map((i) => (
            <button
              key={i.id}
              type="button"
              role="radio"
              aria-checked={insurer === i.id}
              onClick={() => setInsurer(i.id)}
              className={`min-h-11 rounded-brand border px-4 text-sm font-semibold transition-colors ${insurer === i.id ? "border-ink bg-ink text-paper" : "border-line bg-white/50 hover:border-ink/40"}`}
            >
              {i.name}
            </button>
          ))}
        </div>

        <div role="radiogroup" aria-label="Plan" className="grid gap-3 md:grid-cols-3">
          {PLANS.map((p) => {
            const monthly = (base * p.factor) / 12;
            const on = plan === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPlan(p.id)}
                className={`flex flex-col rounded-brand border-2 p-5 text-left transition-colors duration-300 ${on ? "border-ink bg-accent-soft" : "border-line bg-white/50 hover:border-ink/40"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xl font-semibold tracking-[-0.02em]">{p.name}</span>
                  {on && (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-paper">
                      <Check size={14} weight="bold" aria-hidden />
                    </span>
                  )}
                </span>
                <span className="mt-1 text-sm text-muted">{p.summary}</span>
                <ul className="mt-3 space-y-1 text-sm">
                  {p.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
                <span className="mt-5 border-t border-line pt-3">
                  <span className="block text-3xl font-semibold tracking-[-0.03em]">
                    {gbp(monthly * (1 - discountPct / 100))}
                    <span className="text-base font-medium text-muted"> a month</span>
                  </span>
                  <span className="tnum block text-xs text-muted">
                    {gbp(monthly)} before your {discountPct}% Petra discount
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted">Illustrative plans from example insurers. Not real quotes or companies.</p>
      </div>

      <AnimatePresence>
        {chosen && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="space-y-6 border-t border-line pt-10" id="how-you-pay">
            <h3 className="display text-[clamp(1.75rem,4vw,2.75rem)]">How you pay</h3>
            <div role="radiogroup" aria-label="Payment frequency" className="inline-flex rounded-brand border border-line p-1">
              {[
                ["Monthly", false],
                ["Annually, save 5%", true],
              ].map(([label, v]) => (
                <button
                  key={String(label)}
                  type="button"
                  role="radio"
                  aria-checked={annual === v}
                  onClick={() => setAnnual(v as boolean)}
                  className={`min-h-11 rounded-[4px] px-4 text-sm font-semibold transition-colors ${annual === v ? "bg-ink text-paper" : "hover:bg-ink/5"}`}
                >
                  {label as string}
                </button>
              ))}
            </div>
            <dl className="tnum grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-lg">
              <dt className="text-muted">{chosen.name}, {annual ? "per year" : "per month"}</dt>
              <dd>{gbp(payBase)}</dd>
              <dt className="text-muted">Petra discount ({discountPct}%)</dt>
              <dd>−{gbp(saving)}</dd>
              <dt className="border-t border-line pt-2 font-semibold">You pay</dt>
              <dd className="border-t border-line pt-2 text-2xl font-semibold tracking-[-0.02em]">{gbp(payBase - saving)}</dd>
            </dl>
            <div className="max-w-md">
              <SavingsMeter done={d.done} next={d.next} />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button type="button" onClick={() => setSheet(true)} className="btn btn-primary text-lg">
                Continue to payment <ArrowUpRight size={18} weight="bold" aria-hidden />
              </button>
              <span className="text-sm font-semibold">Your data can only lower your premium. Never raise it, never add exclusions.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <PilotSheet open={sheet} onClose={() => setSheet(false)} what="Buying cover and paying in the app" />
    </div>
  );
}
