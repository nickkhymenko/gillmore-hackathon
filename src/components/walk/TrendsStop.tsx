"use client";

import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { METRIC_LABEL, buildSeries, metricsFor, sentenceFor, type Series } from "@/lib/metrics";
import { seedDemo, type PetRecord, type StoredCheckin } from "@/lib/store";

const INK = "#141414";
const MUTED = "#6B6B6B";
const GRID = "rgba(20,20,20,0.08)";

function Tip({ active, payload, label, unit }: TooltipContentProps<number, string> & { unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[4px] border border-line bg-paper px-3 py-2 text-xs shadow-sm">
      <p className="text-base font-semibold">
        {payload[0].value}
        {unit ? ` ${unit}` : ""}
      </p>
      <p className="text-muted">Week of {label}</p>
    </div>
  );
}

/** One small multiple: a single series (no legend, the title names it) against the pet's own baseline band. */
export function TrendChart({ s, reduce }: { s: Series; reduce: boolean }) {
  const last = s.points.at(-1);
  return (
    <div className="h-[168px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={s.points} margin={{ top: 12, right: 46, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          {s.band && <ReferenceArea y1={s.band[0]} y2={s.band[1]} fill="var(--accent-soft)" fillOpacity={1} stroke="none" ifOverflow="hidden" />}
          <XAxis dataKey="week" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fontSize: 11, fill: MUTED }} interval="preserveStartEnd" minTickGap={28} />
          <YAxis domain={s.domain} ticks={s.key === "weight" ? undefined : [0, 50, 100]} tickLine={false} axisLine={false} width={34} tick={{ fontSize: 11, fill: MUTED }} className="tnum" />
          <Tooltip content={(p) => <Tip {...(p as TooltipContentProps<number, string>)} unit={s.unit} />} cursor={{ stroke: INK, strokeWidth: 1 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="value" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} activeDot={{ r: 5, fill: INK, stroke: "var(--bg)", strokeWidth: 2 }} isAnimationActive={!reduce} animationDuration={600} />
          {last && (
            <ReferenceDot
              x={last.week}
              y={last.value}
              r={4.5}
              fill={INK}
              stroke="var(--bg)"
              strokeWidth={2}
              label={{ value: `${last.value}${s.unit ? "" : ""}`, position: "right", fontSize: 12, fontWeight: 600, fill: INK, offset: 8 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** "Your trends": the four measures that matter most for this pet, each against its own usual. */
export function TrendsStop({ rec, log, reduce }: { rec: PetRecord; log: StoredCheckin[]; reduce: boolean }) {
  const name = rec.pet.name;
  const withAnswers = log.filter((c) => c.answers);
  const hasWeights = log.filter((c) => typeof c.weightKg === "number").length >= 2;
  const keys = metricsFor(rec.pet, rec.profile, hasWeights);
  const series = keys.map((k) => buildSeries(k, log));

  if (withAnswers.length < 2)
    return (
      <div className="max-w-2xl space-y-5">
        <h3 className="display text-[clamp(2rem,5vw,3.5rem)]">Trends need a few weeks.</h3>
        <p className="text-lg text-muted">
          After two check-ins we start drawing {name}&apos;s own usual for {keys.map((k) => METRIC_LABEL[k].noun).join(", ")}. A dip against {name}&apos;s own usual matters more than any average.
        </p>
        <button type="button" onClick={() => seedDemo(rec.pet)} className="btn btn-ghost">
          Show with 6 weeks of sample history
        </button>
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <h3 className="display text-[clamp(2rem,5vw,3.5rem)]">
          {name} against <span className="accent-word">{name}.</span>
        </h3>
        <p className="mt-3 text-muted">
          Chosen for a {rec.pet.ageYears}-year-old {rec.pet.breed || rec.pet.species}. 100 is a normal week; the shaded band is {name}&apos;s own usual range.
        </p>
      </div>
      <div className="grid gap-x-10 gap-y-10 md:grid-cols-2">
        {series.map((s) => (
          <figure key={s.key} className="min-w-0">
            <figcaption>
              <p className="eyebrow">{METRIC_LABEL[s.key].title}</p>
              <p className="mt-1 min-h-12 text-base font-medium leading-snug">{sentenceFor(s, name)}</p>
            </figcaption>
            <TrendChart s={s} reduce={reduce} />
          </figure>
        ))}
      </div>
      <details className="text-sm">
        <summary className="link inline-flex min-h-11 cursor-pointer items-center">Show as a table</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="tnum w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-semibold">Week</th>
                {series.map((s) => (
                  <th key={s.key} className="py-2 pr-4 font-semibold">
                    {METRIC_LABEL[s.key].title}
                    {s.unit ? ` (${s.unit})` : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(series[0]?.points ?? []).map((p, i) => (
                <tr key={p.date} className="border-b border-line">
                  <td className="py-2 pr-4">{p.week}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-2 pr-4">
                      {s.points[i]?.value ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="py-2 pr-4 text-muted">Usual</td>
                {series.map((s) => (
                  <td key={s.key} className="py-2 pr-4 text-muted">
                    {s.baseline ?? ""}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
