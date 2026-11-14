"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ShieldCheck } from "@phosphor-icons/react";
import { PetAvatar } from "@/components/PetAvatar";
import { Sheet } from "@/components/Sheet";
import { WalkMode } from "@/components/blackbox/WalkMode";
import { Connect, DataRules, Diagnostics, PriceCard, Today } from "@/components/blackbox/sections";
import { blackBoxDiscount, dailyTarget, diagnostics, todayMinutes, useCollarDays, useWalks, weeks } from "@/lib/blackbox";
import { basePremium } from "@/lib/discount";
import { useActivePet, useCheckins, useNow } from "@/lib/usePets";

const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

function Block({ n, title, children, id }: { n: string; title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-32 space-y-6">
      <h2 className="eyebrow border-t border-line pt-3">
        <span className="tnum text-ink">{n}</span> / {title}
      </h2>
      {children}
    </section>
  );
}

/** Prevently Black Box: telematics for pet insurance. "Make your pet bills work for you." */
export default function BlackBoxPage() {
  const { pet: rec, ready } = useActivePet();
  const log = useCheckins(rec?.id, rec?.pet.name);
  const walks = useWalks(rec?.id);
  const collar = useCollarDays(rec?.id);
  const now = useNow();
  const [hr, setHr] = useState<{ name: string; bpm: number | null } | null>(null);
  const [rules, setRules] = useState(false);

  if (!ready) return <div className="min-h-[70svh]" aria-busy="true" />;
  if (!rec || rec.setupStep !== null)
    return (
      <section className="space-y-6 py-16">
        <p className="eyebrow">Prevently / Black Box</p>
        <h1 className="display text-[clamp(2.5rem,7vw,5rem)]">
          Make your pet bills <span className="accent-word">work for you.</span>
        </h1>
        <p className="max-w-[48ch] text-lg text-muted">First, a minute to meet your pet. Their targets are personal to their breed, age and health.</p>
        <Link href="/" className="btn btn-primary text-lg">
          {rec ? "Carry on" : "Meet your Pet Twin"} <ArrowUpRight size={18} weight="bold" aria-hidden />
        </Link>
      </section>
    );

  const name = rec.pet.name;
  const target = dailyTarget(rec, log, now);
  const today = todayMinutes(walks, collar, now);
  const wk = weeks(rec, target, walks, collar, now);
  const discount = blackBoxDiscount(wk, log, now);
  const diag = diagnostics(collar);
  const premium = basePremium(rec.pet);
  const isCollar = rec.blackBox?.device === "collar";
  const species = rec.pet.species;
  const activityWord = species === "cat" ? "play" : species === "rabbit" ? "free-roam time" : "walks";

  return (
    <div className="space-y-16 py-6 pb-28 sm:py-10 lg:pb-10">
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
        <div className="flex justify-center lg:col-span-4">
          <PetAvatar traits={rec.profile} size={220} title={`${name}'s avatar wearing a Prevently collar`} collar />
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-12">
        <div className="min-w-0 space-y-16 lg:col-span-8">
          <ol className="grid gap-px overflow-hidden rounded-brand border border-line bg-line md:grid-cols-3">
            {[
              ["Wear it", "A Prevently collar, or your phone until it arrives."],
              ["Walk and care as normal", `${species === "dog" ? "Walks" : "Play and activity"}, rest and check-ins all count.`],
              ["Your premium drops", `As you hit ${name}'s personal target. It can never go up.`],
            ].map(([t, d], i) => (
              <li key={t} className="bg-paper p-5">
                <p className="eyebrow">
                  <span className="tnum text-ink">{String(i + 1).padStart(2, "0")}</span> / Step
                </p>
                <p className="mt-3 text-xl font-semibold tracking-[-0.02em]">{t}</p>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </li>
            ))}
          </ol>

          <p className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-tight tracking-[-0.03em]">
            Up to <span className="rounded-[4px] bg-accent px-1">{gbp(premium * 0.15)}</span> a year off {name}&apos;s cover.
            <span className="mt-2 block text-sm font-normal tracking-normal text-muted">Illustrative: example premium of {gbp(premium)} a year, discount capped at 15%.</span>
          </p>

          <Block n="01" title="Connect">
            <Connect rec={rec} target={target} now={now} hr={hr} onHr={setHr} />
          </Block>

          <Block n="02" title="Today">
            <Today rec={rec} target={target} today={today} weeksMet={discount.weeksMet} weeksCounted={discount.weeksCounted} />
          </Block>

          <Block n="03" title={species === "dog" ? "Walk mode" : "Activity mode"} id="walk-mode">
            <WalkMode rec={rec} target={target} todayBefore={today} collar={isCollar} liveHr={hr?.bpm ?? null} onFinished={() => undefined} />
            {species !== "dog" && <p className="text-sm text-muted">For {name}, {activityWord} count. Use the collar, or log a session with your phone.</p>}
          </Block>

          <Block n="04" title="Black Box diagnostics">
            <Diagnostics rec={rec} days={collar} result={diag} now={now} />
          </Block>

          <PriceCard rec={rec} discount={discount} />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/dashboard" className="btn btn-ghost">
              {name}&apos;s dashboard <ArrowUpRight size={16} aria-hidden />
            </Link>
            <Link href="/walk" className="link min-h-11 content-center">
              Back to the walk
            </Link>
          </div>
        </div>

        <div className="hidden lg:col-span-4 lg:block">
          <div className="sticky top-24">
            <DataRules />
          </div>
        </div>
      </div>

      {/* Phones: the rules stay one tap away at all times. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 py-2 backdrop-blur-sm lg:hidden">
        <button type="button" onClick={() => setRules(true)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden /> Your data, your rules
          </span>
          <span className="text-muted">Only lowers your premium</span>
        </button>
      </div>
      <Sheet open={rules} onClose={() => setRules(false)} title="Your data, your rules">
        <DataRules compact />
      </Sheet>
    </div>
  );
}
