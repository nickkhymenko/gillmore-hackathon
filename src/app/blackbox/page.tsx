"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { PetAvatar } from "@/components/PetAvatar";
import { basePremium } from "@/lib/discount";
import { useActivePet } from "@/lib/usePets";

const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

/** Prevently Black Box: telematics for pet insurance. Walk mode and the collar arrive in Part C of docs/12. */
export default function BlackBoxPage() {
  const { pet: rec, ready } = useActivePet();
  if (!ready) return <div className="min-h-[70svh]" aria-busy="true" />;
  const name = rec?.pet.name ?? "your pet";
  const premium = rec ? basePremium(rec.pet) : 330;
  const maxSaving = premium * 0.15;

  return (
    <div className="space-y-16 py-6 sm:py-10">
      <header className="grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="eyebrow">Prevently / Black Box</p>
          <h1 className="display mt-4 text-[clamp(3rem,8vw,7rem)]">
            Make your pet bills <span className="accent-word">work for you.</span>
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg text-muted">
            UK vet prices rose about 75% in ten years. The average pet insurance claim is £685. Prevently Black Box turns good care into a lower premium.
          </p>
        </div>
        {rec && (
          <div className="flex justify-center lg:col-span-4">
            <PetAvatar traits={rec.profile} size={220} title={`${name}'s avatar`} />
          </div>
        )}
      </header>

      <ol className="grid gap-px overflow-hidden rounded-brand border border-line bg-line md:grid-cols-3">
        {[
          ["Wear it", "A Prevently collar, or your phone until it arrives."],
          ["Walk and care as normal", `Walks, play and rest count towards ${name}'s personal target.`],
          ["Your premium drops", `Hit ${name}'s target most weeks and your price goes down. It can never go up.`],
        ].map(([t, d], i) => (
          <li key={t} className="bg-paper p-6">
            <p className="eyebrow">
              <span className="tnum text-ink">{String(i + 1).padStart(2, "0")}</span> / Step
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.02em]">{t}</p>
            <p className="mt-2 text-muted">{d}</p>
          </li>
        ))}
      </ol>

      <section className="rounded-brand p-6 text-white sm:p-10" style={{ background: "var(--dark)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Your potential saving</p>
        <p className="mt-4 text-[clamp(2rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
          Up to <span className="text-accent">{gbp(maxSaving)}</span> a year off {name}&apos;s cover.
        </p>
        <p className="mt-4 text-sm text-white/75">Illustrative, based on an example premium of {gbp(premium)} a year and a discount of up to 15%. It can only lower your premium.</p>
      </section>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="text-lg font-semibold">Walk mode, the collar and live pricing are next.</p>
        <Link href={rec ? "/walk#your-walk" : "/"} className="link inline-flex min-h-11 items-center gap-1">
          {rec ? `Back to ${name}'s walk` : "Meet your Pet Twin first"} <ArrowUpRight size={16} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
