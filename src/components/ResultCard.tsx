import { ACTION_LABEL, type CheckinResult } from "@/lib/types";

const TONE = {
  green: { ring: "ring-emerald-300", bg: "bg-emerald-50", pill: "bg-emerald-600", label: "Green: on track" },
  amber: { ring: "ring-amber-300", bg: "bg-amber-50", pill: "bg-amber-500", label: "Amber: get a vet's view" },
  red: { ring: "ring-red-300", bg: "bg-red-50", pill: "bg-red-600", label: "Red: act now" },
} as const;

export function ResultCard({ r }: { r: CheckinResult }) {
  const t = TONE[r.status];
  return (
    <div className={`space-y-5 rounded-3xl p-5 ring-2 ${t.ring} ${t.bg}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold text-white ${t.pill}`}>{t.label}</span>
        <span className="text-xs text-teal-900/60">
          {r.source === "gemini" ? "AI: Gemini (multimodal)" : "Demo mode: rules engine"}
          {r.safetyOverride ? " · safety layer escalated" : ""}
        </span>
      </div>

      <div className="flex items-end gap-4">
        <div className="text-5xl font-bold text-teal-900">{r.healthScore}</div>
        <div className="pb-1 text-sm text-teal-900/70">/100 health score</div>
        <div className="ml-auto rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
          <div className="text-lg font-bold text-teal-700">+{r.creditsEarned}</div>
          <div className="text-[11px] text-teal-900/60">Prevention Credits</div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">{r.headline}</h3>
        <p className="mt-1 text-teal-900/80">{r.ownerMessage}</p>
      </div>

      {r.trend.note && (
        <div className="rounded-2xl bg-white p-3 text-sm shadow-sm">
          <span className="font-semibold">Vs. own baseline: </span>
          {r.trend.note}
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-teal-900/60">Next step</div>
        <div className="mt-1 text-lg font-semibold">{ACTION_LABEL[r.nextStep.action]}</div>
        <p className="mt-1 text-sm text-teal-900/70">{r.nextStep.rationale}</p>
        {r.nextStep.action !== "keep_monitoring" && (
          <button className="mt-3 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
            {r.nextStep.action === "emergency_now" ? "Find nearest emergency vet" : "Book online consult (brief attached)"}
          </button>
        )}
      </div>

      {r.flags.length > 0 && (
        <div>
          <h4 className="font-semibold">What we noticed</h4>
          <ul className="mt-2 space-y-2">
            {r.flags.map((f, i) => (
              <li key={i} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                <span className="font-medium">{f.area}</span>{" "}
                <span className="rounded bg-teal-50 px-1.5 text-[11px] uppercase text-teal-800">{f.urgency}</span>
                <div className="text-teal-900/80">{f.observation}</div>
                <div className="text-xs text-teal-900/60">{f.whyItMatters}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.photoObservations && (
        <div className="text-sm">
          <h4 className="font-semibold">From the photo</h4>
          <p className="text-teal-900/80">{r.photoObservations}</p>
        </div>
      )}

      {r.preventionTips.length > 0 && (
        <div className="text-sm">
          <h4 className="font-semibold">Prevention tips</h4>
          <ul className="mt-1 list-disc pl-5 text-teal-900/80">
            {r.preventionTips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="rounded-2xl bg-white p-4 text-sm shadow-sm">
        <summary className="cursor-pointer font-semibold">Vet brief (sent ahead of the consult)</summary>
        <p className="mt-2 whitespace-pre-wrap font-mono text-xs text-teal-900/80">{r.vetBrief}</p>
      </details>

      <p className="text-xs text-teal-900/60">{r.disclaimer}</p>
    </div>
  );
}
