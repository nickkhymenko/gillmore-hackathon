"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import type { SavingsView } from "@/lib/savings";
import type { PetRecord } from "@/lib/store";

const gbp = (n: number, dp = 0) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="tnum mt-1 text-3xl font-semibold tracking-[-0.04em]">{value}</dd>
    </div>
  );
}

/**
 * The dashboard's savings card: one light card, one headline. What it says comes from savingsView(), the same
 * reading the Walks tab uses, so a pet with no history only ever sees its potential.
 */
export function SavingsCard({ rec, view, onStartWalk }: { rec: PetRecord; view: SavingsView; onStartWalk: () => void }) {
  const name = rec.pet.name;
  const upTo = gbp(view.upTo);
  return (
    <section aria-labelledby="savings-title" className="card p-6 sm:p-10" data-testid="savings-card" data-state={view.kind}>
      <p id="savings-title" className="eyebrow">
        Petra Savings
      </p>

      {view.kind === "new" && (
        <>
          <h2 className="display mt-4 max-w-3xl text-[clamp(2rem,5vw,3.75rem)]">
            Your discount starts with your <span className="accent-word">first walk.</span>
          </h2>
          <p className="mt-4 text-lg text-muted" data-testid="savings-potential">
            Worth up to <strong className="rounded-md bg-accent-soft px-1.5 py-0.5 font-semibold text-ink">{upTo} a year</strong> on {name}&apos;s premium.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button type="button" onClick={onStartWalk} className="btn btn-primary min-h-12 text-lg">
              Start a walk <ArrowUpRight size={18} weight="bold" aria-hidden />
            </button>
            <Link href="/walk#check-in" className="link min-h-11 content-center">
              Or do a one-minute check-in
            </Link>
          </div>
        </>
      )}

      {view.kind === "building" && (
        <>
          <h2 className="display mt-4 max-w-3xl text-[clamp(2rem,5vw,3.75rem)]">
            {view.via === "walks" ? (
              <>
                {name}&apos;s first week is <span className="accent-word">under way.</span>
              </>
            ) : (
              <>
                {name}&apos;s discount is <span className="accent-word">building.</span>
              </>
            )}
          </h2>
          <p className="mt-4 text-lg text-muted" data-testid="savings-potential">
            Worth up to <strong className="rounded-md bg-accent-soft px-1.5 py-0.5 font-semibold text-ink">{upTo} a year</strong>.{" "}
            {view.via === "walks"
              ? view.weeksCounted
                ? `Target met in ${view.weeksMet} of ${view.weeksCounted} ${view.weeksCounted === 1 ? "week" : "weeks"} so far.`
                : "Your discount shows after the first full week."
              : `${view.checkins} ${view.checkins === 1 ? "check-in" : "check-ins"} so far${view.needed ? `, ${view.needed} more for the first tier` : ""}.`}
          </p>
          <div className="mt-8">
            <button type="button" onClick={onStartWalk} className="btn btn-primary min-h-12 text-lg">
              {view.via === "walks" ? "Walk again" : "Start a walk"} <ArrowUpRight size={18} weight="bold" aria-hidden />
            </button>
          </div>
        </>
      )}

      {view.kind === "walks" && (
        <>
          <h2 className="display mt-4 max-w-3xl text-[clamp(2rem,5vw,3.75rem)]">
            <span data-testid="savings-pct">{view.pct}% off</span> {name}&apos;s premium. <span className="accent-word">Saved <span data-testid="savings-saved">{gbp(view.saved, 2)}</span> so far.</span>
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="h-2.5 rounded-full bg-ink/10" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.metRatio * 100)} aria-label="Share of weeks with the target met">
                <div className="h-2.5 rounded-full bg-accent ring-1 ring-ink/15 transition-[width] duration-700 ease-out" style={{ width: `${Math.round(view.metRatio * 100)}%` }} />
              </div>
              <p className="mt-3 text-lg" data-testid="savings-weeks">
                Target met in <strong>{view.weeksMet} of {view.weeksCounted}</strong> weeks. <span className="text-muted">{view.nextTier ? `${Math.round(view.nextTier.ratio * 100)}% of weeks unlocks ${view.nextTier.pct}%.` : "Top tier reached."}</span>
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-4 lg:col-span-5">
              <Stat label="Walks" value={`${view.targetPct}%`} />
              <Stat label="Check-ins" value={`+${view.checkinPct}%`} />
              <Stat label="Total" value={`${view.pct}%`} />
            </dl>
          </div>
        </>
      )}

      {view.kind === "checkins" && (
        <>
          <h2 className="display mt-4 max-w-3xl text-[clamp(2rem,5vw,3.75rem)]">
            You&apos;ve saved <span className="accent-word">{gbp(view.saved)}</span> on {name}&apos;s premium this year.
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            <p className="text-lg lg:col-span-7">
              {view.next ? (
                <>
                  <strong>
                    {view.next.needed} more check-in{view.next.needed === 1 ? "" : "s"}
                  </strong>{" "}
                  to reach {view.next.pct}% off. <span className="text-muted">Add walks for up to 15%.</span>
                </>
              ) : (
                <>Top check-in tier reached.</>
              )}
            </p>
            <dl className="grid grid-cols-3 gap-4 lg:col-span-5">
              <Stat label="Check-ins" value={String(view.done)} />
              <Stat label="Earned" value={`${view.pct}%`} />
              <Stat label="On track" value={`${view.onTrackPct}%`} />
            </dl>
          </div>
        </>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <p className="max-w-[60ch] text-sm text-muted">
          It can only lower your premium. Never raise it, never add exclusions. Illustrative, on an example premium of {gbp(view.premium)} a year.
        </p>
        <Link href="/savings" className="link inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
          How Savings works <ArrowUpRight size={14} weight="bold" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
