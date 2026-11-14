"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, Check, MagnifyingGlass, Minus, Plus } from "@phosphor-icons/react";
import { PetAvatar } from "../PetAvatar";
import { AGE_FOR_STAGE, BREEDS, SIZE_KG, breedsFor, findBreed, midKg, type Breed } from "@/data/breeds";
import { SPECIES_DEFAULT_SHAPE, profileFromBreed } from "@/lib/profile";
import { updatePet, type PetRecord } from "@/lib/store";
import { SIZE_THEME, SPECIES_THEME } from "@/lib/theme";
import { SIZE_CLASSES, type ActivityLevel, type Consent, type SizeClass, type Species } from "@/lib/types";

export type StepProps = { rec: PetRecord; fresh: boolean; next: () => void };

const ON_CARD = "border-ink bg-accent";
const OFF_CARD = "border-line bg-white/50 hover:border-ink/50 hover:bg-white/80";

export function Question({ eyebrow, children, sub }: { eyebrow: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-3 text-[clamp(2.5rem,7vw,5.25rem)]">{children}</h1>
      {sub && <p className="mt-4 max-w-[52ch] text-lg text-muted">{sub}</p>}
    </div>
  );
}

export function Primary({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`btn btn-primary min-w-40 text-lg ${props.className ?? ""}`}>
      {children} <ArrowUpRight size={18} weight="bold" aria-hidden />
    </button>
  );
}

const big = "min-h-14 w-full border-b-2 border-ink/30 bg-transparent py-2 text-[clamp(2rem,6vw,3.5rem)] font-semibold tracking-[-0.03em] placeholder:text-ink/20 focus:border-ink focus:outline-none";

// ---------- 2. Name ----------

export function NameStep({ initial, species, onSubmit }: { initial: string; species?: Species | null; onSubmit: (name: string) => void }) {
  const [name, setName] = useState(initial);
  const clean = name.trim();
  return (
    <form
      className="space-y-10"
      onSubmit={(e) => {
        e.preventDefault();
        if (clean) onSubmit(clean.slice(0, 40));
      }}
    >
      <Question eyebrow="Let's start with the important one">What&apos;s your {species && species !== "other" ? SPECIES_THEME[species].label.toLowerCase() : "pet"} called?</Question>
      <label className="block max-w-xl">
        <span className="sr-only">Pet name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus autoComplete="off" autoCapitalize="words" placeholder="Biscuit" className={big} />
      </label>
      <Primary type="submit" disabled={!clean}>
        Continue
      </Primary>
    </form>
  );
}

// ---------- 1. Species ----------

const SPECIES_CARDS: Species[] = ["dog", "cat", "rabbit", "horse"];

/** Who are we looking after? Four big cards. `known` marks the current value as chosen (not just a default). */
export function SpeciesStep({ name, value, known, onPick }: { name?: string; value: Species | null; known: boolean; onPick: (s: Species) => void }) {
  return (
    <div className="space-y-10">
      <Question eyebrow="Species">{name ? <>{name} is a&hellip;</> : "Who are we looking after?"}</Question>
      <div className="grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Species">
        {SPECIES_CARDS.map((s) => {
          const on = known && s === value;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={on}
              autoFocus={s === (value ?? "dog")}
              onClick={() => onPick(s)}
              className={`flex min-h-44 flex-col items-center justify-center gap-3 rounded-brand border-2 p-4 transition-colors duration-300 ${on ? ON_CARD : OFF_CARD}`}
            >
              <PetAvatar traits={{ ...SPECIES_DEFAULT_SHAPE[s], species: s, coatColours: [], coatPattern: "solid" }} size={88} ring={false} animated={false} title="" />
              <span className="text-xl font-semibold tracking-[-0.02em]">{SPECIES_THEME[s].label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- 4. Breed ----------

const NOT_SURE = "__not_sure__";

export function BreedStep({ rec, next }: StepProps) {
  const species = rec.pet.species;
  const list = useMemo(() => breedsFor(species), [species]);
  const initial = findBreed(rec.pet.breed || rec.profile.breedGuess, species);
  const [selected, setSelected] = useState<string | null>(initial?.id ?? (rec.pet.breed ? `custom:${rec.pet.breed}` : rec.profile.breedGuess ? `custom:${rec.profile.breedGuess}` : null));
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<SizeClass>(rec.pet.sizeClass ?? rec.profile.sizeClass);

  const q = query.trim().toLowerCase();
  const matches = q ? list.filter((b) => b.name.toLowerCase().includes(q) || b.aliases?.some((a) => a.includes(q))) : list;
  const custom = selected?.startsWith("custom:") ? selected.slice(7) : null;
  const breed: Breed | undefined = BREEDS.find((b) => b.id === selected);

  function choose(id: string) {
    setSelected(id);
    const b = BREEDS.find((x) => x.id === id);
    if (b) setSize(b.size);
  }

  function save() {
    const name = breed?.name ?? custom ?? "";
    const sizeClass = breed?.size ?? size;
    updatePet(rec.id, (p) => {
      // With a photo, keep the look the photo gave us. Without one, draw the breed's typical look.
      const profile = p.photo ? { ...p.profile, breedGuess: name, breedConfidence: name ? 1 : 0, sizeClass } : { ...profileFromBreed(species, name, p.profile), sizeClass };
      return { pet: { ...p.pet, breed: name, sizeClass }, profile, twinSource: p.photo ? p.twinSource : "breed" };
    });
    next();
  }

  const guessed = rec.twinSource === "gemini" && rec.profile.breedGuess;
  const suggestions = rec.twinSource === "gemini" ? (rec.profile.breedSuggestions?.length ? rec.profile.breedSuggestions : rec.profile.breedGuess ? [{ breed: rec.profile.breedGuess, confidence: rec.profile.breedConfidence }] : []) : [];
  const idFor = (name: string) => findBreed(name, species)?.id ?? `custom:${name}`;
  const option = (id: string, label: ReactNode, hint?: string) => (
    <li key={id}>
      <button
        type="button"
        role="radio"
        aria-checked={selected === id}
        onClick={() => choose(id)}
        className={`flex min-h-12 w-full items-center justify-between gap-3 border-b border-line px-1 text-left text-lg transition-colors ${selected === id ? "font-semibold" : "hover:bg-ink/5"}`}
      >
        <span>
          {label}
          {hint && <span className="ml-2 text-sm font-normal text-muted">{hint}</span>}
        </span>
        {selected === id && (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent">
            <Check size={14} weight="bold" aria-hidden />
          </span>
        )}
      </button>
    </li>
  );

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="space-y-8 lg:col-span-7">
        <Question eyebrow={guessed ? "From the photo" : "Breed"} sub={guessed ? "Our best guesses from the photo. Tap one, or search below." : undefined}>
          What breed is {rec.pet.name}?
        </Question>
        {suggestions.length > 0 && (
          <div role="radiogroup" aria-label="Breed suggestions from the photo" className="flex max-w-xl flex-wrap gap-2">
            {suggestions.map((b) => {
              const id = idFor(b.breed);
              return (
                <button
                  key={b.breed}
                  type="button"
                  role="radio"
                  aria-checked={selected === id}
                  onClick={() => choose(id)}
                  className={`min-h-12 rounded-brand border-2 px-4 text-left transition-colors ${selected === id ? ON_CARD : OFF_CARD}`}
                >
                  <span className="font-semibold">{b.breed}</span> <span className="tnum text-sm text-muted">{Math.round(b.confidence * 100)}%</span>
                </button>
              );
            })}
            <button
              type="button"
              role="radio"
              aria-checked={selected === NOT_SURE}
              onClick={() => choose(NOT_SURE)}
              className={`min-h-12 rounded-brand border-2 px-4 font-semibold transition-colors ${selected === NOT_SURE ? ON_CARD : OFF_CARD}`}
            >
              Mixed or not sure
            </button>
          </div>
        )}
        <label className="flex max-w-xl items-center gap-3 border-b-2 border-ink/30 focus-within:border-ink">
          <MagnifyingGlass size={22} aria-hidden className="text-muted" />
          <span className="sr-only">Search breeds</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus={!selected}
            placeholder={`Search ${SPECIES_THEME[species].plural}`}
            className="min-h-12 w-full bg-transparent py-2 text-xl focus:outline-none"
          />
        </label>
        <ul role="radiogroup" aria-label="Breeds" className="max-h-[22rem] max-w-xl overflow-y-auto pr-1">
          {!q && option(NOT_SURE, species === "dog" ? "Mixed or not sure" : "Not sure")}
          {q && !matches.length && option(`custom:${query.trim()}`, <>Use &ldquo;{query.trim()}&rdquo;</>)}
          {custom && !q && option(`custom:${custom}`, custom, "your answer")}
          {matches.map((b) => option(b.id, b.name))}
        </ul>
        {selected === NOT_SURE && species === "dog" && (
          <fieldset className="fade-up max-w-xl space-y-3">
            <legend className="eyebrow">Roughly how big as an adult?</legend>
            <div className="grid grid-cols-5 gap-2">
              {SIZE_CLASSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={size === s}
                  onClick={() => setSize(s)}
                  className={`flex min-h-16 flex-col items-center justify-center rounded-brand border-2 px-1 text-center transition-colors ${size === s ? ON_CARD : OFF_CARD}`}
                >
                  <span className="font-semibold">{SIZE_THEME[s].label}</span>
                  <span className="text-[11px] leading-tight text-muted">{SIZE_THEME[s].hint}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <Primary type="button" onClick={save} disabled={!selected} autoFocus={Boolean(selected)}>
          Continue
        </Primary>
      </div>
      <div className="hidden lg:col-span-5 lg:flex lg:items-center lg:justify-center">
        <PetAvatar
          traits={rec.photo || !breed ? { ...rec.profile, sizeClass: breed?.size ?? size } : profileFromBreed(species, breed.name, rec.profile)}
          size={260}
          title={`${rec.pet.name}'s avatar`}
        />
      </div>
    </div>
  );
}

// ---------- 5. Age ----------

export function AgeStep({ rec, fresh, next }: StepProps) {
  const species = rec.pet.species;
  const [age, setAge] = useState<number>(fresh ? AGE_FOR_STAGE[species][rec.profile.ageGuess] : rec.pet.ageYears);
  const step = age < 2 ? 0.5 : 1;
  const stage = lifeStage(species, age);
  const valid = Number.isFinite(age) && age >= 0 && age <= 40;
  return (
    <form
      className="space-y-10"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        updatePet(rec.id, (p) => ({ pet: { ...p.pet, ageYears: age } }));
        next();
      }}
    >
      <Question eyebrow={fresh && rec.twinSource === "gemini" ? "Best guess from the photo" : "Age"} sub="A best guess is fine.">
        How old is {rec.pet.name}?
      </Question>
      <div className="flex max-w-xl items-end gap-4">
        <Stepper label="Younger" onClick={() => setAge((a) => Math.max(0, +(a - step).toFixed(1)))} icon={<Minus size={20} weight="bold" aria-hidden />} />
        <label className="flex-1">
          <span className="sr-only">Age in years</span>
          <input type="number" inputMode="decimal" min={0} max={40} step={0.5} value={Number.isFinite(age) ? age : ""} onChange={(e) => setAge(parseFloat(e.target.value))} autoFocus className={`${big} tnum text-center`} />
        </label>
        <Stepper label="Older" onClick={() => setAge((a) => Math.min(40, +(a + step).toFixed(1)))} icon={<Plus size={20} weight="bold" aria-hidden />} />
      </div>
      <p className="text-lg" aria-live="polite">
        {valid ? (
          <>
            {age === 1 ? "1 year" : `${age} years`}. That makes {rec.pet.name} <strong>{stage}</strong>.
          </>
        ) : (
          "Enter an age between 0 and 40."
        )}
      </p>
      <Primary type="submit" disabled={!valid}>
        Continue
      </Primary>
    </form>
  );
}

export function lifeStage(species: Species, age: number) {
  const young = species === "cat" ? "a kitten" : species === "horse" ? "a foal" : species === "dog" ? "a puppy" : "young";
  const senior: Record<Species, number> = { dog: 8, cat: 11, rabbit: 6, horse: 18, other: 8 };
  if (age < 1) return young;
  if (age >= senior[species]) return "a senior";
  return "an adult";
}

function Stepper({ label, onClick, icon }: { label: string; onClick: () => void; icon: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-line hover:bg-ink/5">
      {icon}
    </button>
  );
}

// ---------- 6. Weight ----------

export function WeightStep({ rec, fresh, next }: StepProps) {
  const breed = findBreed(rec.pet.breed, rec.pet.species);
  const range = breed?.typicalKg ?? SIZE_KG[rec.pet.species][rec.pet.sizeClass ?? rec.profile.sizeClass];
  const [kg, setKg] = useState<number>(fresh || rec.pet.weightKg === undefined ? midKg(range) : rec.pet.weightKg);
  const valid = Number.isFinite(kg) && kg > 0 && kg <= 1200;
  const unit = range[1] >= 100 ? 10 : range[1] >= 10 ? 1 : 0.1;
  const save = (weightKg: number | undefined) => {
    updatePet(rec.id, (p) => ({ pet: { ...p.pet, weightKg } }));
    next();
  };
  return (
    <form
      className="space-y-10"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) save(Math.round(kg * 10) / 10);
      }}
    >
      <Question eyebrow="Weight" sub={`Typical for ${breed ? `a ${breed.name}` : `a ${SIZE_THEME[rec.pet.sizeClass ?? rec.profile.sizeClass].label.toLowerCase()} ${rec.pet.species}`}: ${range[0]} to ${range[1]} kg. Your vet's last reading is best.`}>
        How much does {rec.pet.name} weigh?
      </Question>
      <div className="flex max-w-xl items-end gap-4">
        <Stepper label="Lighter" onClick={() => setKg((k) => Math.max(0.1, +(k - unit).toFixed(1)))} icon={<Minus size={20} weight="bold" aria-hidden />} />
        <label className="flex flex-1 items-end gap-2">
          <span className="sr-only">Weight in kilograms</span>
          <input type="number" inputMode="decimal" min={0} max={1200} step={0.1} value={Number.isFinite(kg) ? kg : ""} onChange={(e) => setKg(parseFloat(e.target.value))} autoFocus className={`${big} tnum text-center`} />
          <span className="pb-3 text-2xl font-semibold text-muted">kg</span>
        </label>
        <Stepper label="Heavier" onClick={() => setKg((k) => Math.min(1200, +(k + unit).toFixed(1)))} icon={<Plus size={20} weight="bold" aria-hidden />} />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Primary type="submit" disabled={!valid}>
          Continue
        </Primary>
        <button type="button" onClick={() => save(undefined)} className="link min-h-11 text-muted">
          Not sure, skip
        </button>
      </div>
    </form>
  );
}

// ---------- 7. Neutered ----------

export function NeuteredStep({ rec, fresh, next }: StepProps) {
  const current = rec.pet.neutered;
  const choose = (neutered: boolean | undefined) => {
    updatePet(rec.id, (p) => ({ pet: { ...p.pet, neutered } }));
    setTimeout(next, 180);
  };
  const options: [string, boolean | undefined][] = [
    ["Yes", true],
    ["No", false],
    ["Not sure", undefined],
  ];
  return (
    <div className="space-y-10">
      <Question eyebrow="Neutering" sub="It changes how much energy they need and which checks matter.">
        Is {rec.pet.name} {rec.pet.species === "horse" ? "gelded or spayed" : "neutered or spayed"}?
      </Question>
      <div className="grid max-w-xl grid-cols-3 gap-3" role="radiogroup" aria-label="Neutered">
        {options.map(([label, v], i) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={!fresh && current === v}
            autoFocus={i === 0}
            onClick={() => choose(v)}
            className={`min-h-20 rounded-brand border-2 text-xl font-semibold transition-colors ${!fresh && current === v ? ON_CARD : OFF_CARD}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- 8. Activity ----------

const ACTIVITY: Record<Species, Record<ActivityLevel, string>> = {
  dog: { low: "Short strolls and plenty of naps", moderate: "About an hour of walks a day", high: "Long runs, working or sporty" },
  cat: { low: "Mostly indoors, loves a snooze", moderate: "Plays daily, some time outside", high: "Outdoor explorer, always busy" },
  rabbit: { low: "Mostly in the hutch or pen", moderate: "Free roaming for part of the day", high: "Free roaming most of the day" },
  horse: { low: "Retired or very light hacking", moderate: "Hacking a few times a week", high: "Regular schooling or competing" },
  other: { low: "Mostly resting", moderate: "Active part of the day", high: "Active most of the day" },
};

export function ActivityStep({ rec, next }: StepProps) {
  const choose = (activity: ActivityLevel) => {
    updatePet(rec.id, (p) => ({ pet: { ...p.pet, activity } }));
    setTimeout(next, 180);
  };
  return (
    <div className="space-y-10">
      <Question eyebrow="Activity">How active is {rec.pet.name} day to day?</Question>
      <div className="grid max-w-3xl gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Activity level">
        {(["low", "moderate", "high"] as const).map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={rec.pet.activity === a}
            autoFocus={rec.pet.activity ? rec.pet.activity === a : a === "moderate"}
            onClick={() => choose(a)}
            className={`flex min-h-28 flex-col items-start justify-between gap-3 rounded-brand border-2 p-4 text-left transition-colors ${rec.pet.activity === a ? ON_CARD : OFF_CARD}`}
          >
            <span className="text-2xl font-semibold capitalize tracking-[-0.02em]">{a}</span>
            <span className="text-sm text-muted">{ACTIVITY[rec.pet.species][a]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- 9. Consent ----------

const CONSENTS: { key: keyof Omit<Consent, "updatedAt">; title: string; detail: string; note?: string }[] = [
  { key: "vet", title: "Share check-ins with my vet", detail: "Your vet sees the brief, the trends and any video you choose to send." },
  { key: "insurer", title: "Share engagement with my insurer for my discount", detail: "Only how often you check in. Never health answers, photos or video.", note: "Needed for your discount" },
  { key: "research", title: "Anonymised research", detail: "Helps improve pet health for everyone. Nothing that identifies you or your pet." },
];

export function ConsentStep({ rec, onFinish }: { rec: PetRecord; onFinish: (c: Consent) => void }) {
  const [c, setC] = useState<Consent>(rec.consent);
  return (
    <div className="space-y-10">
      <Question eyebrow="Your data, your choice" sub="Each one is separate, off until you turn it on, and you can change it any time in settings.">
        What can we share?
      </Question>
      <ul className="max-w-2xl divide-y divide-line border-y border-line">
        {CONSENTS.map((item, i) => (
          <li key={item.key}>
            <button
              type="button"
              role="switch"
              aria-checked={c[item.key]}
              autoFocus={i === 0}
              onClick={() => setC((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
              className="flex min-h-20 w-full items-center gap-4 py-4 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold tracking-[-0.01em]">{item.title}</span>
                <span className="block text-sm text-muted">{item.detail}</span>
                {item.note && <span className="mt-1 inline-block rounded-[3px] bg-accent-soft px-1.5 py-0.5 text-xs font-semibold">{item.note}</span>}
              </span>
              <span aria-hidden className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors duration-300 ${c[item.key] ? "border-ink bg-accent" : "border-ink/30 bg-white/60"}`}>
                <span className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-ink transition-[left] duration-300 ${c[item.key] ? "left-7" : "left-1"}`} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="display max-w-3xl text-[clamp(1.75rem,4vw,2.75rem)]">
        Your data can only <span className="accent-word">lower</span> your premium. Never raise it, never add exclusions.
      </p>
      <Primary type="button" onClick={() => onFinish({ ...c, updatedAt: new Date().toISOString() })}>
        Start the walk
      </Primary>
    </div>
  );
}
