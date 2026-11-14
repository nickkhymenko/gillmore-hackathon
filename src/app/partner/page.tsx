"use client";

import { useMemo, useState } from "react";
import { DEFAULT_ECONOMICS, computeEconomics, gbp, type EconomicsInput } from "@/lib/economics";

const SLIDERS: { key: keyof EconomicsInput; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[] = [
  { key: "policies", label: "Policies in book", min: 10_000, max: 1_000_000, step: 10_000, fmt: (v) => v.toLocaleString("en-GB") },
  { key: "engagementRate", label: "Owners doing weekly check-ins", min: 0.05, max: 0.8, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: "claimCostReduction", label: "Claim cost reduction (engaged pets)", min: 0, max: 0.3, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: "feePerPetMonth", label: "Platform fee per engaged pet / month", min: 0.25, max: 3, step: 0.25, fmt: (v) => `£${v.toFixed(2)}` },
  { key: "creditsPerPetYear", label: "Prevention Credits funded per pet / year", min: 0, max: 30, step: 1, fmt: (v) => `£${v}` },
];

// Illustrative live queue a vet group or insurer would see (synthetic data).
const QUEUE = [
  { pet: "Biscuit, Labrador 8y", signal: "Thirst up + stiffness, 14 pts below baseline", status: "amber", action: "Online consult booked" },
  { pet: "Miso, British SH 4y", signal: "Straining to urinate", status: "red", action: "Emergency vet directed" },
  { pet: "Luna, Cockapoo 3y", signal: "Itchy skin 3 weeks running", status: "amber", action: "Nurse call offered" },
  { pet: "Pip, Rabbit 2y", signal: "Normal week", status: "green", action: "Credits issued" },
] as const;

const DOT = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-600" } as const;

export default function PartnerPage() {
  const [inp, setInp] = useState<EconomicsInput>(DEFAULT_ECONOMICS);
  const out = useMemo(() => computeEconomics(inp), [inp]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Partner view: insurer / vet group</h1>
        <p className="text-sm text-teal-900/70">
          Shared-savings model. Base data: UK average claim £685, about 0.39 claims per policy per year (reading guide). Other values are adjustable assumptions.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-teal-900/5">
          {SLIDERS.map((s) => (
            <label key={s.key} className="block">
              <div className="flex justify-between text-sm">
                <span>{s.label}</span>
                <span className="font-semibold text-teal-800">{s.fmt(inp[s.key])}</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={inp[s.key]}
                onChange={(e) => setInp({ ...inp, [s.key]: Number(e.target.value) })}
                className="w-full accent-teal-700"
              />
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { l: "Engaged pets", v: out.engagedPets.toLocaleString("en-GB") },
            { l: "Claim cost on engaged pets", v: gbp(out.engagedClaimCost) },
            { l: "Gross claims saved", v: gbp(out.grossSavings) },
            { l: "Cost (fees + credits)", v: gbp(out.platformFees + out.creditsCost) },
            { l: "Net benefit to partner", v: gbp(out.netBenefit), hi: true },
            { l: "ROI", v: `${out.roi.toFixed(1)}x`, hi: true },
          ].map((k) => (
            <div key={k.l} className={`rounded-2xl p-4 shadow-sm ${k.hi ? "bg-teal-700 text-white" : "bg-white ring-1 ring-teal-900/5"}`}>
              <div className={`text-xs ${k.hi ? "text-teal-100" : "text-teal-900/60"}`}>{k.l}</div>
              <div className="mt-1 text-xl font-bold">{k.v}</div>
            </div>
          ))}
          <div className="col-span-2 rounded-2xl bg-amber-50 p-4 text-sm ring-1 ring-amber-200">
            Break-even needs only a <b>{(out.breakEvenReduction * 100).toFixed(1)}%</b> reduction in claim cost among engaged pets.
          </div>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-teal-900/5">
        <h2 className="font-semibold">This week&apos;s early-warning queue</h2>
        <ul className="mt-3 divide-y divide-teal-900/10">
          {QUEUE.map((q) => (
            <li key={q.pet} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${DOT[q.status]}`} />
              <span className="w-44 font-medium">{q.pet}</span>
              <span className="flex-1 text-teal-900/70">{q.signal}</span>
              <span className="text-xs text-teal-900/60">{q.action}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-teal-900/50">Synthetic records for demonstration. Also available as JSON: GET /api/economics</p>
      </section>
    </div>
  );
}
