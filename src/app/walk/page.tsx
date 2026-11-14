"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { CarePlanStop } from "@/components/walk/CarePlanStop";
import { CheckinStop } from "@/components/walk/CheckinStop";
import { HealthspanStop } from "@/components/walk/HealthspanStop";
import { HelloStop } from "@/components/walk/HelloStop";
import { MovementStop } from "@/components/walk/MovementStop";
import { NextWeekStop } from "@/components/walk/NextWeekStop";
import { PooMoment } from "@/components/walk/PooMoment";
import { Footnotes, Stop } from "@/components/walk/Stop";
import { TrendsStop } from "@/components/walk/TrendsStop";
import { WalkBackdrop, WalkPath, WalkProgress } from "@/components/walk/WalkPath";
import { YourWalkStop } from "@/components/walk/YourWalkStop";
import type { PetRecord, StoredCheckin } from "@/lib/store";
import { useActivePet, useCheckins } from "@/lib/usePets";
import { lifeStageOf } from "@/lib/walkplan";

type StopId = "hello" | "your-walk" | "movement" | "check-in" | "trends" | "healthspan" | "care-plan" | "cover" | "next-week";

const LABEL: Record<StopId, [string, string]> = {
  hello: ["Hello", "Hello"],
  "your-walk": ["Your walk", "Your walk"],
  movement: ["Check your pet's walk", "Movement"],
  "check-in": ["This week's check-in", "This week"],
  trends: ["Your trends", "Your trends"],
  healthspan: ["Healthspan", "Healthspan"],
  "care-plan": ["Care plan", "Care plan"],
  cover: ["Your cover", "Your cover"],
  "next-week": ["Same time next week", "Next week"],
};

/** What matters most for this pet comes first: care before charts for seniors and flagged pets. */
function stopOrder(rec: PetRecord, log: StoredCheckin[]): StopId[] {
  const stage = lifeStageOf(rec.pet);
  const latest = log.at(-1);
  const priority = stage === "senior" || rec.profile.bodyCondition === "over" || (latest && latest.status !== "green") || (latest?.answers && latest.answers.mobility !== "normal");
  if (priority) return ["hello", "your-walk", "movement", "check-in", "care-plan", "trends", "healthspan", "cover", "next-week"];
  if (stage === "young") return ["hello", "your-walk", "movement", "check-in", "healthspan", "care-plan", "trends", "cover", "next-week"];
  return ["hello", "your-walk", "movement", "check-in", "trends", "healthspan", "care-plan", "cover", "next-week"];
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
  const order = stopOrder(rec, log);
  const body: Record<StopId, ReactNode> = {
    hello: <HelloStop rec={rec} />,
    "your-walk": <YourWalkStop rec={rec} log={log} />,
    movement: <MovementStop rec={rec} log={log} />,
    "check-in": <CheckinStop rec={rec} log={log} />,
    trends: <TrendsStop rec={rec} log={log} reduce={reduce} />,
    healthspan: <HealthspanStop rec={rec} reduce={reduce} />,
    "care-plan": <CarePlanStop rec={rec} log={log} />,
    // The insurance stop is a problem statement; the plans themselves live on /savings.
    cover: <PooMoment rec={rec} />,
    "next-week": <NextWeekStop rec={rec} log={log} />,
  };

  return (
    <>
      <WalkBackdrop reduce={reduce} />
      <WalkProgress stops={order.map((id) => ({ id, label: LABEL[id][1] }))} species={rec.pet.species} />
      <div ref={container} key={`${rec.id}-${order.join()}`} className="relative pl-12 lg:pl-[220px]">
        <WalkPath containerRef={container} species={rec.pet.species} reduce={reduce} />
        <div className="relative" data-walk-content>
          {order.map((id, i) => (
            <Stop key={id} id={id} n={i + 1} label={id === "movement" ? `Check ${rec.pet.name}'s walk` : LABEL[id][0]} traits={traits}>
              {body[id]}
            </Stop>
          ))}
          <div className="pb-10">
            <Footnotes />
          </div>
        </div>
      </div>
    </>
  );
}
