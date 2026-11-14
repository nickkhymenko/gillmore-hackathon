"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Trash } from "@phosphor-icons/react";
import { PhotoTwin } from "@/components/PhotoTwin";
import { removePet, updatePet, type PetRecord } from "@/lib/store";
import { undoable } from "@/lib/toast";
import { useActivePet } from "@/lib/usePets";
import { ACTIVITY_LEVELS, type Consent } from "@/lib/types";

const CONSENT_LABEL: Record<keyof Omit<Consent, "updatedAt">, [string, string]> = {
  vet: ["Share check-ins with my vet", "The brief, trends and any video you choose to send."],
  insurer: ["Share engagement with my insurer", "Only how often you check in. Needed for your discount."],
  research: ["Anonymised research", "Nothing that identifies you or your pet."],
};

const field = "min-h-11 w-full rounded-brand border border-line bg-white/70 px-3 py-2";

function Details({ rec }: { rec: PetRecord }) {
  const set = (patch: Partial<PetRecord["pet"]>) => updatePet(rec.id, (p) => ({ pet: { ...p.pet, ...patch } }));
  const [name, setName] = useState(rec.pet.name);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1">
        <span className="eyebrow">Name</span>
        <input
          className={field}
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && set({ name: name.trim() })}
        />
      </label>
      <label className="space-y-1">
        <span className="eyebrow">Breed</span>
        <input className={field} value={rec.pet.breed} maxLength={60} onChange={(e) => set({ breed: e.target.value })} placeholder="Mixed or not sure" />
      </label>
      <label className="space-y-1">
        <span className="eyebrow">Age (years)</span>
        <input className={`${field} tnum`} type="number" min={0} max={40} step={0.5} value={rec.pet.ageYears} onChange={(e) => Number.isFinite(e.target.valueAsNumber) && set({ ageYears: e.target.valueAsNumber })} />
      </label>
      <label className="space-y-1">
        <span className="eyebrow">Weight (kg)</span>
        <input
          className={`${field} tnum`}
          type="number"
          min={0}
          max={1200}
          step={0.1}
          value={rec.pet.weightKg ?? ""}
          placeholder="Not sure"
          onChange={(e) => set({ weightKg: Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : undefined })}
        />
      </label>
      <label className="space-y-1">
        <span className="eyebrow">Neutered or spayed</span>
        <select className={field} value={rec.pet.neutered === undefined ? "" : rec.pet.neutered ? "yes" : "no"} onChange={(e) => set({ neutered: e.target.value === "" ? undefined : e.target.value === "yes" })}>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="">Not sure</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="eyebrow">Refer to {rec.pet.name} as</span>
        <select className={field} value={rec.pet.pronoun ?? "they"} onChange={(e) => set({ pronoun: e.target.value as "he" | "she" | "they" })}>
          <option value="he">He / him</option>
          <option value="she">She / her</option>
          <option value="they">They / them</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="eyebrow">Activity</span>
        <select className={field} value={rec.pet.activity ?? ""} onChange={(e) => set({ activity: (e.target.value || undefined) as PetRecord["pet"]["activity"] })}>
          <option value="">Not set</option>
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a} value={a}>
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Pet settings: photo and twin (replace, remove, reset theme), details, consent, remove pet. */
export default function PetSettingsPage() {
  const { pet: rec, ready } = useActivePet();

  if (!ready) return <div className="min-h-[60svh]" aria-busy="true" />;
  if (!rec)
    return (
      <section className="space-y-6 py-16">
        <p className="eyebrow">Pet settings</p>
        <h1 className="display text-[clamp(2.5rem,7vw,5rem)]">No pet yet.</h1>
        <Link href="/" className="btn btn-primary text-lg">
          Meet your Pet Twin <ArrowUpRight size={18} weight="bold" aria-hidden />
        </Link>
      </section>
    );

  return (
    <div className="space-y-14 py-4 sm:py-8">
      <header>
        <p className="eyebrow">Petra / {rec.pet.name} / Settings</p>
        <h1 className="display mt-3 text-[clamp(2.5rem,7vw,5rem)]">
          {rec.pet.name}&apos;s <span className="accent-word">twin.</span>
        </h1>
      </header>

      <PhotoTwin key={rec.id} petId={rec.id} mode="settings" />

      <section className="space-y-5">
        <h2 className="eyebrow border-t border-line pt-3">
          <span className="tnum text-ink">03</span> / Details
        </h2>
        <Details key={rec.id} rec={rec} />
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow border-t border-line pt-3">
          <span className="tnum text-ink">04</span> / What we share
        </h2>
        <ul className="divide-y divide-line">
          {(Object.keys(CONSENT_LABEL) as (keyof typeof CONSENT_LABEL)[]).map((k) => (
            <li key={k}>
              <button
                type="button"
                role="switch"
                aria-checked={rec.consent[k]}
                onClick={() => updatePet(rec.id, (p) => ({ consent: { ...p.consent, [k]: !p.consent[k], updatedAt: new Date().toISOString() } }))}
                className="flex min-h-16 w-full items-center gap-4 py-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{CONSENT_LABEL[k][0]}</span>
                  <span className="block text-sm text-muted">{CONSENT_LABEL[k][1]}</span>
                </span>
                <span aria-hidden className={`relative h-7 w-12 shrink-0 rounded-full border-2 transition-colors duration-300 ${rec.consent[k] ? "border-ink bg-accent" : "border-ink/30 bg-white/60"}`}>
                  <span className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-ink transition-[left] duration-300 ${rec.consent[k] ? "left-6" : "left-1"}`} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-sm font-semibold">Your data can only lower your premium. Never raise it, never add exclusions.</p>
      </section>

      <section className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6">
        <Link href="/walk" className="btn btn-primary text-lg">
          Go to {rec.pet.name}&apos;s walk <ArrowUpRight size={18} weight="bold" aria-hidden />
        </Link>
        <button type="button" onClick={() => undoable(`${rec.pet.name} removed.`, removePet(rec.id))} className="link inline-flex min-h-11 items-center gap-1.5 text-red-800">
          <Trash size={15} aria-hidden /> Remove {rec.pet.name}
        </button>
      </section>
    </div>
  );
}
