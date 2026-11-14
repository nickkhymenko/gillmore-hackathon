"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Cite } from "./Stop";
import { baseHealthyYears, leversFor, lifespanFor } from "@/data/evidence";
import type { PetRecord } from "@/lib/store";

const RANGE_GREY = "#7E776D"; // validated: 3:1 or better against the cream and tinted pet surfaces
const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

/** Smoothly counts to the new value; instant with reduced motion. */
function AnimatedNumber({ value, reduce }: { value: number; reduce: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = fmt(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, { duration: 0.6, ease: "easeOut", onUpdate: (v) => (el.textContent = fmt(v)) });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce]);
  return <span ref={ref}>{fmt(value)}</span>;
}

/** Healthspan: the breed's typical lifespan (cited, approximate) and a "healthy years" bar the owner can grow. */
export function HealthspanStop({ rec, reduce }: { rec: PetRecord; reduce: boolean }) {
  const { pet } = rec;
  const life = lifespanFor(pet);
  const levers = leversFor(pet.species);
  const [on, setOn] = useState<Record<string, boolean>>({});
  const base = baseHealthyYears(life.range, pet.species);
  const healthy = Math.min(life.range[1], base + levers.reduce((s, l) => s + (on[l.id] ? l.effect : 0), 0));
  const max = Math.ceil(life.range[1] + 1);
  const data = [
    { name: "Typical lifespan", value: life.range as [number, number], label: `${life.range[0]} to ${life.range[1]} years, approximate`, fill: RANGE_GREY },
    { name: "Healthy years", value: [0, healthy] as [number, number], label: `${fmt(healthy)} years, illustrative`, fill: "var(--dark)" },
  ];

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-6">
        <h3 className="display text-[clamp(2rem,5vw,3.5rem)]">
          More <span className="accent-word">healthy</span> years.
        </h3>
        <div>
          <p className="eyebrow">Healthy years, illustrative</p>
          <p className="text-[clamp(3.5rem,9vw,6rem)] font-semibold leading-none tracking-[-0.05em]" aria-live="polite">
            <AnimatedNumber value={healthy} reduce={reduce} />
          </p>
        </div>
        <ul className="space-y-1 text-sm">
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-3 w-5 rounded-[2px]" style={{ background: d.fill }} />
              <span className="font-semibold">{d.name}:</span> <span className="text-muted">{d.label}</span>
            </li>
          ))}
        </ul>
        <div className="h-[110px] w-full" role="img" aria-label={`Typical lifespan ${life.range[0]} to ${life.range[1]} years, approximate. Healthy years ${fmt(healthy)}, illustrative.`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }} barCategoryGap={18}>
              <XAxis type="number" domain={[0, max]} tickLine={false} axisLine={{ stroke: "rgba(20,20,20,0.12)" }} tick={{ fontSize: 11, fill: "#6B6B6B" }} unit=" y" />
              <YAxis type="category" dataKey="name" hide />
              <Bar dataKey="value" barSize={22} radius={4} isAnimationActive={!reduce} animationDuration={500}>
                {data.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-muted">
          Typical lifespan for {pet.breed ? `a ${pet.breed}` : `a ${pet.species} like ${pet.name}`}: {life.range[0]} to {life.range[1]} years. {life.note}
          <Cite ids={life.sources} />
        </p>
        <p className="text-sm font-semibold">Illustrative, based on published studies. Not a prediction for your pet.</p>
      </div>

      <div className="lg:col-span-6">
        <p className="eyebrow">Turn on what {pet.name} already gets</p>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {levers.map((l) => (
            <li key={l.id}>
              <button type="button" role="switch" aria-checked={Boolean(on[l.id])} onClick={() => setOn((o) => ({ ...o, [l.id]: !o[l.id] }))} className="flex min-h-16 w-full items-start gap-4 py-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold">{l.label}</span>
                    <span className="tnum text-sm text-muted">+{l.effect.toFixed(1)} y</span>
                    <span className="rounded-[3px] border border-line px-1.5 text-[11px] font-semibold uppercase tracking-wider">{l.evidence === "Untested" ? "Untested idea" : `Evidence: ${l.evidence}`}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {l.detail}
                    <Cite ids={l.sources} />
                  </span>
                </span>
                <span aria-hidden className={`relative mt-1 h-7 w-12 shrink-0 rounded-full border-2 transition-colors duration-300 ${on[l.id] ? "border-ink bg-accent" : "border-ink/30 bg-white/60"}`}>
                  <span className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-ink transition-[left] duration-300 ${on[l.id] ? "left-6" : "left-1"}`} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
