"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { STATUS_TONE } from "@/components/ResultCard";
import { BB_CAP, BB_TIERS, CHECKIN_EXTRA } from "@/lib/blackbox";
import { TIERS } from "@/lib/discount";
import { CLAIM_COST_PER_POLICY, DEFAULT_BLACKBOX, DEFAULT_BUSINESS, PRICING, blackBoxCase, businessCase, insurerKpis, type BlackBoxInput, type BusinessInput, type PricingModel } from "@/lib/partnerModel";

type Tab = "insurer" | "underwriter" | "blackbox";
const TABS: { id: Tab; label: string }[] = [
  { id: "insurer", label: "Insurer" },
  { id: "underwriter", label: "Underwriter" },
  { id: "blackbox", label: "Petra Savings" },
];

const pct = (v: number, dp = 0) => `${(v * 100).toFixed(dp)}%`;
const k = (n: number) => (Math.abs(n) >= 1_000_000 ? `£${(n / 1_000_000).toFixed(2)}m` : `£${Math.round(n / 1000).toLocaleString("en-GB")}k`);

// Illustrative live queue a vet group or insurer would see (synthetic records).
const QUEUE = [
  { pet: "Biscuit, Labrador, 8", signal: "Thirst up and stiffness; activity down 30% in 10 days", status: "amber", action: "Online consult booked" },
  { pet: "Miso, British Shorthair, 4", signal: "Straining to urinate", status: "red", action: "Emergency vet directed" },
  { pet: "Luna, Cockapoo, 3", signal: "Itchy skin three weeks running", status: "amber", action: "Nurse call offered" },
  { pet: "Pip, rabbit, 2", signal: "Normal week", status: "green", action: "Check-in counted" },
] as const;

function Slider({ label, value, min, max, step, fmt, onChange, assumption = true }: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void; assumption?: boolean }) {
  return (
    <label className="block">
      <span className="flex justify-between gap-4 text-sm">
        <span>
          {label}
          {assumption && <span className="ml-1 text-xs text-muted">(assumption)</span>}
        </span>
        <span className="tnum font-semibold">{fmt(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[var(--ink)]" />
    </label>
  );
}

function Kpi({ label, value, dark = false, note }: { label: string; value: string; dark?: boolean; note?: string }) {
  return (
    <div className={dark ? "p-5 text-white" : "bg-paper p-5"} style={dark ? { background: "var(--dark)" } : undefined}>
      <dt className={dark ? "text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60" : "eyebrow"}>{label}</dt>
      <dd className={`mt-2 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl ${dark ? "text-accent" : ""}`}>{value}</dd>
      {note && <p className={`mt-1 text-xs ${dark ? "text-white/60" : "text-muted"}`}>{note}</p>}
    </div>
  );
}

function H({ n, children }: { n: string; children: ReactNode }) {
  return (
    <h2 className="eyebrow border-t border-line pt-3">
      <span className="tnum text-ink">{n}</span> / {children}
    </h2>
  );
}

// ---------- Insurer ----------

const FEE_CALC: Record<PricingModel, (i: BusinessInput, engaged: number) => string> = {
  perPolicy: (i) => `${i.policies.toLocaleString("en-GB")} × £0.40 × 12`,
  perMember: (_, e) => `${e.toLocaleString("en-GB")} × £1.25 × 12`,
  perClaimAvoided: () => "35% × claims avoided",
  hybrid: (_, e) => `${e.toLocaleString("en-GB")} × £1.25 × 12 + 20% × claims avoided`,
};

function InsurerTab({ inp, set }: { inp: BusinessInput; set: (p: Partial<BusinessInput>) => void }) {
  const b = businessCase(inp);
  const kpi = insurerKpis(inp);
  const rows: [ReactNode, string, number, boolean][] = [
    ["Claims cost on engaged members", `${b.engaged.toLocaleString("en-GB")} × £${Math.round(CLAIM_COST_PER_POLICY)}`, b.engagedClaims, false],
    [<strong key="a">Claims avoided or reduced (assume {pct(inp.claimsReduction)})</strong>, `${pct(inp.claimsReduction)} × ${k(b.engagedClaims)}`, b.claimsAvoided, true],
    [<strong key="b">Retention uplift (assume +{(inp.retentionUplift * 100).toFixed(0)} points, £{inp.avgPremium} premium, {pct(inp.margin)} margin)</strong>, `${b.retained.toLocaleString("en-GB")} × £${inp.avgPremium} × ${pct(inp.margin)}`, b.retentionValue, true],
    [`Platform fee (${PRICING[inp.pricing].label.toLowerCase()})`, FEE_CALC[inp.pricing](inp, b.engaged), -b.fee, false],
    [<strong key="c">Engagement discounts (average {pct(inp.avgDiscount, 1)} of premium)</strong>, `${b.engaged.toLocaleString("en-GB")} × £${inp.avgPremium} × ${pct(inp.avgDiscount, 1)}`, -b.discounts, true],
  ];
  const chart = [
    { name: "Not engaged", value: Math.round(b.perMemberBefore), fill: "#7E776D" },
    { name: "Engaged", value: Math.round(b.perMemberAfter), fill: "var(--dark)" },
  ];
  return (
    <div className="space-y-14">
      <section className="space-y-5">
        <H n="01">This week, illustrative insurer</H>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-brand border border-line bg-line lg:grid-cols-4">
          <Kpi label="Members" value={kpi.members.toLocaleString("en-GB")} />
          <Kpi label="Weekly active" value={pct(kpi.weeklyActive)} />
          <Kpi label="Average streak" value={`${kpi.avgStreak} weeks`} />
          <Kpi label="Amber flags this week" value={kpi.amberThisWeek.toLocaleString("en-GB")} />
          <Kpi label="Consults booked" value={kpi.consultsBooked.toLocaleString("en-GB")} />
          <Kpi label="Retention vs non-members" value={`+${(kpi.retentionGap * 100).toFixed(0)} pts`} />
          <Kpi label="Claims avoided a year" value={k(kpi.claimsAvoided)} dark />
          <Kpi label="Discounts paid a year" value={k(kpi.discountsPaid)} dark />
        </dl>
        <p className="text-xs text-muted">Synthetic portfolio for demonstration, scaled from the assumptions below.</p>
      </section>

      <section className="space-y-6">
        <H n="02">Pricing model</H>
        <div role="radiogroup" aria-label="Pricing model" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(PRICING) as PricingModel[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={inp.pricing === m}
              onClick={() => set({ pricing: m })}
              className={`rounded-brand border-2 p-4 text-left transition-colors ${inp.pricing === m ? "border-ink bg-accent-soft" : "border-line bg-white/50 hover:border-ink/40"}`}
            >
              <span className="block font-semibold">{PRICING[m].label}</span>
              <span className="mt-1 block text-sm text-muted">{PRICING[m].detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-4">
          <H n="03">Assumptions</H>
          <Slider label="Policies in book" value={inp.policies} min={10_000} max={1_000_000} step={10_000} fmt={(v) => v.toLocaleString("en-GB")} onChange={(v) => set({ policies: v })} assumption={false} />
          <Slider label="Engaged members" value={inp.engagement} min={0.05} max={0.8} step={0.05} fmt={(v) => pct(v)} onChange={(v) => set({ engagement: v })} />
          <Slider label="Claims reduction (engaged)" value={inp.claimsReduction} min={0} max={0.3} step={0.01} fmt={(v) => pct(v)} onChange={(v) => set({ claimsReduction: v })} />
          <Slider label="Average premium a year" value={inp.avgPremium} min={150} max={600} step={10} fmt={(v) => `£${v}`} onChange={(v) => set({ avgPremium: v })} />
          <Slider label="Average discount" value={inp.avgDiscount} min={0} max={0.15} step={0.005} fmt={(v) => pct(v, 1)} onChange={(v) => set({ avgDiscount: v })} />
          <Slider label="Retention uplift" value={inp.retentionUplift} min={0} max={0.1} step={0.005} fmt={(v) => `+${(v * 100).toFixed(1)} pts`} onChange={(v) => set({ retentionUplift: v })} />
        </div>
        <div className="min-w-0 space-y-5 lg:col-span-8">
          <H n="04">Business case, a year</H>
          <div className="overflow-x-auto">
            <table className="tnum w-full text-left text-sm sm:min-w-[34rem]">
              <thead>
                <tr className="border-b border-ink/30">
                  <th className="py-2 pr-4 font-semibold">Line</th>
                  <th className="hidden py-2 pr-4 font-semibold sm:table-cell">Calculation</th>
                  <th className="py-2 text-right font-semibold">Annual</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([line, calc, v, a], i) => (
                  <tr key={i} className="border-b border-line align-top">
                    <td className="py-2 pr-4">{line}</td>
                    <td className="hidden py-2 pr-4 text-muted sm:table-cell">{calc}</td>
                    <td className={`whitespace-nowrap py-2 text-right ${a ? "font-semibold" : ""}`}>{i === 0 ? k(v) : `${v >= 0 ? "+" : "−"}${k(Math.abs(v))}`}</td>
                  </tr>
                ))}
                <tr className="border-b-2 border-ink">
                  <td className="py-3 pr-4 text-base font-semibold">Net benefit to insurer and underwriter</td>
                  <td className="hidden sm:table-cell" />
                  <td className="whitespace-nowrap py-3 text-right text-lg font-semibold">{`${b.net >= 0 ? "+" : "−"}${k(Math.abs(b.net))}`}</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2 pr-4">Break-even claims reduction (ignoring retention)</td>
                  <td className="hidden sm:table-cell" />
                  <td className="py-2 text-right font-semibold">{pct(b.breakEven, 1)}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Break-even including retention</td>
                  <td className="hidden sm:table-cell" />
                  <td className="py-2 text-right font-semibold">{pct(b.breakEvenWithRetention, 1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">Base data: UK average claim £685, about 0.39 claims a policy a year (reading guide). Lines in bold are assumptions to test in a pilot against a control group.</p>

          <figure className="pt-4">
            <figcaption className="text-sm font-semibold">Claims cost per member a year, engaged vs not engaged (synthetic)</figcaption>
            <div className="mt-2 h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 0 }} barCategoryGap={14}>
                  <XAxis type="number" hide domain={[0, Math.round(b.perMemberBefore * 1.1)]} />
                  <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#141414" }} />
                  <Bar dataKey="value" barSize={22} radius={4} isAnimationActive={false}>
                    {chart.map((c) => (
                      <Cell key={c.name} fill={c.fill} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={(v) => `£${v}`} style={{ fontSize: 12, fontWeight: 600, fill: "#141414" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </figure>
        </div>
      </section>

      <section className="space-y-4">
        <H n="05">This week&apos;s early-warning queue</H>
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
        <p className="text-xs text-muted">Synthetic records. The insurer sees engagement and aggregates only; this queue is the vet partner&apos;s view. Also as JSON: GET /api/economics</p>
      </section>
    </div>
  );
}

// ---------- Underwriter ----------

const MATRIX: [string, string, string, boolean][] = [
  ["Engagement (check-ins, walks, target met yes or no)", "Per policy, consented", "To apply the discount", false],
  ["Health trend indices (mobility, breathing, weight, activity)", "Aggregated and anonymised by cohort (species, breed, age band)", "Portfolio risk insight, future pricing research", false],
  ["Early-intervention events (amber, consult, outcome)", "Aggregated", "Prove claims avoided; outcome bonus", false],
  ["Claims linkage", "Pseudonymised, for the control-cohort study", "Measure the business case honestly", false],
  ["Raw video, audio, photos, home imagery", "Never shared", "Not needed; privacy risk", true],
  ["Walk routes and locations", "Never shared: stay on the owner's phone", "Not needed; location is sensitive personal data", true],
];

const RULES = [
  ["Discount-only", "Data can lower a premium, never raise it or be used to refuse cover. No surcharges."],
  ["No new exclusions", "Nothing the app spots is used to add an exclusion at renewal. Otherwise owners would hide problems."],
  ["Reward behaviour, not health", "The discount is for check-ins and walks, so owners of older or ill pets earn it equally."],
  ["Personal, fair targets", "Savings targets are normalised for breed, age and health: a senior Pug and a young Collie can both earn the full discount."],
  ["Rest mode", "When a vet advises rest, targets pause and the discount is protected."],
  ["Data minimisation", "Derived signals only. No location data and no raw video ever reach the insurer or underwriter."],
  ["Granular, revocable consent", "UK GDPR: separate choices for vet sharing, insurer engagement data and anonymised research."],
  ["Human vet in the loop", "AI does triage and monitoring, never diagnosis or prescribing (Veterinary Surgeons Act 1966; RCVS)."],
  ["Consumer Duty", "FCA Consumer Duty: fair value and clear communications; the reward is never tied to buying products."],
  ["Explainable, governed", "Discount rules are published and explainable; bias checks across breeds and species; audit log."],
];

function UnderwriterTab({ inp }: { inp: BusinessInput }) {
  const b = businessCase(inp);
  const [ck, setCk] = useState<{ checkins: number; pct: number }[]>(TIERS.map((t) => ({ ...t })));
  const [bb, setBb] = useState<{ ratio: number; pct: number }[]>(BB_TIERS.map((t) => ({ ...t })));
  return (
    <div className="space-y-14">
      <section className="space-y-5">
        <H n="01">Loss ratio impact (whole book)</H>
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-brand border border-line bg-line sm:grid-cols-3">
          <Kpi label="Baseline loss ratio" value={pct(b.lossBefore, 1)} note={`Claims £${Math.round(CLAIM_COST_PER_POLICY)} a policy on a £${inp.avgPremium} premium`} />
          <Kpi label="With Petra" value={pct(b.lossAfter, 1)} note="Claims avoided, net of discounts" />
          <Kpi label="Change" value={`${((b.lossAfter - b.lossBefore) * 100).toFixed(1)} pts`} dark note="Moves with the insurer tab assumptions" />
        </dl>
        <p className="text-xs text-muted">Illustrative: the average premium is an assumption to verify before the pitch.</p>
      </section>

      <section className="space-y-5">
        <H n="02">Discount engine (editable, illustrative)</H>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="font-semibold">Check-ins in the policy year</p>
            {ck.map((t, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <input aria-label={`Check-ins for tier ${i + 1}`} type="number" min={1} max={52} value={t.checkins} onChange={(e) => setCk(ck.map((x, j) => (j === i ? { ...x, checkins: Number(e.target.value) } : x)))} className="tnum min-h-11 w-20 rounded-brand border border-line bg-white/70 px-2" />
                check-ins earn
                <input aria-label={`Discount for tier ${i + 1}`} type="number" min={0} max={20} step={0.5} value={t.pct} onChange={(e) => setCk(ck.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))} className="tnum min-h-11 w-20 rounded-brand border border-line bg-white/70 px-2" />% off
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <p className="font-semibold">Petra Savings: weeks with the personal target met</p>
            {bb.map((t, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <input aria-label={`Share of weeks for savings tier ${i + 1}`} type="number" min={10} max={100} value={Math.round(t.ratio * 100)} onChange={(e) => setBb(bb.map((x, j) => (j === i ? { ...x, ratio: Number(e.target.value) / 100 } : x)))} className="tnum min-h-11 w-20 rounded-brand border border-line bg-white/70 px-2" />
                % of weeks earn
                <input aria-label={`Discount for savings tier ${i + 1}`} type="number" min={0} max={20} step={0.5} value={t.pct} onChange={(e) => setBb(bb.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))} className="tnum min-h-11 w-20 rounded-brand border border-line bg-white/70 px-2" />% off
              </div>
            ))}
            <p className="text-sm text-muted">Plus up to {CHECKIN_EXTRA.at(-1)!.pct}% for weekly check-ins; capped at {BB_CAP}%.</p>
          </div>
        </div>
        <p className="text-sm">
          At these assumptions the book pays <strong>{k(b.discounts)}</strong> in discounts a year against <strong>{k(b.claimsAvoided)}</strong> of claims avoided: {b.claimsAvoided > b.discounts ? "the discount is funded by the claims it prevents." : "discounts exceed claims avoided; lower the tiers or raise engagement."}
        </p>
        <p className="text-xs text-muted">Editing here changes this model only. Production tiers would be agreed with the underwriter and published to owners.</p>
      </section>

      <section className="space-y-5">
        <H n="03">Data-use matrix</H>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/30">
                <th className="py-2 pr-4 font-semibold">Data</th>
                <th className="py-2 pr-4 font-semibold">Shared with the underwriter as</th>
                <th className="py-2 font-semibold">Why</th>
              </tr>
            </thead>
            <tbody>
              {MATRIX.map(([d, form, why, never]) => (
                <tr key={d} className="border-b border-line align-top">
                  <td className={`py-2 pr-4 ${never ? "font-semibold" : ""}`}>{d}</td>
                  <td className={`py-2 pr-4 ${never ? "font-semibold" : ""}`}>{form}</td>
                  <td className="py-2 text-muted">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-5">
        <H n="04">Fairness rules and regulation</H>
        <ol className="grid gap-px overflow-hidden rounded-brand border border-line bg-line sm:grid-cols-2">
          {RULES.map(([t, d], i) => (
            <li key={t} className="bg-paper p-5">
              <p className="eyebrow">
                <span className="tnum text-ink">{String(i + 1).padStart(2, "0")}</span>
              </p>
              <p className="mt-2 font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
        <p className="text-sm">
          Activity data is a <strong>discount-only pricing input</strong>. UK GDPR applies to location and owner data, which is why routes never leave the phone; FCA Consumer Duty requires fair value and explainable rules, which is why tiers are published.
        </p>
      </section>
    </div>
  );
}

// ---------- Black Box ----------

function BlackBoxTab() {
  const [inp, setInp] = useState<BlackBoxInput>(DEFAULT_BLACKBOX);
  const set = (p: Partial<BlackBoxInput>) => setInp((x) => ({ ...x, ...p }));
  const b = blackBoxCase(inp);
  return (
    <div className="space-y-14">
      <section className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-4">
          <H n="01">Assumptions</H>
          <Slider label="Adoption (share of policies)" value={inp.adoption} min={0.02} max={0.5} step={0.01} fmt={(v) => pct(v)} onChange={(v) => set({ adoption: v })} />
          <Slider label="Members hitting targets" value={inp.hitRate} min={0.2} max={0.95} step={0.05} fmt={(v) => pct(v)} onChange={(v) => set({ hitRate: v })} />
          <Slider label="Extra claims reduction" value={inp.extraReduction} min={0} max={0.3} step={0.01} fmt={(v) => pct(v)} onChange={(v) => set({ extraReduction: v })} />
          <Slider label="Average discount when hitting targets" value={inp.discount} min={0} max={0.15} step={0.005} fmt={(v) => pct(v, 1)} onChange={(v) => set({ discount: v })} />
          <Slider label="Retention uplift (members)" value={inp.retentionUplift} min={0} max={0.15} step={0.01} fmt={(v) => `+${(v * 100).toFixed(0)} pts`} onChange={(v) => set({ retentionUplift: v })} />
        </div>
        <div className="space-y-5 lg:col-span-8">
          <H n="02">A year with Petra Savings</H>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-brand border border-line bg-line lg:grid-cols-4">
            <Kpi label="Petra Savings members" value={b.members.toLocaleString("en-GB")} />
            <Kpi label="Hitting targets" value={b.hitting.toLocaleString("en-GB")} />
            <Kpi label="Early-warning flags" value={b.flags.toLocaleString("en-GB")} note="Sustained activity changes" />
            <Kpi label="Consults triggered" value={b.consults.toLocaleString("en-GB")} />
            <Kpi label="Claims avoided" value={k(b.claimsAvoided)} />
            <Kpi label="Discounts paid" value={k(b.discounts)} />
            <Kpi label="Retention value" value={k(b.retentionValue)} />
            <Kpi label="Net benefit" value={`${b.net >= 0 ? "+" : "−"}${k(Math.abs(b.net))}`} dark />
          </dl>
          <p className="text-xs text-muted">Illustrative. The early-warning rate (8% of members a year) and the extra claims reduction are assumptions to measure in the pilot.</p>
        </div>
      </section>

      <section className="space-y-5">
        <H n="03">Hardware economics</H>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-4">
            <Slider label="Collar cost to make" value={inp.collarCost} min={40} max={60} step={1} fmt={(v) => `£${v}`} onChange={(v) => set({ collarCost: v })} />
            <div role="radiogroup" aria-label="Collar offer" className="grid gap-2">
              {(
                [
                  ["free2yr", "Free with a 2-year policy", "The insurer pays; cost spread over two years."],
                  ["bundled", "£5 a month, bundled", "The owner pays with the premium; pays back in months."],
                ] as const
              ).map(([id, t, d]) => (
                <button key={id} type="button" role="radio" aria-checked={inp.offer === id} onClick={() => set({ offer: id })} className={`rounded-brand border-2 p-4 text-left transition-colors ${inp.offer === id ? "border-ink bg-accent-soft" : "border-line bg-white/50 hover:border-ink/40"}`}>
                  <span className="block font-semibold">{t}</span>
                  <span className="mt-1 block text-sm text-muted">{d}</span>
                </button>
              ))}
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-px self-start overflow-hidden rounded-brand border border-line bg-line sm:grid-cols-3 lg:col-span-8">
            <Kpi label={inp.offer === "free2yr" ? "Hardware cost a year" : "Bundle income after cost"} value={inp.offer === "free2yr" ? k(b.hardwareYear) : k(b.bundleIncome)} />
            <Kpi label="Payback per collar" value={Number.isFinite(b.paybackMonths) ? `${b.paybackMonths} months` : "Not at these inputs"} />
            <Kpi label="Net benefit a year" value={`${b.net >= 0 ? "+" : "−"}${k(Math.abs(b.net))}`} dark />
          </dl>
        </div>
        <p className="text-xs text-muted">Collar build cost of £40 to £60 is illustrative. Until a collar arrives, the owner&apos;s phone does the job for walks.</p>
      </section>

      <section className="space-y-5">
        <H n="04">Why younger owners</H>
        <ol className="grid gap-px overflow-hidden rounded-brand border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["The telematics playbook", "Black boxes made car insurance affordable for young drivers by rewarding good driving. The same deal works for pet care."],
            ["Pets are family", "69% of Millennials and Gen Z say their pet is family (reading guide). They want to do the right thing, and to see it count."],
            ["Price sensitive", "Vet prices up about 75% in ten years; younger owners feel premiums most. A visible way to pay less is a reason to choose you."],
            ["An acquisition channel", "A collar and a cheaper premium is a story people share. Every walk is a weekly touchpoint with your brand."],
          ].map(([t, d]) => (
            <li key={t} className="bg-paper p-5">
              <p className="font-semibold">{t}</p>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/** Partner view: insurer, underwriter and Petra Savings (code name: Black Box). A 100,000-policy illustrative insurer by default. */
export default function PartnerPage() {
  const [tab, setTab] = useState<Tab>("insurer");
  const [inp, setInp] = useState<BusinessInput>(DEFAULT_BUSINESS);
  const set = (p: Partial<BusinessInput>) => setInp((x) => ({ ...x, ...p }));

  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (h === "underwriter" || h === "blackbox") setTab(h); // eslint-disable-line react-hooks/set-state-in-effect -- deep link after mount
  }, []);

  return (
    <div className="space-y-10 py-4 sm:py-8">
      <header className="max-w-3xl">
        <p className="eyebrow">Petra / For insurers</p>
        <h1 className="display mt-3 text-[clamp(2.5rem,7vw,5.5rem)]">
          Prevention that <span className="accent-word">pays.</span>
        </h1>
        <p className="mt-4 text-lg text-muted">For the insurer that owns the app, the underwriter that carries the risk, and Petra Savings, which rewards good care.</p>
      </header>

      <div role="tablist" aria-label="Partner views" className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => {
              setTab(t.id);
              history.replaceState(null, "", `#${t.id}`);
            }}
            className={`-mb-px min-h-12 border-b-2 px-4 font-semibold transition-colors ${tab === t.id ? "border-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "insurer" ? <InsurerTab inp={inp} set={set} /> : tab === "underwriter" ? <UnderwriterTab inp={inp} /> : <BlackBoxTab />}
      </div>
    </div>
  );
}
