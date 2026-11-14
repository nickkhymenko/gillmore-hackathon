"use client";

import Link from "next/link";
import { useRef } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { CarePlanStop } from "@/components/walk/CarePlanStop";
import { CheckinStop } from "@/components/walk/CheckinStop";
import { CoverStop } from "@/components/walk/CoverStop";
import { HealthspanStop } from "@/components/walk/HealthspanStop";
import { HelloStop } from "@/components/walk/HelloStop";
import { NextWeekStop } from "@/components/walk/NextWeekStop";
import { Footnotes, Stop } from "@/components/walk/Stop";
import { TrendsStop } from "@/components/walk/TrendsStop";
import { WalkBackdrop, WalkPath, WalkProgress } from "@/components/walk/WalkPath";
import { useActivePet, useCheckins } from "@/lib/usePets";

const STOPS = [
  { id: "hello", label: "Hello" },
  { id: "check-in", label: "This week" },
  { id: "trends", label: "Your trends" },
  { id: "healthspan", label: "Healthspan" },
  { id: "care-plan", label: "Care plan" },
  { id: "cover", label: "Your cover" },
  { id: "next-week", label: "Next week" },
];

/**
 * The Health Walk: one scroll-driven page per pet. The paw follows the scroll along a winding path and each
 * stop opens as it arrives. Insurance and payment only appear near the end, once the owner has got value first.
 */
export default function WalkPage() {
  const { pet: rec, ready } = useActivePet();
  const log = useCheckins(rec?.id, rec?.pet.name);
  const reduce = Boolean(useReducedMotion());
  const container = useRef<HTMLDivElement>(null);

  if (!ready) return <div className="min-h-[70svh]" aria-busy="true" />;
  if (!rec || rec.setupStep !== null)
    return (
      <section className="space-y-6 py-16">
        <p className="eyebrow">Health Walk</p>
        <h1 className="display text-[clamp(2.5rem,7vw,5rem)]">{rec ? `Let's finish ${rec.pet.name}'s twin first.` : "Meet your pet first."}</h1>
        <Link href="/" className="btn btn-primary text-lg">
          {rec ? "Carry on" : "Meet your Pet Twin"} <ArrowUpRight size={18} weight="bold" aria-hidden />
        </Link>
      </section>
    );

  const traits = rec.profile;
  return (
    <>
      <WalkBackdrop reduce={reduce} />
      <WalkProgress stops={STOPS} species={rec.pet.species} />
      <div ref={container} key={rec.id} className="relative pl-12 lg:pl-[220px]">
        <WalkPath containerRef={container} species={rec.pet.species} reduce={reduce} />
        <div className="relative" data-walk-content>
          <Stop id="hello" n={1} label="Hello" traits={traits}>
            <HelloStop rec={rec} />
          </Stop>
          <Stop id="check-in" n={2} label="This week's check-in" traits={traits}>
            <CheckinStop rec={rec} log={log} />
          </Stop>
          <Stop id="trends" n={3} label="Your trends" traits={traits}>
            <TrendsStop rec={rec} log={log} reduce={reduce} />
          </Stop>
          <Stop id="healthspan" n={4} label="Healthspan" traits={traits}>
            <HealthspanStop rec={rec} reduce={reduce} />
          </Stop>
          <Stop id="care-plan" n={5} label="Care plan" traits={traits}>
            <CarePlanStop rec={rec} log={log} />
          </Stop>
          <Stop id="cover" n={6} label="Your cover" traits={traits}>
            <CoverStop rec={rec} log={log} />
          </Stop>
          <Stop id="next-week" n={7} label="Same time next week" traits={traits}>
            <NextWeekStop rec={rec} log={log} />
          </Stop>
          <div className="pb-10">
            <Footnotes />
          </div>
        </div>
      </div>
    </>
  );
}
