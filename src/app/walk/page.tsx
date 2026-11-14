"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { CheckinStop } from "@/components/walk/CheckinStop";
import { HealthyStop } from "@/components/walk/HealthyStop";
import { HelloStop } from "@/components/walk/HelloStop";
import { PooMoment } from "@/components/walk/PooMoment";
import { Stop } from "@/components/walk/Stop";
import { LifetimeCostStop } from "@/components/walk/LifetimeCostStop";
import { WalkBackdrop, WalkPath, WalkProgress } from "@/components/walk/WalkPath";
import { YourWalkStop } from "@/components/walk/YourWalkStop";
import { useActivePet, useCheckins } from "@/lib/usePets";

type StopId = "hello" | "your-walk" | "check-in" | "lifetime" | "healthspan" | "cover";

const LABEL: Record<StopId, [string, string]> = {
  hello: ["Hello", "Hello"],
  "your-walk": ["Your walk", "Your walk"],
  "check-in": ["This week's check-in", "This week"],
  lifetime: ["A lifetime of cover", "Lifetime"],
  healthspan: ["Healthy years", "Healthy years"],
  cover: ["Your cover", "Your cover"],
};

/** A short story: who they are, their walk, this week, a lifetime of cover, the healthy pet, then the poo. */
function stopOrder(): StopId[] {
  return ["hello", "your-walk", "check-in", "lifetime", "healthspan", "cover"];
}

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
  const order = stopOrder();
  const body: Record<StopId, ReactNode> = {
    hello: <HelloStop rec={rec} />,
    "your-walk": <YourWalkStop rec={rec} log={log} />,
    "check-in": <CheckinStop rec={rec} log={log} />,
    lifetime: <LifetimeCostStop rec={rec} reduce={reduce} />,
    healthspan: <HealthyStop rec={rec} reduce={reduce} />,
    // The insurance stop is a problem statement; the plans themselves live on /savings.
    cover: <PooMoment rec={rec} />,
  };

  return (
    <>
      <WalkBackdrop reduce={reduce} />
      <WalkProgress stops={order.map((id) => ({ id, label: LABEL[id][1] }))} species={rec.pet.species} />
      <div ref={container} key={`${rec.id}-${order.join()}`} className="relative pl-12 lg:pl-[220px]">
        <WalkPath containerRef={container} species={rec.pet.species} reduce={reduce} />
        <div className="relative" data-walk-content>
          {order.map((id, i) => (
            <Stop key={id} id={id} n={i + 1} label={LABEL[id][0]} traits={traits}>
              {body[id]}
            </Stop>
          ))}
          <div className="pb-10" />
        </div>
      </div>
    </>
  );
}
