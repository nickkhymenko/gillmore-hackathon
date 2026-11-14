"use client";

import Link from "next/link";
import { ArrowUpRight, Crown } from "@phosphor-icons/react";
import { NUTRITION_BRAND, OFFER_GROUPS } from "@/data/partners";
import { avgSaving } from "@/data/premiums";
import { usePremium } from "@/lib/premium";
import type { PetRecord } from "@/lib/store";

const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

/** Overview card: Petra Premium status, or the way in. */
export function PremiumStatus({ rec }: { rec: PetRecord }) {
  const member = usePremium();
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-brand border border-line bg-white/60 p-5" data-testid="premium-status">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-[#FFD43B]">
          <Crown size={20} weight="fill" aria-hidden />
        </span>
        <div>
          <p className="font-semibold">{member ? "Petra Premium member" : "Not a Premium member yet"}</p>
          <p className="text-sm text-muted">
            {member ? `Since ${new Date(member.since).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. ${member.petName} is covered for every walk.` : `Members save about ${gbp(avgSaving(rec.pet))} a year on average. Illustrative.`}
          </p>
        </div>
      </div>
      <Link href={member ? "/dashboard#savings" : "/savings"} className="btn btn-ghost">
        {member ? "Member offers" : "Try Petra Premium"} <ArrowUpRight size={16} aria-hidden />
      </Link>
    </div>
  );
}

/** The Savings tab: the member area. Example partners only, never tied to the discount. */
export function MemberArea({ rec }: { rec: PetRecord }) {
  return (
    <div className="space-y-12">
      <div className="space-y-3">
        <h2 className="display text-[clamp(2.5rem,6vw,4.5rem)]">
          Your pet deserves <span className="accent-word">the best life.</span>
        </h2>
        <p className="text-lg" data-testid="avg-saving">
          Members save about <strong className="rounded-[4px] bg-accent px-1">{gbp(avgSaving(rec.pet))} a year</strong> on average. <span className="text-sm text-muted">Illustrative, for {rec.pet.name}&apos;s example premium.</span>
        </p>
      </div>

      <article className="rounded-brand bg-[#161616] p-6 text-white sm:p-8" data-testid="featured-offer">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#FFD43B] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#141414]">Planned</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Featured</span>
        </div>
        <p className="mt-4 text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-tight tracking-[-0.03em]">{NUTRITION_BRAND} (coming to the UK)</p>
        <p className="mt-2 max-w-[52ch] text-white/75">Vet-designed nutrition and supplements for {rec.pet.name}, with a member price. Planned, not yet available.</p>
      </article>

      <div className="grid gap-10 md:grid-cols-2">
        {OFFER_GROUPS.map((g) => (
          <section key={g.id} aria-labelledby={`offers-${g.id}`} className="space-y-3">
            <h3 id={`offers-${g.id}`} className="eyebrow">
              {g.title}
            </h3>
            <ul className="divide-y divide-line border-y border-line">
              {g.offers.map((o) => (
                <li key={o.brand} className="py-4">
                  <p className="text-lg font-semibold tracking-[-0.02em]">{o.offer}</p>
                  <p className="text-sm text-muted">
                    {o.brand}
                    {o.detail ? `. ${o.detail}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="text-xs text-muted">Example partners. Not real offers or companies, and never linked to your discount.</p>
    </div>
  );
}
