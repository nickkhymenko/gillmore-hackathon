"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUpRight, Bone, Carrot, Drop, Footprints, Heartbeat, Scales, Toilet, Tooth, Yarn, type Icon } from "@phosphor-icons/react";
import { PetAvatar } from "../PetAvatar";
import { HeroIllustration, SpeciesIllustration, WalkIllustration } from "../illustrations";
import { ParkWalk } from "../illustrations/ParkWalk";
import type { Species } from "@/lib/types";

/** What we track for each species, shown as an icon row on its card. */
const SPECIES: { id: Exclude<Species, "other">; label: string; track: [Icon, string][] }[] = [
  { id: "dog", label: "Dog", track: [[Footprints, "Walks"], [Bone, "Joints"], [Scales, "Weight"]] },
  { id: "cat", label: "Cat", track: [[Drop, "Thirst"], [Toilet, "Litter"], [Yarn, "Play"]] },
  { id: "rabbit", label: "Rabbit", track: [[Carrot, "Eating"], [Toilet, "Droppings"], [Tooth, "Teeth"]] },
  { id: "horse", label: "Horse", track: [[Footprints, "Feet"], [Scales, "Weight"], [Heartbeat, "Movement"]] },
];

const STATS: { v: string; l: string; n: number }[] = [
  { v: "£1.23bn", l: "pet insurance claims paid in the UK in 2024", n: 1 },
  { v: "£685", l: "average pet insurance claim", n: 1 },
  { v: "+75%", l: "rise in UK vet prices in ten years", n: 1 },
  { v: "69%", l: "of Millennials and Gen Z say their pet is family", n: 1 },
];

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      data-reveal
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const BISCUIT = { species: "dog" as const, sizeClass: "large" as const, coatColours: ["#E2BE7A"], coatPattern: "solid" as const, earShape: "floppy" as const, muzzle: "medium" as const };

/** The landing page: editorial and illustration-led, with the species choice as the first decision. */
export function MarketingLanding({ onStart }: { onStart: (species?: Species) => void }) {
  const story: { time: string; text: React.ReactNode; visual: React.ReactNode }[] = [
    {
      time: "Tuesday, 7:10am",
      text: "Biscuit is a little slower on his morning walk.",
      visual: (
        <WalkIllustration className="block h-auto w-full overflow-hidden rounded-brand" />
      ),
    },
    {
      time: "Tuesday, 7:45am",
      text: "Petra notices the dip against his own normal, not an average dog's.",
      visual: (
        <div className="rounded-brand border border-line bg-white/60 p-5">
          <p className="eyebrow">Mobility, last 6 weeks</p>
          <svg viewBox="0 0 300 110" className="mt-3 w-full" role="img" aria-label="A line that stays inside Biscuit's usual range, then dips below it in the last week">
            <rect x="0" y="18" width="300" height="26" fill="var(--accent-soft)" />
            <path d="M0 30 L50 27 L100 32 L150 28 L200 31 L240 30 L270 52 L300 70" fill="none" stroke="#141414" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="300" cy="70" r="5" fill="#141414" stroke="var(--bg)" strokeWidth="2" />
          </svg>
          <p className="mt-2 text-sm font-medium">Mobility is 18 points below Biscuit&apos;s usual. Worth a vet&apos;s look.</p>
        </div>
      ),
    },
    {
      time: "Tuesday, 6:30pm",
      text: "A vet looks at it online that evening, with his trends and a short video already attached.",
      visual: (
        <div className="flex items-center gap-4 rounded-brand border border-line bg-white/60 p-5">
          <PetAvatar traits={BISCUIT} size={72} animated={false} title="" />
          <div>
            <p className="font-semibold">Online consult booked</p>
            <p className="text-sm text-muted">Brief, trends and clip shared by Biscuit&apos;s owner</p>
          </div>
        </div>
      ),
    },
    {
      time: "The following week",
      text: "Caught early: a consult and a change of routine instead of a big claim.",
      visual: (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-brand border border-line bg-line">
          <div className="bg-paper p-5">
            <p className="eyebrow">Caught early</p>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">£60</p>
            <p className="text-sm text-muted">an online consult (illustrative)</p>
          </div>
          <div className="bg-paper p-5">
            <p className="eyebrow">Caught late</p>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-muted line-through decoration-2">£685</p>
            <p className="text-sm text-muted">the average claim</p>
          </div>
        </div>
      ),
    },
    {
      time: "At renewal",
      text: "And Biscuit's owner pays less next year, because good care counts.",
      visual: (
        <div className="rounded-brand p-5 text-white" style={{ background: "var(--dark)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Renewal</p>
          <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-accent">10% off</p>
          <p className="text-sm text-white/75">for check-ins and walks. It can only lower the premium.</p>
        </div>
      ),
    },
  ];

  return (
    <div className="-mt-6 space-y-24 sm:space-y-32">
      {/* Hero */}
      <section className="grid items-end gap-8 pt-6 lg:grid-cols-12 lg:pt-12">
        <div className="lg:col-span-7">
          <p className="eyebrow">Petra / Pet health, early</p>
          <h1 className="display mt-4 text-[clamp(2.75rem,6.2vw,5.5rem)]">
            Make managing your pet&apos;s finances <span className="accent-word">a walk in the park.</span>
          </h1>
          <p className="mt-5 text-[clamp(1.5rem,3vw,2.25rem)] font-semibold tracking-[-0.03em]">Make your pet bills work for you.</p>
          <p className="mt-6 max-w-[46ch] text-lg text-muted sm:text-xl">
            Petra helps you catch problems early and turns good care into a cheaper premium. Inside your insurer&apos;s app. Powered by Doctapet.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href="#start" className="btn btn-primary min-h-14 px-6 text-lg">
              Start with your pet <ArrowUpRight size={20} weight="bold" aria-hidden />
            </a>
            <a href="#lower" className="link inline-flex min-h-11 items-center gap-1">
              How it lowers your bill <ArrowDown size={16} aria-hidden />
            </a>
          </div>
        </div>
        <div className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-brand lg:col-span-5">
          <HeroIllustration className="block h-auto w-full" />
          <span className="absolute bottom-4 left-4 rounded-brand bg-paper/95 px-3 py-2 text-sm">
            <strong>Biscuit, 8.</strong> On track this week.
          </span>
        </div>
      </section>

      {/* A light interactive park walk: the dog follows scroll, paw prints follow the cursor or a finger. */}
      <ParkWalk className="-mt-12 sm:-mt-16" />

      {/* First decision: species */}
      <section id="start" className="scroll-mt-24 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-3">
          <h2 className="eyebrow">
            <span className="tnum text-ink">01</span> / Start here
          </h2>
          <span className="text-sm text-muted">About a minute. One question at a time.</span>
        </div>
        <p className="display text-[clamp(2.25rem,6vw,4.5rem)]">Who are we looking after?</p>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SPECIES.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onStart(s.id)} className="group block h-full w-full overflow-hidden rounded-brand border border-line bg-white/60 text-left hover:border-ink/40 focus-visible:outline-offset-4">
                <span className="block overflow-hidden">
                  <SpeciesIllustration species={s.id} className="block aspect-square h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
                </span>
                <span className="block p-4">
                  <span className="flex items-center justify-between text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                    {s.label} <ArrowUpRight size={22} weight="bold" aria-hidden />
                  </span>
                  <span className="sr-only">, we track: {s.track.map(([, l]) => l.toLowerCase()).join(", ")}</span>
                  <span aria-hidden className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
                    {s.track.map(([I, l]) => (
                      <span key={l} className="inline-flex items-center gap-1">
                        <I size={16} weight="bold" /> {l}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Narrative scroll */}
      <section className="space-y-12" aria-labelledby="story-title">
        <div className="border-t border-line pt-3">
          <h2 id="story-title" className="eyebrow">
            <span className="tnum text-ink">02</span> / A Tuesday with Biscuit
          </h2>
        </div>
        <ol className="space-y-16 sm:space-y-24">
          {story.map((s, i) => (
            <li key={s.time} className="grid items-center gap-6 lg:grid-cols-12 lg:gap-12">
              <Reveal className={`lg:col-span-6 ${i % 2 ? "lg:order-2" : ""}`}>
                <p className="eyebrow">{s.time}</p>
                <p className="display mt-3 text-[clamp(2rem,4.5vw,3.5rem)]">{s.text}</p>
              </Reveal>
              <Reveal delay={0.1} className={`lg:col-span-5 ${i % 2 ? "lg:order-1 lg:col-start-1" : "lg:col-start-8"}`}>
                {s.visual}
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* Stats band */}
      <section className="-mx-4 px-4 py-14 text-white sm:-mx-6 sm:px-6 sm:py-20" style={{ background: "var(--dark)" }} aria-label="UK pet insurance in numbers">
        <dl className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.v}>
              <dt className="sr-only">{s.l}</dt>
              <dd>
                <span className="block text-[clamp(2.75rem,6vw,4.5rem)] font-semibold leading-none tracking-[-0.05em] text-accent">{s.v}</span>
                <span className="mt-3 block max-w-[22ch] text-sm text-white/80">
                  {s.l}
                  <sup className="ml-0.5">{s.n}</sup>
                </span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mx-auto mt-10 max-w-[1200px] text-xs text-white/50">1. Gillmore Hackathon 2026 Participant Reading Guide (UK pet insurance and consumer figures).</p>
      </section>

      {/* How we lower your bill */}
      <section id="lower" className="scroll-mt-24 space-y-10">
        <div className="border-t border-line pt-3">
          <h2 className="eyebrow">
            <span className="tnum text-ink">03</span> / How we lower your bill
          </h2>
        </div>
        <p className="display max-w-4xl text-[clamp(2.25rem,6vw,4.5rem)]">
          Good care goes in. A <span className="accent-word">cheaper premium</span> comes out.
        </p>
        <ol className="grid gap-px overflow-hidden rounded-brand border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Weekly check-in", "One minute of taps. It learns your pet's own normal, so small changes stand out."],
            ["Walks and your savings", "Your phone, or a Petra Walk Companion, counts walks, play and rest. Routes stay on your phone."],
            ["Personal targets", "Set by breed, age and health. A senior Pug and a young Collie can both earn the full discount."],
            ["Only ever down", "Your data can only lower your premium. Never raise it, never add exclusions."],
          ].map(([t, d], i) => (
            <li key={t} className="bg-paper p-6">
              <p className="eyebrow">
                <span className="tnum text-ink">{String(i + 1).padStart(2, "0")}</span>
              </p>
              <p className="mt-3 text-xl font-semibold tracking-[-0.02em]">{t}</p>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
        <p className="text-lg">
          Up to <strong>15% off</strong> at renewal: for a dog on a £330-a-year policy, that is about <strong>£50</strong> back a year.{" "}
          <span className="text-sm text-muted">Illustrative example; the discount comes from check-ins and walks, never from buying anything.</span>
        </p>
      </section>

      {/* Closing */}
      <section className="flex flex-col items-start gap-6 border-t border-line pt-10 pb-6">
        <p className="display max-w-3xl text-[clamp(2.25rem,6vw,4.5rem)]">
          Start with <span className="accent-word">your pet.</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <a href="#start" className="btn btn-primary min-h-14 px-6 text-lg">
            Start with your pet <ArrowUpRight size={20} weight="bold" aria-hidden />
          </a>
          <a href="/dashboard?demo=biscuit" className="link min-h-11 content-center">
            See a demo pet
          </a>
        </div>
      </section>
    </div>
  );
}
