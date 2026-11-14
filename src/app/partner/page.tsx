"use client";

import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, EyeSlash, PawPrint, Scales, ShieldCheck, Stethoscope, X, type Icon } from "@phosphor-icons/react";
import { TOP_TIER_PCT } from "@/data/premiums";
import { CLAIM_COST_PER_POLICY, DEFAULT_BUSINESS, FIXED, PRICING, RECOMMENDED, businessCase, type BusinessInput, type PricingModel } from "@/lib/partnerModel";

const pct = (v: number, dp = 0) => `${(v * 100).toFixed(dp)}%`;
const k = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1_000_000 ? `£${(a / 1_000_000).toFixed(2)}m` : `£${Math.round(a / 1000).toLocaleString("en-GB")}k`;
  return n < 0 ? `−${s}` : s;
};
const SPRING = { type: "spring", stiffness: 180, damping: 24 } as const;

/** One idea per section, rising in as it is reached. */
function Section({ id, eyebrow, title, intro, children }: { id: string; eyebrow: string; title: ReactNode; intro?: ReactNode; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 space-y-8"
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={SPRING}
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={`${id}-title`} className="display mt-3 text-[clamp(2rem,4.6vw,3.25rem)]">
          {title}
        </h2>
        {intro && <p className="mx-auto mt-4 max-w-[56ch] text-lg text-muted">{intro}</p>}
      </div>
      {children}
    </motion.section>
  );
}

// ---------- 1. Four parties ----------

function parties(memberSaving: number, avoidedPerMember: number): [Icon, string, string, string][] {
  return [
    [PawPrint, "Pet parent", "Earlier care, and a premium that can only go down.", `Up to ${TOP_TIER_PCT}% off; about £${Math.round(memberSaving)} a year on average.`],
    [Stethoscope, "Vet", "Cases arrive earlier, with a brief and the trend history.", "More booked consults, cheaper to treat, less admin."],
    [ShieldCheck, "Insurer", "A weekly reason to open your app, and to renew.", `+${FIXED.retentionUplift * 100} points retention among engaged members.`],
    [Scales, "Underwriter", "Fewer, smaller, better-documented claims.", `About £${Math.round(avoidedPerMember)} less claims cost per engaged member a year.`],
  ];
}

// ---------- 2. Journey ----------

const JOURNEY: [string, string][] = [
  ["Onboard and consent", "One photo, one minute. Sharing stays off until the owner turns it on."],
  ["Baseline scan", "A first walk sets the pet's own baseline, not a breed average."],
  ["Weekly walks and check-ins", "A personal walk target and a 60-second check-in. The discount grows."],
  ["Early flag", "A sustained change against their own baseline raises an amber flag."],
  ["Online vet consult", "One tap. The vet gets a brief, the clip and the trend."],
  ["Vet visit", "Booked earlier, while treatment is simpler and cheaper."],
  ["Smaller claim", "Pre-documented and fast-tracked: smaller and less disputed."],
  ["Renewal with the discount", "The engagement discount is applied. Health data is never used against them."],
];

function Journey() {
  return (
    <ol className="relative mx-auto grid max-w-5xl gap-0 lg:max-w-none lg:grid-cols-8 lg:gap-4" data-testid="journey">
      {/* the line: down the left on a phone, across the top on a laptop */}
      <span aria-hidden className="absolute bottom-6 left-[15px] top-6 w-px bg-line lg:bottom-auto lg:left-[4%] lg:right-[4%] lg:top-[15px] lg:h-px lg:w-auto" />
      {JOURNEY.map(([t, d], i) => (
        <li key={t} className="relative flex gap-4 pb-6 last:pb-0 lg:flex-col lg:gap-3 lg:pb-0">
          <span className={`tnum relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${i === 3 ? "bg-accent text-ink" : "border border-line bg-surface"}`}>{i + 1}</span>
          <div>
            <p className="font-semibold leading-snug tracking-[-0.02em]">{t}</p>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------- 3. Calculator ----------

function Lever({ label, value, min, max, step, fmt, onChange }: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-4">
        <span className="text-sm">{label}</span>
        <span className="tnum text-lg font-semibold tracking-[-0.02em]">{fmt(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[var(--ink)]" />
    </label>
  );
}

function Stat({ label, value, note, strong = false, testId }: { label: string; value: string; note?: string; strong?: boolean; testId?: string }) {
  return (
    <div className={`p-5 sm:p-6 ${strong ? "bg-accent-soft" : "bg-surface"}`}>
      <dt className="eyebrow">{label}</dt>
      <dd className="tnum mt-2 text-[clamp(1.6rem,3.4vw,2.25rem)] font-semibold leading-none tracking-[-0.045em]" data-testid={testId}>
        {value}
      </dd>
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </div>
  );
}

function Calculator({ inp, set }: { inp: BusinessInput; set: (p: Partial<BusinessInput>) => void }) {
  const b = businessCase(inp);
  const sign = (n: number) => (n >= 0 ? `+${k(n)}` : k(n));
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="card space-y-6 p-6 sm:p-8 lg:col-span-4" role="group" aria-label="Business case inputs">
        <Lever label="Policies" value={inp.policies} min={10_000} max={1_000_000} step={10_000} fmt={(v) => v.toLocaleString("en-GB")} onChange={(v) => set({ policies: v })} />
        <Lever label="Engagement" value={inp.engagement} min={0.05} max={0.8} step={0.05} fmt={(v) => pct(v)} onChange={(v) => set({ engagement: v })} />
        <Lever label="Claims reduction" value={inp.claimsReduction} min={0} max={0.3} step={0.01} fmt={(v) => pct(v)} onChange={(v) => set({ claimsReduction: v })} />
        <Lever label="Average discount" value={inp.avgDiscount} min={0} max={0.15} step={0.005} fmt={(v) => pct(v, 1)} onChange={(v) => set({ avgDiscount: v })} />
        <button type="button" className="link text-sm" onClick={() => set({ ...DEFAULT_BUSINESS, pricing: inp.pricing })}>
          Back to the base case
        </button>
      </div>
      <div className="space-y-4 lg:col-span-8">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line shadow-soft sm:grid-cols-3" data-testid="business-case">
          <Stat label="Claims avoided" value={k(b.claimsAvoided)} note={`${pct(inp.claimsReduction)} of ${k(b.engagedClaims)} on ${b.engaged.toLocaleString("en-GB")} members`} testId="claims-avoided" />
          <Stat label="Retention value" value={k(b.retentionValue)} note="Kept margin and avoided acquisition cost" testId="retention-value" />
          <Stat label="Petra fees" value={k(-b.fees)} note={`${PRICING[inp.pricing].label}${inp.pricing === RECOMMENDED ? " (recommended)" : ""}`} testId="petra-fees" />
          <Stat label="Discounts to members" value={k(-b.discounts)} note={`${pct(inp.avgDiscount, 1)} of a £${FIXED.avgPremium} premium`} testId="discounts" />
          <Stat label="Return on cost" value={`${b.returnOnCost.toFixed(2)}x`} note="Benefit ÷ cost" testId="return" />
          <Stat label="Break-even" value={pct(b.breakEven, 1)} note="Claims reduction where net is zero" testId="break-even" />
        </dl>
        <div className={`flex flex-wrap items-baseline justify-between gap-3 rounded-card border-2 p-6 sm:p-7 ${b.net >= 0 ? "border-ink bg-surface" : "border-ink/30 bg-surface"}`}>
          <p className="text-lg font-semibold tracking-[-0.02em]">Net benefit to insurer and underwriter, a year</p>
          <p className="tnum text-[clamp(2.25rem,5vw,3.25rem)] font-semibold leading-none tracking-[-0.05em]" data-testid="net-benefit">
            {sign(b.net)}
          </p>
        </div>
        <p className="text-xs text-muted">
          Base scenario of the Petra financial model. Fixed: claims cost £{Math.round(CLAIM_COST_PER_POLICY)} a policy (£685 average claim, 0.39 claims a policy), £{FIXED.avgPremium} average premium (ABI 2024), +{FIXED.retentionUplift * 100} points retention at a {pct(FIXED.margin)} margin plus £{FIXED.cac} acquisition cost. The four levers are assumptions the pilot measures against a control group.
        </p>
      </div>
    </div>
  );
}

// ---------- 4. Pricing ----------

function Pricing({ inp, set }: { inp: BusinessInput; set: (p: Partial<BusinessInput>) => void }) {
  const models = Object.keys(PRICING) as PricingModel[];
  return (
    <div className="space-y-5">
      <div role="radiogroup" aria-label="Pricing model" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {models.map((m) => {
          const on = inp.pricing === m;
          const rec = m === RECOMMENDED;
          const fee = businessCase({ ...inp, pricing: m }).fees;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set({ pricing: m })}
              className={`relative flex flex-col rounded-card border-2 p-5 text-left transition-colors ${on ? "border-ink bg-surface shadow-soft" : rec ? "border-accent bg-accent-soft/60 hover:border-ink/40" : "border-line bg-surface/60 hover:border-ink/40"}`}
            >
              {rec && <span className="mb-3 w-fit rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">Recommended</span>}
              <span className="text-lg font-semibold tracking-[-0.02em]">{PRICING[m].label}</span>
              <span className="mt-1 text-sm">{PRICING[m].price}</span>
              <span className="tnum mt-4 text-sm text-muted">{k(fee)} a year at these inputs</span>
            </button>
          );
        })}
      </div>
      <div className="card-quiet grid gap-3 p-5 text-sm sm:grid-cols-2 sm:p-6" aria-live="polite" data-testid="pricing-detail">
        <p className="flex gap-2">
          <Check size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden /> <span>{PRICING[inp.pricing].pro}</span>
        </p>
        <p className="flex gap-2 text-muted">
          <X size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden /> <span>{PRICING[inp.pricing].con}</span>
        </p>
      </div>
      <p className="mx-auto max-w-[62ch] text-center text-sm text-muted">
        Why hybrid: the member fee covers running the service, and the outcome share means Petra earns more only when your claims actually fall, measured against a control group and reconciled each year.
      </p>
    </div>
  );
}

// ---------- 5. Telematics ----------

const TELEMATICS: [string, string][] = [
  ["Pay how you drive: a driving score lowers the renewal price", "Pay how you care: the personal walk target and weekly check-ins earn the discount"],
  ["Black box policies make young drivers affordable", "First-time and young owners get an entry price that keeps dropping"],
  ["Careful drivers choose telematics, improving the pool", "Careful owners opt in: a better risk pool and better retention"],
  ["Crash data speeds up claims and cuts fraud", "Early warnings and owner-shared history: faster, less disputed claims"],
  ["Stolen vehicle tracking cuts theft claims", "GPS on the Walk Companion helps find a lost or stolen pet"],
  ["Fitted box, then a phone app", "Phone first; the Walk Companion is optional and insurer-subsidised"],
];

function Telematics() {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="card overflow-hidden lg:col-span-8">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="w-1/2 px-5 py-4 font-semibold sm:px-6">
                Car insurance
              </th>
              <th scope="col" className="w-1/2 bg-accent-soft/60 px-5 py-4 font-semibold sm:px-6">
                Petra, for pets
              </th>
            </tr>
          </thead>
          <tbody>
            {TELEMATICS.map(([car, pet]) => (
              <tr key={car} className="border-b border-line align-top last:border-0">
                <td className="px-5 py-3.5 text-muted sm:px-6">{car}</td>
                <td className="bg-accent-soft/30 px-5 py-3.5 sm:px-6">{pet}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figure className="card flex flex-col justify-center p-7 sm:p-8 lg:col-span-4" data-testid="coop-figure">
        <p className="tnum text-[clamp(3.5rem,8vw,5rem)] font-semibold leading-none tracking-[-0.06em]">30%</p>
        <p className="mt-3 text-lg font-semibold leading-snug tracking-[-0.02em]">cheaper claims for young drivers with a black box, and 20% fewer crashes.</p>
        <figcaption className="mt-4 text-xs text-muted">Co-op Insurance telematics data, reported by Post Magazine. Insurer data: careful drivers self-select.</figcaption>
        <p className="mt-5 border-t border-line pt-4 text-sm text-muted">What we kept from cars: rewards. What we left behind: surcharges, curfews and tracking where you go.</p>
      </figure>
    </div>
  );
}

// ---------- 6. Underwriter data ----------

const SHARED = ["Engagement and discount tier, per policy, with consent", "Anonymised group trends by species, breed and age band"];
const NEVER = ["Walk routes and locations", "Raw video, photos or audio", "Individual health answers, for pricing"];
const FAIRNESS: [string, string][] = [
  ["Discount only", "Data can lower a premium. Never raise it, never refuse cover."],
  ["No new exclusions", "Nothing the app spots becomes an exclusion at renewal, so owners never hide a problem."],
  ["Personal targets", "Set for breed, age and health: a senior Pug can earn what a young Collie earns."],
  ["Rest mode", "When a vet advises rest, targets pause and the discount is protected."],
];
const REGULATION: [string, string][] = [
  ["Veterinary Surgeons Act 1966", "Petra flags signs worth a vet's look. It never diagnoses or prescribes; vets do, through regulated consults."],
  ["FCA Consumer Duty", "Fair value and plain-English rules. The reward is never tied to buying a product."],
  ["UK GDPR", "Granular, revocable consent and data minimisation. Location stays on the phone; delete-all in one tap."],
];

function DataLimits() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6 sm:p-7" data-testid="data-shared">
          <p className="eyebrow">Shared with the underwriter</p>
          <ul className="mt-4 space-y-3">
            {SHARED.map((s) => (
              <li key={s} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft" aria-hidden>
                  <Check size={14} weight="bold" />
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6 sm:p-7" data-testid="data-never">
          <p className="eyebrow">Never shared</p>
          <ul className="mt-4 space-y-3">
            {NEVER.map((s) => (
              <li key={s} className="flex gap-3 font-semibold">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-paper" aria-hidden>
                  <EyeSlash size={14} weight="bold" />
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <ol className="grid gap-px overflow-hidden rounded-card border border-line bg-line shadow-soft sm:grid-cols-2 lg:grid-cols-4" aria-label="Fairness rules">
        {FAIRNESS.map(([t, d]) => (
          <li key={t} className="bg-surface p-5 sm:p-6">
            <p className="font-semibold tracking-[-0.02em]">{t}</p>
            <p className="mt-1.5 text-sm text-muted">{d}</p>
          </li>
        ))}
      </ol>
      <ul className="grid gap-4 md:grid-cols-3" aria-label="Regulation">
        {REGULATION.map(([t, d]) => (
          <li key={t} className="card-quiet p-5 sm:p-6">
            <p className="font-semibold tracking-[-0.02em]">{t}</p>
            <p className="mt-1.5 text-sm text-muted">{d}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- 7. Pilot ----------

const PILOT: [string, string][] = [
  ["12", "weeks"],
  ["1", "insurer"],
  ["2,000", "pets"],
  ["1", "control group"],
];
const KPIS = [
  "Weekly active members, and 4-week retention (target 50%)",
  "Check-ins and walk targets met each week",
  "Amber flags that become online consults",
  "Claims frequency and cost against the control group",
  "Discounts paid against claims avoided",
  "Renewal intent and owner satisfaction",
];

function Pilot() {
  return (
    <div className="card mx-auto max-w-5xl p-7 sm:p-10">
      <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4" data-testid="pilot">
        {PILOT.map(([n, l]) => (
          <div key={l} className="flex flex-col-reverse text-center">
            <dt className="mt-2 text-sm text-muted">{l}</dt>
            <dd className="tnum text-[clamp(2.75rem,6vw,4rem)] font-semibold leading-none tracking-[-0.055em]">{n}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 border-t border-line pt-7">
        <p className="eyebrow">What we measure</p>
        <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {KPIS.map((t) => (
            <li key={t} className="flex gap-3">
              <Check size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-8 text-center text-lg font-semibold tracking-[-0.02em]">If engaged members&apos; claims fall by more than about 9%, the insurer is better off. The pilot tells us within 12 weeks.</p>
    </div>
  );
}

/** For insurers: the business case for Problem Statement 1, in seven sections. Figures from finance/petra-financial-model.xlsx. */
export default function PartnerPage() {
  const reduce = useReducedMotion();
  const [inp, setInp] = useState<BusinessInput>(DEFAULT_BUSINESS);
  const set = (p: Partial<BusinessInput>) => setInp((x) => ({ ...x, ...p }));
  const base = businessCase(DEFAULT_BUSINESS);

  return (
    <div className="space-y-24 pb-12 sm:space-y-32">
      <section aria-labelledby="parties-title" className="space-y-10 pt-6 sm:pt-12">
        <motion.div className="mx-auto max-w-4xl text-center" initial={reduce ? false : { opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
          <p className="eyebrow">Petra / For insurers</p>
          <h1 id="parties-title" className="display mt-4 text-[clamp(2.5rem,6.5vw,5rem)]">
            Prevention that pays, <span className="accent-word">for all four parties.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-lg text-muted sm:text-xl">Most claims start as a question an owner had weeks earlier. Petra catches it, inside your app, and the discount is paid for by the claims it prevents.</p>
        </motion.div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="parties">
          {parties(base.memberSaving, base.claimsAvoided / base.engaged).map(([I, who, line, figure], i) => (
            <motion.li key={who} className="card flex flex-col p-6 sm:p-7" initial={reduce ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.08 + i * 0.06 }}>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft" aria-hidden>
                <I size={24} weight="duotone" />
              </span>
              <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em]">{who}</h2>
              <p className="mt-2">{line}</p>
              <p className="mt-auto pt-4 text-sm text-muted">{figure}</p>
            </motion.li>
          ))}
        </ul>
        <p className="text-center text-sm text-muted">Nobody gains at another&apos;s expense: discounts come out of claims that never happen.</p>
      </section>

      <Section id="journey" eyebrow="The member journey" title={<>From first scan to vet visit.</>}>
        <Journey />
      </Section>

      <Section id="business-case" eyebrow="The business case" title={<>Run your own numbers.</>} intro={<>An insurer with 100,000 policies: about {k(base.claimsAvoided)} of claims avoided and {k(base.net)} net a year, a {base.returnOnCost.toFixed(2)}x return.</>}>
        <Calculator inp={inp} set={set} />
      </Section>

      <Section id="pricing" eyebrow="The pricing model" title={<>Pay for use. Reward results.</>}>
        <Pricing inp={inp} set={set} />
      </Section>

      <Section id="telematics" eyebrow="Telematics, proven in car insurance" title={<>Black boxes changed car insurance. Petra does it for pets.</>}>
        <Telematics />
      </Section>

      <Section id="data" eyebrow="Underwriter data and its limits" title={<>What the underwriter sees, and what it never will.</>}>
        <DataLimits />
      </Section>

      <Section id="pilot" eyebrow="The pilot ask" title={<>Twelve weeks to prove it.</>}>
        <Pilot />
      </Section>

      <p className="text-center text-xs text-muted">
        Figures: Petra financial model, Base scenario; market data from the ABI and the hackathon reading guide; telematics from Co-op. Every reference is under Sources in the footer.
      </p>
    </div>
  );
}
