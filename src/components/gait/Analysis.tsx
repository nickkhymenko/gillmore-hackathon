"use client";

import { useEffect, useState } from "react";
import { CheckCircle, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import type { GaitClip, Series } from "./types";

const STEPS = [
  "Checking every frame has a clear view of the legs",
  "Comparing the low point of each left and right step",
  "Separating front legs (head) from back legs (hips)",
  "Checking against published lameness research",
];

/** Step-by-step "analysis" reveal, then calls onDone. */
export function AnalysisProgress({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= STEPS.length) {
      const t = setTimeout(onDone, 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 480);
    return () => clearTimeout(t);
  }, [step, onDone]);

  return (
    <ol className="space-y-3" aria-live="polite">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className={`flex items-center gap-3 text-base ${i > step ? "text-muted/50" : ""}`}>
            {done ? (
              <CheckCircle size={20} weight="fill" className="shrink-0 text-ink" aria-hidden />
            ) : active ? (
              <CircleNotch size={20} weight="bold" className="shrink-0 animate-spin" aria-hidden />
            ) : (
              <span className="h-5 w-5 shrink-0 rounded-full border border-line" aria-hidden />
            )}
            {label}
          </li>
        );
      })}
    </ol>
  );
}

const W = 600;
const H = 96;

function geometry(s: NonNullable<Series>) {
  const ys = (s.y.filter((v) => v !== null && Number.isFinite(v)) as number[]).sort((a, b) => a - b);
  // robust range: ignore the few frames where tracking jumped
  const lo = ys[Math.floor(ys.length * 0.03)] ?? 0;
  const hi = ys[Math.ceil(ys.length * 0.97) - 1] ?? 1;
  const t0 = s.t[0];
  const t1 = s.t[s.t.length - 1];
  const X = (t: number) => ((t - t0) / (t1 - t0 || 1)) * W;
  const Y = (v: number) => {
    const c = Math.min(hi, Math.max(lo, v));
    return H - 10 - ((c - lo) / (hi - lo || 1)) * (H - 20);
  };
  return { X, Y };
}

function pathUpTo(s: NonNullable<Series>, X: (t: number) => number, Y: (v: number) => number, until: number) {
  let d = "";
  let pen = false;
  for (let i = 0; i < s.t.length; i++) {
    if (s.t[i] > until) break;
    const v = s.y[i];
    if (v === null || !Number.isFinite(v)) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${X(s.t[i]).toFixed(1)},${Y(v).toFixed(1)} `;
    pen = true;
  }
  return d;
}

/**
 * Head and hip up/down curves drawn in step with the video.
 * `t` = seconds into the analysed segment (null = draw everything).
 * `scores` = show the final unevenness numbers (after Analyse).
 */
export const WARN = "#c8412b";

export function LiveChart({ clip, t, scores, warn = false }: { clip: GaitClip; t: number | null; scores: boolean; warn?: boolean }) {
  const rows: { label: string; s: Series; key: "head" | "pelvis" }[] = [
    { label: "Head (front legs)", s: clip.signals.head, key: "head" },
    { label: "Hips (back legs)", s: clip.signals.pelvis, key: "pelvis" },
  ];
  const until = t ?? Infinity;
  return (
    <div className="space-y-4">
      {rows.map(({ label, s, key }) => {
        if (!s || s.t.length < 2) return null;
        const { X, Y } = geometry(s);
        const d = pathUpTo(s, X, Y, until);
        const passed = s.troughs.filter((i) => s.t[i] !== undefined && s.t[i] <= until && s.y[i] !== null);
        const flagged = (scores || warn) && clip.result.key === key && !clip.result.healthy;
        const asym = key === "head" ? clip.result.head_asym : clip.result.pelvis_asym;
        // the step set whose low points sit higher = the leg the body spares
        const ev = s.troughs.filter((_, n) => n % 2 === 0).map((i) => s.y[i] ?? 0);
        const od = s.troughs.filter((_, n) => n % 2 === 1).map((i) => s.y[i] ?? 0);
        const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
        const highParity = mean(ev) >= mean(od) ? 0 : 1;
        const head = Number.isFinite(until) ? Math.min(W, X(until)) : null;
        return (
          <figure key={key} className="space-y-1">
            <figcaption className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold">{label}</span>
              {flagged ? (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white tnum" style={{ background: WARN }}>
                  <WarningCircle size={14} weight="bold" aria-hidden /> {asym === null ? "Uneven" : `${Math.round(asym)}% uneven`}
                </span>
              ) : (
                <span className="tnum text-muted">
                  {scores ? (asym === null ? "not readable" : `${Math.round(asym)}% uneven`) : `${passed.length} steps`}
                </span>
              )}
            </figcaption>
            <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label={`${label} up and down movement`}>
              <line x1={0} x2={W} y1={H - 1} y2={H - 1} stroke="var(--line)" />
              {flagged && <rect x={0} y={0} width={W} height={H} fill={WARN} fillOpacity={0.06} rx={4} />}
              <path d={d} fill="none" stroke={flagged ? WARN : "var(--muted)"} strokeWidth={flagged ? 2.4 : 1.6} strokeLinejoin="round" />
              {passed.map((i) => {
                const n = s.troughs.indexOf(i);
                const high = n % 2 === highParity;
                const fill = flagged ? (high ? WARN : "var(--ink)") : n % 2 === 0 ? "var(--accent)" : "var(--ink)";
                return (
                  <circle
                    key={i}
                    cx={X(s.t[i])}
                    cy={Y(s.y[i])}
                    r={flagged && high ? 5 : 4}
                    fill={fill}
                    stroke={flagged && high ? "white" : "var(--ink)"}
                    strokeWidth={flagged && high ? 1.5 : n % 2 === 0 ? 1 : 0}
                  />
                );
              })}
              {head !== null && <line x1={head} x2={head} y1={0} y2={H} stroke="var(--ink)" strokeOpacity={0.35} strokeDasharray="3 3" />}
            </svg>
          </figure>
        );
      })}
    </div>
  );
}

/** What the dots on the rhythm traces mean, with the research behind the method. */
export function TraceNote() {
  return (
    <p className="text-xs text-muted">
      Yellow and black dots are the lowest point of alternate steps. With a sore leg the body drops less while that leg carries
      weight, so one colour sits higher than the other (Gómez Álvarez et al. 2017; Bergh et al. 2018).
    </p>
  );
}
