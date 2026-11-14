"use client";

import { useMemo, useState } from "react";
import { DEFAULT_ECONOMICS, computeEconomics, gbp, type EconomicsInput } from "@/lib/economics";
import { STATUS_TONE } from "@/components/ResultCard";

const SLIDERS: { key: keyof EconomicsInput; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[] = [
  { key: "policies", label: "Policies in book", min: 10_000, max: 1_000_000, step: 10_000, fmt: (v) => v.toLocaleString("en-GB") },
  { key: "engagementRate", label: "Owners doing weekly check-ins", min: 0.05, max: 0.8, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: "claimCostReduction", label: "Claim cost reduction (engaged pets)", min: 0, max: 0.3, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: "feePerPetMonth", label: "Platform fee per engaged pet a month", min: 0.25, max: 3, step: 0.25, fmt: (v) => `£${v.toFixed(2)}` },
  { key: "creditsPerPetYear", label: "Rewards funded per pet a year", min: 0, max: 30, step: 1, fmt: (v) => `£${v}` },
];

// Illustrative early-warning queue an insurer or vet group would see (synthetic records).
const QUEUE = [
  { pet: "Biscuit, Labrador, 8", signal: "Thirst up and stiffness, 14 points below own baseline", status: "amber", action: "Online consult booked" },
  { pet: "Miso, British Shorthair, 4", signal: "Straining to urinate", status: "red", action: "Emergency vet directed" },
  { pet: "Luna, Cockapoo, 3", signal: "Itchy skin three weeks running", status: "amber", action: "Nurse call offered" },
  { pet: "Pip, rabbit, 2", signal: "Normal week", status: "green", action: "Check-in counted" },
] as const;

/** Partner view for an insurer or vet group: the shared-savings model. Rebuilt with Black Box tabs in Part D. */
export default function PartnerPage() {
  const [inp, setInp] = useState<EconomicsInput>(DEFAULT_ECONOMICS);
  const out = useMemo(() => computeEconomics(inp), [inp]);

  return (
    <div className="space-y-12 py-4 sm:py-8">
      <header className="max-w-3xl">
        <p className="eyebrow">Prevently / For insurers</p>
        <h1 className="display mt-3 text-[clamp(2.5rem,7vw,5.5rem)]">
          Prevention that <span className="accent-word">pays.</span>
        </h1>
        <p className="mt-4 text-lg text-muted">
          Shared-savings model. Base data from the reading guide: UK average claim £685, about 0.39 claims per policy a year. Everything else is an adjustable assumption.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-5">
          {SLIDERS.map((s) => (
            <label key={s.key} className="block">
              <span className="flex justify-between gap-4 text-sm">
                <span>{s.label}</span>
                <span className="tnum font-semibold">{s.fmt(inp[s.key])}</span>
              </span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={inp[s.key]}
                onChange={(e) => setInp({ ...inp, [s.key]: Number(e.target.value) })}
                className="mt-2 w-full accent-[var(--ink)]"
              />
            </label>
          ))}
        </div>

        <dl className="grid grid-cols-2 gap-px self-start overflow-hidden rounded-brand border border-line bg-line lg:col-span-7">
          {[
            { l: "Engaged pets", v: out.engagedPets.toLocaleString("en-GB") },
            { l: "Claim cost on engaged pets", v: gbp(out.engagedClaimCost) },
            { l: "Gross claims saved", v: gbp(out.grossSavings) },
            { l: "Cost (fees and rewards)", v: gbp(out.platformFees + out.creditsCost) },
          ].map((k) => (
            <div key={k.l} className="bg-paper p-5">
              <dt className="eyebrow">{k.l}</dt>
              <dd className="mt-2 text-2xl font-semibold tracking-[-0.02em]">{k.v}</dd>
            </div>
          ))}
          {[
            { l: "Net benefit to partner", v: gbp(out.netBenefit) },
            { l: "Return on cost", v: `${out.roi.toFixed(1)}x` },
          ].map((k) => (
            <div key={k.l} className="p-5 text-white" style={{ background: "var(--dark)" }}>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">{k.l}</dt>
              <dd className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-accent">{k.v}</dd>
            </div>
          ))}
          <div className="col-span-2 bg-paper p-5 text-sm">
            Break-even needs only a <strong>{(out.breakEvenReduction * 100).toFixed(1)}%</strong> reduction in claim cost among engaged pets.
          </div>
        </dl>
      </div>

      <section className="space-y-4">
        <h2 className="eyebrow border-t border-line pt-3">This week&apos;s early-warning queue</h2>
        <ul className="divide-y divide-line border-y border-line">
          {QUEUE.map((q) => {
            const t = STATUS_TONE[q.status];
            return (
              <li key={q.pet} className="grid gap-2 py-3 text-sm sm:grid-cols-[auto_14rem_1fr_auto] sm:items-center sm:gap-4">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ color: t.fg, background: t.bg }}>
                  <t.Icon size={14} weight="fill" aria-hidden /> {t.label}
                </span>
                <span className="font-semibold">{q.pet}</span>
                <span className="text-muted">{q.signal}</span>
                <span className="text-xs text-muted">{q.action}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted">Synthetic records for demonstration. Also available as JSON: GET /api/economics</p>
      </section>
    </div>
  );
}
