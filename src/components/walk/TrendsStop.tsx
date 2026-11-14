"use client";

import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { Series } from "@/lib/metrics";

const INK = "#141414";
const MUTED = "#5E5E5E";
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
