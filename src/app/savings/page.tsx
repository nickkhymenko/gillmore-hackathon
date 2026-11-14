"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, CheckCircle, Footprints, LinkSimple, TrendDown, type Icon } from "@phosphor-icons/react";
import { EmptyPetState } from "@/components/EmptyPetState";
import { CompanionTag } from "@/components/blackbox/CompanionTag";
import { JoinSheet } from "@/components/blackbox/JoinSheet";
import { WalkMode } from "@/components/blackbox/WalkMode";
import { AVG_MEMBER_PCT, TOP_TIER_PCT, annualPremium, avgSaving, maxSaving } from "@/data/premiums";
import { blackBoxDiscount, dailyTarget, todayMinutes, useCollarDays, useWalks, weeks } from "@/lib/blackbox";
import { usePremium } from "@/lib/premium";
import type { PetRecord } from "@/lib/store";
import { useActivePet, useCheckins, useNow } from "@/lib/usePets";

const gbp2 = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
const SPRING = { type: "spring", stiffness: 180, damping: 24 } as const;

/** A section that rises in as it is reached. One idea each. */
function Section({ id, eyebrow, title, children, reduce }: { id: string; eyebrow: string; title: React.ReactNode; children: React.ReactNode; reduce: boolean }) {
  return (
    <motion.section
      id={id}
      data-reveal
      className="scroll-mt-28 space-y-8"
      aria-labelledby={`${id}-title`}
      initial={reduce ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={SPRING}
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={`${id}-title`} className="display mt-3 text-[clamp(2rem,4.8vw,3.5rem)]">
          {title}
        </h2>
      </div>
      {children}
    </motion.section>
  );
}

/** Today against the most Petra can take off: two big numbers. "Up to" and the average stay small. */
function Compare({ rec }: { rec: PetRecord }) {
  const monthly = annualPremium(rec.pet) / 12;
  const best = monthly * (1 - TOP_TIER_PCT / 100);
  return (
    <div className="space-y-5">
      <dl className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="card-quiet p-7 text-center">
          <dt className="eyebrow">Your price today</dt>
          <dd className="tnum mt-3 text-[clamp(3rem,8vw,4.5rem)] font-semibold leading-none tracking-[-0.055em] text-muted">{gbp2(monthly)}</dd>
          <dd className="mt-2 text-sm text-muted">a month</dd>
        </div>
        <div className="card p-7 text-center">
          <dt className="eyebrow">With Petra</dt>
          <dd className="tnum mt-3 text-[clamp(3rem,8vw,4.5rem)] font-semibold leading-none tracking-[-0.055em]">{gbp2(best)}</dd>
          <dd className="mt-2 text-sm text-muted">a month, up to {TOP_TIER_PCT}% off</dd>
        </div>
      </dl>
      <p className="mx-auto max-w-[56ch] text-center text-sm text-muted">
        <span className="tnum font-semibold text-ink" data-testid="monthly-saving">
          Save up to {gbp2(monthly - best)} a month.
        </span>{" "}
        Members save about {AVG_MEMBER_PCT}% on average, around {gbp(avgSaving(rec.pet))} a year for {rec.pet.name}. Illustrative.
      </p>
    </div>
  );
}

const STEPS: [Icon, string][] = [
  [LinkSimple, "Clip it to the collar."],
  [Footprints, "Walk as usual."],
  [TrendDown, "Pay less."],
];

/** Petra Savings: the Walk Companion as a light product page. Hero, how it works, the price, an example walk, one sign-up. */
export default function SavingsPage() {
  const { pet: rec, ready } = useActivePet();
  const log = useCheckins(rec?.id, rec?.pet.name);
  const walks = useWalks(rec?.id);
  const collar = useCollarDays(rec?.id);
  const member = usePremium();
  const now = useNow();
  const reduce = Boolean(useReducedMotion());
  const [joining, setJoining] = useState(false);

  if (!ready) return <div className="min-h-svh" aria-busy="true" />;
  if (!rec)
    return (
      <EmptyPetState
        where="Savings"
        title={
          <>
            Save on your pet&apos;s insurance <span className="accent-word">with every walk.</span>
          </>
        }
        line="Meet your pet first: their targets are personal to their breed, age and health."
      />
    );
  if (rec.setupStep !== null)
    return (
      <section className="space-y-6 py-16">
        <p className="eyebrow">Petra Savings</p>
        <h1 className="display text-[clamp(2.5rem,7vw,5rem)]">
          Save on {rec.pet.name}&apos;s insurance <span className="accent-word">with every walk.</span>
        </h1>
        <p className="max-w-[48ch] text-lg text-muted">First, a minute to meet {rec.pet.name}. Targets are personal to breed, age and health.</p>
        <Link href="/" className="btn btn-primary text-lg">
          Carry on <ArrowUpRight size={18} weight="bold" aria-hidden />
        </Link>
      </section>
    );

  const name = rec.pet.name;
  const target = dailyTarget(rec, log, now);
  const today = todayMinutes(walks, collar, now);
  const discount = blackBoxDiscount(weeks(rec, target, walks, collar, now), log, now);
  const joined = member?.petId === rec.id;
  // Arriving from the walk, the hero rises as the page comes in.
  const enter = (delay = 0) => (reduce ? {} : { initial: { opacity: 0, y: 36 }, animate: { opacity: 1, y: 0 }, transition: { ...SPRING, delay } });

  return (
    <div className="space-y-24 pb-20 sm:space-y-32">
      <header className="mx-auto max-w-4xl pt-6 text-center sm:pt-12">
        <motion.div {...enter()}>
          <p className="eyebrow">Petra Walk Companion</p>
          <h1 className="display mt-4 text-[clamp(2.75rem,7vw,5.25rem)]">
            Save on {name}&apos;s insurance <span className="accent-word">with every walk.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[40ch] text-lg text-muted sm:text-xl">A small tag that counts {name}&apos;s walks. Never your location.</p>
        </motion.div>
        <motion.div {...enter(0.12)} className="mt-6 flex justify-center sm:mt-8">
          <CompanionTag className="h-auto w-72 sm:w-[25rem]" />
        </motion.div>
      </header>

      <Section id="how" eyebrow="How it works" title="Three steps." reduce={reduce}>
        <ol className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {STEPS.map(([I, line]) => (
            <li key={line} className="card flex items-center gap-4 p-6 sm:flex-col sm:gap-5 sm:py-9 sm:text-center">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent-soft" aria-hidden>
                <I size={26} weight="duotone" />
              </span>
              <p className="text-xl font-semibold tracking-[-0.03em]">{line}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="compare" eyebrow="The price" title={<>Today, and with Petra.</>} reduce={reduce}>
        <Compare rec={rec} />
      </Section>

      <Section id="walk-mode" eyebrow="Example walk" title={<>Take {name} for a walk.</>} reduce={reduce}>
        <div className="mx-auto max-w-4xl">
          <WalkMode rec={rec} target={target} todayBefore={today} collar={rec.blackBox?.device === "collar"} liveHr={null} discountPct={discount.total} finishCta={{ href: "#join", label: "Continue" }} onFinished={() => undefined} />
        </div>
      </Section>

      <section id="join" className="card mx-auto max-w-4xl scroll-mt-28 px-6 py-12 text-center sm:px-10 sm:py-16">
        {joined ? (
          <div className="mx-auto max-w-2xl space-y-6" data-testid="join-done">
            <CheckCircle size={52} weight="fill" className="mx-auto" aria-hidden />
            <p className="display text-[clamp(2rem,5vw,3.5rem)]">
              {name} is on <span className="accent-word">Petra Premium.</span>
            </p>
            <Link href="/dashboard" className="btn btn-primary min-h-14 px-8 text-lg">
              Go to your dashboard <ArrowUpRight size={20} weight="bold" aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-6">
            <p className="display text-[clamp(2rem,5vw,3.5rem)]">
              Ready when <span className="accent-word">{name} is.</span>
            </p>
            <p className="text-lg text-muted">Up to {gbp(maxSaving(rec.pet))} a year off. Cancel anytime.</p>
            <button type="button" onClick={() => setJoining(true)} className="btn btn-primary min-h-16 px-10 text-xl">
              Try it today <ArrowUpRight size={22} weight="bold" aria-hidden />
            </button>
          </div>
        )}
        <p className="mx-auto mt-8 max-w-[52ch] text-sm text-muted" data-testid="data-promise">
          Your data can only lower your premium. Never raise it, never add exclusions. Routes and locations stay on your device.
        </p>
      </section>

      <JoinSheet rec={rec} open={joining} onClose={() => setJoining(false)} />
    </div>
  );
}
