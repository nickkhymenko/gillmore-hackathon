"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Bluetooth, CheckCircle, DeviceMobile, Heartbeat, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import { PilotSheet } from "../Sheet";
import { bluetoothSupported, connectHeartRate } from "./heartRate";
import { BB_CAP, BB_TIERS, CHECKIN_EXTRA, setCollarDays, simulateCollarHistory, type CollarDay, type Signal } from "@/lib/blackbox";
import { basePremium } from "@/lib/discount";
import { updatePet, type PetRecord } from "@/lib/store";

const gbp = (n: number, dp = 0) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);

// ---------- Connect ----------

export function Connect({
  rec,
  target,
  now,
  hr,
  onHr,
}: {
  rec: PetRecord;
  target: number;
  now: number;
  hr: { name: string; bpm: number | null } | null;
  onHr: (v: { name: string; bpm: number | null } | null) => void;
}) {
  const [pairing, setPairing] = useState<number | null>(null);
  const [bt, setBt] = useState(false);
  const [btError, setBtError] = useState<string | null>(null);
  const collar = rec.blackBox?.device === "collar";
  useEffect(() => setBt(bluetoothSupported()), []); // eslint-disable-line react-hooks/set-state-in-effect -- feature detection after mount

  /** Pairing animation: three short steps, then the simulated collar syncs six weeks of history. */
  function pair() {
    setPairing(0);
    setTimeout(() => setPairing(1), 900);
    setTimeout(() => setPairing(2), 1800);
    setTimeout(() => {
      setCollarDays(rec.id, simulateCollarHistory(rec, target, now));
      updatePet(rec.id, (p) => ({ blackBox: { device: "collar", enrolledAt: p.blackBox?.enrolledAt ?? new Date(now - 42 * 864e5).toISOString(), restSince: p.blackBox?.restSince ?? null } }));
      setPairing(null);
    }, 2700);
  }

  const STEPS = ["Searching for your collar", "Found Petra Collar PV-2041", `Syncing ${rec.pet.name}'s last 6 weeks`];

  return (
    <div className="grid gap-px overflow-hidden rounded-brand border border-line bg-line md:grid-cols-3">
      <div className="bg-paper p-5">
        <DeviceMobile size={26} aria-hidden />
        <p className="mt-3 text-xl font-semibold tracking-[-0.02em]">Use my phone for now</p>
        <p className="mt-1 text-sm text-muted">Track walks with your phone&apos;s GPS. Start a walk below.</p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
          <CheckCircle size={16} weight="fill" aria-hidden /> {collar ? "Available any time" : "Default"}
        </p>
      </div>
      <div className="bg-paper p-5">
        <ShieldCheck size={26} aria-hidden />
        <p className="mt-3 text-xl font-semibold tracking-[-0.02em]">Petra Collar</p>
        <p className="mt-1 text-sm text-muted">Steps, active minutes, resting heart and breathing rate, sleep and night restlessness.</p>
        {collar ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold" role="status">
            <CheckCircle size={16} weight="fill" aria-hidden /> Paired (simulated for the demo)
          </p>
        ) : pairing !== null ? (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold" role="status" aria-live="polite">
            <span className="shimmer inline-block h-2.5 w-2.5 rounded-full bg-accent ring-1 ring-ink/30" /> {STEPS[Math.min(pairing, 2)]}
          </p>
        ) : (
          <button type="button" onClick={pair} className="btn btn-primary mt-3">
            Pair Petra Collar
          </button>
        )}
      </div>
      {bt && (
        <div className="bg-paper p-5">
          <Bluetooth size={26} aria-hidden />
          <p className="mt-3 text-xl font-semibold tracking-[-0.02em]">Real sensor demo</p>
          <p className="mt-1 text-sm text-muted">Connect any Bluetooth heart rate sensor. A chest strap or watch can stand in for the collar on stage.</p>
          {hr ? (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold" role="status">
              <Heartbeat size={18} weight="fill" aria-hidden /> {hr.name}: <span className="tnum text-2xl">{hr.bpm ?? "--"}</span> bpm
              <button type="button" onClick={() => onHr(null)} className="link font-normal">
                Disconnect
              </button>
            </p>
          ) : (
            <button
              type="button"
              className="btn btn-ghost mt-3"
              onClick={async () => {
                setBtError(null);
                try {
                  let name = "Heart rate sensor";
                  const conn = await connectHeartRate(
                    (bpm) => onHr({ name, bpm }),
                    () => onHr(null),
                  );
                  name = conn.name;
                  onHr({ name, bpm: null });
                } catch (e) {
                  const msg = e instanceof Error ? e.message : "";
                  if (!/cancel/i.test(msg)) setBtError("Could not connect. Check the sensor is on and not paired to another app.");
                }
              }}
            >
              Connect a heart rate sensor
            </button>
          )}
          {btError && <p className="mt-2 text-sm text-red-800">{btError}</p>}
        </div>
      )}
    </div>
  );
}

// ---------- Today and rest mode ----------

export function Today({ rec, target, today, weeksMet, weeksCounted }: { rec: PetRecord; target: number; today: number; weeksMet: number; weeksCounted: number }) {
  const rest = Boolean(rec.blackBox?.restSince);
  const pct = target ? Math.min(100, (today / target) * 100) : 100;
  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-7">
        <p className="eyebrow">Today</p>
        {rest ? (
          <p className="text-3xl font-semibold tracking-[-0.03em]">Rest mode: no target today.</p>
        ) : (
          <p className="text-3xl font-semibold tracking-[-0.03em]">
            {Math.min(today, target)} of {target} minutes
          </p>
        )}
        <div className="h-3 rounded-full bg-ink/10" role="meter" aria-valuemin={0} aria-valuemax={target || 1} aria-valuenow={rest ? target : Math.min(today, target)} aria-label="Today's activity target">
          <div className="h-3 rounded-full bg-ink transition-[width] duration-700 ease-out" style={{ width: `${rest ? 100 : pct}%` }} />
        </div>
        <p className="text-sm text-muted">
          {weeksCounted ? `Target met in ${weeksMet} of ${weeksCounted} ${weeksCounted === 1 ? "week" : "weeks"} so far.` : "Your first week starts with your first walk."} A week counts when it adds up to five days of {rec.pet.name}&apos;s target, so rest days are fine.
        </p>
      </div>
      <div className="lg:col-span-5">
        <button
          type="button"
          role="switch"
          aria-checked={rest}
          onClick={() => updatePet(rec.id, (p) => ({ blackBox: { device: p.blackBox?.device ?? "phone", enrolledAt: p.blackBox?.enrolledAt ?? new Date().toISOString(), restSince: rest ? null : new Date().toISOString() } }))}
          className="flex w-full items-start gap-4 rounded-brand border border-line bg-white/60 p-4 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Rest mode (vet advised)</span>
            <span className="block text-sm text-muted">Injury or surgery? Targets pause and your discount is protected.</span>
          </span>
          <span aria-hidden className={`relative mt-1 h-7 w-12 shrink-0 rounded-full border-2 transition-colors duration-300 ${rest ? "border-ink bg-accent" : "border-ink/30 bg-white/60"}`}>
            <span className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-ink transition-[left] duration-300 ${rest ? "left-6" : "left-1"}`} />
          </span>
        </button>
      </div>
    </div>
  );
}

// ---------- Diagnostics ----------

export function Diagnostics({ rec, days, result, now }: { rec: PetRecord; days: CollarDay[]; result: { signals: Signal[]; amber: boolean; summary: string } | null; now: number }) {
  const [sheet, setSheet] = useState(false);
  if (!result)
    return (
      <p className="text-muted">
        {days.length ? "A few more weeks of collar data and we can compare against " : "Pair the collar to compare activity, rest, resting heart and breathing rate against "}
        {rec.pet.name}&apos;s own baseline.
      </p>
    );
  return (
    <div className="space-y-6">
      {result.amber ? (
        <div className="flex flex-wrap items-start gap-4 rounded-brand p-5" style={{ background: "#FBEACB", color: "#5A3000" }} role="status">
          <WarningCircle size={22} weight="fill" aria-hidden className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-lg font-semibold">A change worth a vet&apos;s look</p>
            <p className="text-sm">{result.summary} This is not a diagnosis: it is {rec.pet.name} compared with {rec.pet.name}.</p>
            <button type="button" onClick={() => setSheet(true)} className="btn btn-primary">
              Online vet consult, Black Box summary attached <ArrowUpRight size={16} weight="bold" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <p className="inline-flex items-center gap-2 font-semibold">
          <CheckCircle size={18} weight="fill" aria-hidden /> No sustained changes against {rec.pet.name}&apos;s own baseline.
        </p>
      )}
      <ul className="grid gap-px overflow-hidden rounded-brand border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
        {result.signals.map((s) => (
          <li key={s.key} className="bg-paper p-4">
            <p className="eyebrow">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
              {s.recent} <span className="text-sm font-medium text-muted">{s.unit}</span>
            </p>
            <p className={`mt-1 text-sm ${s.flag ? "font-semibold" : "text-muted"}`}>
              {s.change === 0 ? "Same as usual" : `${s.change > 0 ? "Up" : "Down"} ${Math.abs(Math.round(s.change * 100))}% vs usual ${s.baseline}`}
              {s.flag ? " (worth a look)" : ""}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Last 10 days against the 4 weeks before. Simulated collar data for the demo.</p>
      <button type="button" onClick={() => setCollarDays(rec.id, simulateCollarHistory(rec, Math.max(20, result.signals[0].baseline), now, !result.amber))} className="link min-h-11 text-sm">
        {result.amber ? "Demo: back to normal" : "Demo: simulate a 10-day dip"}
      </button>
      <PilotSheet open={sheet} onClose={() => setSheet(false)} what="Booking an online vet consult with the Black Box summary attached" />
    </div>
  );
}

// ---------- Your price, live ----------

export function PriceCard({ rec, discount }: { rec: PetRecord; discount: { metRatio: number; checkinRatio: number; target: number; checkins: number; total: number; weeksCounted: number; weeksMet: number; nextTier: { ratio: number; pct: number } | null } }) {
  const yearly = basePremium(rec.pet);
  const monthly = yearly / 12;
  const newMonthly = monthly * (1 - discount.total / 100);
  const savedSoFar = (yearly * discount.total) / 100 * (discount.weeksCounted / 52);
  return (
    <section id="your-price" className="scroll-mt-32 rounded-brand p-6 text-white sm:p-10" style={{ background: "var(--dark)" }} aria-labelledby="price-title">
      <p id="price-title" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
        Your price, live
      </p>
      <div className="mt-5 grid gap-8 lg:grid-cols-12">
        <dl className="tnum grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-lg lg:col-span-6">
          <dt className="text-white/70">Base premium</dt>
          <dd>{gbp(monthly, 2)} a month</dd>
          <dt className="text-white/70">Black Box discount ({discount.total}%)</dt>
          <dd>−{gbp(monthly - newMonthly, 2)}</dd>
          <dt className="border-t border-white/15 pt-2 font-semibold">Your new price</dt>
          <dd className="border-t border-white/15 pt-2 text-3xl font-semibold tracking-[-0.03em] text-accent">{gbp(newMonthly, 2)}</dd>
        </dl>
        <div className="space-y-3 lg:col-span-6">
          <p className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-tight tracking-[-0.03em]">
            You&apos;ve saved <span className="text-accent">{gbp(savedSoFar, 2)}</span> so far.
          </p>
          <ul className="space-y-1 text-sm text-white/80">
            <li>
              Target met in {discount.weeksMet} of {discount.weeksCounted} weeks ({Math.round(discount.metRatio * 100)}%): <strong className="text-white">{discount.target}%</strong>
            </li>
            <li>
              Weekly check-ins ({Math.round(discount.checkinRatio * 100)}% of weeks): <strong className="text-white">+{discount.checkins}%</strong>
            </li>
            <li>Capped at {BB_CAP}%.</li>
          </ul>
          {discount.nextTier && <p className="text-sm text-white">Next: hit the target in {Math.round(discount.nextTier.ratio * 100)}% of weeks for {discount.nextTier.pct}%.</p>}
        </div>
      </div>
      <p className="mt-6 border-t border-white/15 pt-4 text-xs text-white/60">
        Illustrative tiers: {BB_TIERS.map((t) => `${Math.round(t.ratio * 100)}% of weeks = ${t.pct}%`).join(", ")}; check-ins add {CHECKIN_EXTRA.map((t) => `${t.pct}%`).join(", ")} at the same ratios. Example premium of {gbp(yearly)} a year. It can only lower your premium.
      </p>
    </section>
  );
}

// ---------- Your data, your rules ----------

export function DataRules({ compact = false }: { compact?: boolean }) {
  return (
    <aside aria-label="Your data, your rules" className={`rounded-brand border border-line bg-paper ${compact ? "p-5" : "p-6"}`}>
      <p className="eyebrow">Your data, your rules</p>
      <ul className="mt-3 space-y-2 text-sm">
        <li>Routes and locations stay on your device. Never shared.</li>
        <li>Your insurer sees only &ldquo;target met this week: yes or no&rdquo; and your discount tier.</li>
        <li>Your vet sees health trends only if you share them.</li>
        <li>Underwriters see anonymised group trends only.</li>
      </ul>
      <p className="mt-4 font-semibold">It can only lower your premium. Never raise it, never add exclusions.</p>
      <p className="mt-3 text-sm text-muted">
        <strong className="text-ink">Fair by design:</strong> targets are personal to breed, age and health, so a senior Pug and a young Collie can both earn the full discount. <strong className="text-ink">Rest mode:</strong> if a vet advises rest, targets pause and the discount is protected.
      </p>
    </aside>
  );
}
