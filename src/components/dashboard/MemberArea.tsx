"use client";

import Link from "next/link";
import { ArrowUpRight, Bone, FirstAid, ShieldCheck, Sparkle, Tag, type Icon } from "@phosphor-icons/react";
import { NUTRITION_BRAND, OFFER_GROUPS } from "@/data/partners";
import { avgSaving } from "@/data/premiums";
import { usePremium } from "@/lib/premium";
import type { PetRecord } from "@/lib/store";

const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

/** Overview card: Petra Premium status, or the way in. */
export function PremiumStatus({ rec }: { rec: PetRecord }) {
  const member = usePremium();
  return (
    <div className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:px-7" data-testid="premium-status">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-ink">
          <Sparkle size={20} weight="fill" aria-hidden />
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

const GROUP_ICON: Record<string, Icon> = { nutrition: Bone, vets: FirstAid, insurers: ShieldCheck, accessories: Tag };

/** The Savings tab: a light, premium member area. Example partners only, never tied to the discount. */
export function MemberArea({ rec }: { rec: PetRecord }) {
  const member = usePremium();
  return (
    <div className="space-y-12 sm:space-y-16">
      <div className="mx-auto max-w-3xl space-y-4 pt-4 text-center sm:pt-8">
        <p className="eyebrow">{member ? "Petra Premium member" : "Petra Premium"}</p>
        <h2 className="display text-[clamp(2.5rem,6vw,4.5rem)]">
          Your pet deserves <span className="accent-word">the best life.</span>
        </h2>
        <p className="text-lg text-muted" data-testid="avg-saving">
          Members save about <strong className="rounded-md bg-accent-soft px-1.5 py-0.5 font-semibold text-ink">{gbp(avgSaving(rec.pet))} a year</strong> on average. <span className="text-sm">Illustrative, for {rec.pet.name}&apos;s example premium.</span>
        </p>
      </div>

      <article className="card grid items-center gap-6 overflow-hidden p-7 sm:grid-cols-12 sm:p-10" data-testid="featured-offer">
        <div className="sm:col-span-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">Planned</span>
            <span className="eyebrow">Nutrition and supplements</span>
          </div>
          <p className="mt-4 text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.04em]">{NUTRITION_BRAND} (coming to the UK)</p>
          <p className="mt-3 max-w-[52ch] text-muted">Vet-designed nutrition and supplements for {rec.pet.name}, with a member price. Planned, not yet available.</p>
        </div>
        <div className="hidden justify-end sm:col-span-4 sm:flex" aria-hidden>
          <span className="grid h-32 w-32 place-items-center rounded-full bg-accent-soft">
            <Bone size={56} weight="duotone" />
          </span>
        </div>
      </article>

      <div className="grid gap-5 md:grid-cols-2">
        {OFFER_GROUPS.map((g) => {
          const I = GROUP_ICON[g.id] ?? Tag;
          return (
            <section key={g.id} aria-labelledby={`offers-${g.id}`} className="card p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft" aria-hidden>
                  <I size={20} weight="duotone" />
                </span>
                <h3 id={`offers-${g.id}`} className="text-xl font-semibold tracking-[-0.03em]">
                  {g.title}
                </h3>
              </div>
              <ul className="mt-4 divide-y divide-line">
                {g.offers.map((o) => (
                  <li key={o.brand} className="py-4 last:pb-0">
                    <p className="text-lg font-semibold tracking-[-0.02em]">{o.offer}</p>
                    <p className="text-sm text-muted">
                      {o.brand}
                      {o.detail ? `. ${o.detail}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted">Example partners. Not real offers or companies, and never linked to your discount.</p>
    </div>
  );
}
