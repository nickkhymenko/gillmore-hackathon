"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { lifetimeCost } from "@/lib/lifetime";
import type { PetRecord } from "@/lib/store";

const INK = "#141414";
const TYPICAL = "#8A8378"; // the typical owner, a quieter line; 3:1 on the cream surface
const AVERAGE = "#B3AA9C"; // the average member, lighter still
const MUTED = "#5E5E5E";
const GRID = "rgba(20,20,20,0.08)";
const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

function Tip({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as { typical: number; average: number; petra: number };
  return (
    <div className="rounded-[4px] border border-line bg-paper px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold">Age {label}</p>
      <p className="tnum text-muted">Typical owner {gbp(row.typical)}</p>
      <p className="tnum text-muted">Average member {gbp(row.average)}</p>
      <p className="tnum font-semibold">Petra top tier {gbp(row.petra)}</p>
    </div>
  );
}

/**
 * One chart for the whole life: the annual premium from now to the breed's typical lifespan, a typical owner
 * against Petra, with the gap shaded and summed. It draws in when the paw arrives. Illustrative.
 */
export function LifetimeCostStop({ rec, reduce }: { rec: PetRecord; reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -38% 0px" });
  const { rows, saved, savedAvg, lifespan, healthyFrom } = lifetimeCost(rec.pet);
  const name = rec.pet.name;
  const last = rows.at(-1)!;
  const draw = reduce || seen;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Illustrative, at the top tier</p>
        <h3 className="display mt-2 text-[clamp(2.75rem,8vw,5.5rem)]" data-testid="lifetime-saved">
          Up to <span className="accent-word">{gbp(saved)}</span> by age {lifespan}.
        </h3>
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-hidden>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-0.5 w-6" style={{ background: TYPICAL }} /> Typical owner
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-0.5 w-6" style={{ background: AVERAGE }} /> Average member
        </li>
        <li className="inline-flex items-center gap-2 font-semibold">
          <span className="inline-block h-1 w-6 rounded-full bg-ink" /> With Petra, top tier
        </li>
        <li className="inline-flex items-center gap-2 text-muted">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-accent" /> Healthier years
        </li>
      </ul>
      <div
        ref={ref}
        className="h-[260px] w-full sm:h-[340px]"
        role="img"
        aria-label={`Annual insurance cost for ${name} from age ${rows[0].age} to ${lifespan}: a typical owner rises to ${gbp(last.typical)} a year, with Petra ${gbp(last.petra)}. ${gbp(saved)} saved in total. Illustrative.`}
      >
        {draw && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="age" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fontSize: 12, fill: MUTED }} tickFormatter={(a) => `${a}y`} />
              <YAxis tickLine={false} axisLine={false} width={52} tick={{ fontSize: 12, fill: MUTED }} tickFormatter={(v) => gbp(v)} domain={[0, "auto"]} />
              <Tooltip content={(p) => <Tip {...(p as TooltipContentProps<number, string>)} />} cursor={{ stroke: INK, strokeWidth: 1 }} isAnimationActive={false} />
              <Area type="monotone" dataKey="gap" stroke="none" fill="var(--accent)" fillOpacity={0.55} isAnimationActive={!reduce} animationDuration={1200} />
              <Line type="monotone" dataKey="typical" stroke={TYPICAL} strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={!reduce} animationDuration={1200} />
              <Line type="monotone" dataKey="average" stroke={AVERAGE} strokeWidth={2} dot={false} isAnimationActive={!reduce} animationDuration={1200} />
              <Line type="monotone" dataKey="petra" stroke={INK} strokeWidth={3} strokeLinecap="round" dot={false} isAnimationActive={!reduce} animationDuration={1200} />
              {rows
                .filter((r) => r.healthier !== null)
                .map((r) => (
                  <ReferenceDot key={r.age} x={r.age} y={r.petra} r={5} fill="var(--accent)" stroke={INK} strokeWidth={2} />
                ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="text-sm text-muted">
        Illustrative: {name}&apos;s example premium rises about 12% a year with age. Top tier 15% off; the average member saves 4% (about {gbp(savedAvg)} over the same years). Markers from age {healthyFrom}: healthier years.
      </p>
    </div>
  );
}
