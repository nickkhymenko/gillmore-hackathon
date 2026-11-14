"use client";

import { useState } from "react";
import { ArrowUpRight, CheckCircle, FirstAid, WarningCircle } from "@phosphor-icons/react";
import { PilotSheet } from "./Sheet";
import { ACTION_LABEL, type CheckinResult } from "@/lib/types";

/** Status colours: reserved for green/amber/red meaning, always with an icon and a label. */
export const STATUS_TONE = {
  green: { label: "On track", fg: "#1D6B43", bg: "#E2F0E6", Icon: CheckCircle },
  amber: { label: "Worth a vet's view", fg: "#8A4B00", bg: "#FBEACB", Icon: WarningCircle },
  red: { label: "Act now", fg: "#9E2318", bg: "#F8DCD7", Icon: FirstAid },
} as const;

export function StatusPill({ status }: { status: CheckinResult["status"] }) {
  const t = STATUS_TONE[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold" style={{ color: t.fg, background: t.bg }}>
      <t.Icon size={16} weight="fill" aria-hidden /> {t.label}
    </span>
  );
}

/** The check-in result: status, score against the pet's own baseline, next step, and the vet brief. */
export function ResultCard({ r, compact = false }: { r: CheckinResult; compact?: boolean }) {
  const [sheet, setSheet] = useState<string | null>(null);
  const urgent = r.nextStep.action !== "keep_monitoring";
  return (
    <article className="fade-up space-y-6 rounded-brand border border-line bg-white/60 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusPill status={r.status} />
        <span className="text-xs text-muted">
          {r.source === "gemini" ? "Assessed by AI with safety rules" : "Assessed by safety rules"}
          {r.safetyOverride ? ", escalated by the safety layer" : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="eyebrow">Health score</p>
          <p className="text-6xl font-semibold tracking-[-0.04em]">
            {r.healthScore}
            <span className="text-xl font-medium text-muted">/100</span>
          </p>
        </div>
        {r.trend.baseline !== null && r.trend.delta !== null && (
          <div>
            <p className="eyebrow">Against own usual</p>
            <p className="text-2xl font-semibold tracking-[-0.02em]">
              {r.trend.delta > 0 ? "+" : ""}
              {r.trend.delta} <span className="text-base font-medium text-muted">vs {r.trend.baseline}</span>
            </p>
          </div>
        )}
        {r.creditsEarned > 0 && (
          <div>
            <p className="eyebrow">Counts towards</p>
            <p className="text-2xl font-semibold tracking-[-0.02em]">your discount</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-2xl font-semibold tracking-[-0.03em]">{r.headline}</h3>
        <p className="mt-2 max-w-[60ch] text-muted">{r.ownerMessage}</p>
        {r.trend.note && <p className="mt-2 max-w-[60ch] text-sm">{r.trend.note}</p>}
      </div>

      <div className="border-t border-line pt-5">
        <p className="eyebrow">Next step</p>
        <p className="mt-1 text-xl font-semibold tracking-[-0.02em]">{ACTION_LABEL[r.nextStep.action]}</p>
        <p className="mt-1 text-sm text-muted">{r.nextStep.rationale}</p>
        {urgent && (
          <button
            type="button"
            onClick={() => setSheet(r.nextStep.action === "emergency_now" ? "Finding the nearest emergency vet" : "Booking an online vet consult with the brief attached")}
            className="btn btn-primary mt-4"
          >
            {r.nextStep.action === "emergency_now" ? "Find nearest emergency vet" : "Book online consult, brief attached"} <ArrowUpRight size={18} weight="bold" aria-hidden />
          </button>
        )}
      </div>

      {!compact && r.flags.length > 0 && (
        <div className="border-t border-line pt-5">
          <p className="eyebrow">What we noticed</p>
          <ul className="mt-3 divide-y divide-line">
            {r.flags.map((f, i) => (
              <li key={i} className="py-3 text-sm">
                <span className="font-semibold">{f.area}</span> <span className="ml-1 text-xs uppercase tracking-wider text-muted">{f.urgency}</span>
                <p>{f.observation}</p>
                <p className="text-muted">{f.whyItMatters}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && r.photoObservations && (
        <div className="border-t border-line pt-5 text-sm">
          <p className="eyebrow">From the photo</p>
          <p className="mt-1">{r.photoObservations}</p>
        </div>
      )}

      {!compact && r.preventionTips.length > 0 && (
        <div className="border-t border-line pt-5 text-sm">
          <p className="eyebrow">Prevention tips</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {r.preventionTips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {r.vetBrief && (
        <details className="border-t border-line pt-5 text-sm">
          <summary className="cursor-pointer font-semibold">Vet brief, ready to send if you choose</summary>
          <p className="mt-2 whitespace-pre-wrap rounded-brand bg-ink/[0.04] p-3 font-mono text-xs">{r.vetBrief}</p>
        </details>
      )}

      {r.disclaimer && <p className="text-xs text-muted">{r.disclaimer}</p>}
      <PilotSheet open={sheet !== null} onClose={() => setSheet(null)} what={sheet ?? ""} />
    </article>
  );
}
