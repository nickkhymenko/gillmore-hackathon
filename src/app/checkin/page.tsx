"use client";

import { useEffect, useState } from "react";
import { ResultCard } from "@/components/ResultCard";
import { addCheckin, loadCheckins, loadPet, savePet, seedDemo, streakWeeks } from "@/lib/store";
import type { Answers, CheckinResult, Pet } from "@/lib/types";

const QUESTIONS: { key: keyof Answers; q: string; options: { v: string; l: string }[] }[] = [
  { key: "appetite", q: "Appetite", options: [{ v: "normal", l: "Normal" }, { v: "increased", l: "More" }, { v: "reduced", l: "Less" }, { v: "none", l: "Not eating" }] },
  { key: "energy", q: "Energy", options: [{ v: "normal", l: "Normal" }, { v: "lower", l: "Lower" }, { v: "very_low", l: "Very low" }] },
  { key: "water", q: "Drinking", options: [{ v: "normal", l: "Normal" }, { v: "more", l: "More" }, { v: "less", l: "Less" }] },
  { key: "stool", q: "Poo", options: [{ v: "normal", l: "Normal" }, { v: "soft", l: "Soft" }, { v: "diarrhoea", l: "Diarrhoea" }, { v: "blood", l: "Blood" }, { v: "none", l: "None" }] },
  { key: "vomiting", q: "Vomiting", options: [{ v: "none", l: "None" }, { v: "once", l: "Once" }, { v: "repeated", l: "Repeated" }] },
  { key: "mobility", q: "Movement", options: [{ v: "normal", l: "Normal" }, { v: "stiff", l: "Stiff" }, { v: "limping", l: "Limping" }, { v: "unable", l: "Can't stand" }] },
  { key: "skin", q: "Skin and coat", options: [{ v: "normal", l: "Normal" }, { v: "itchy", l: "Itchy" }, { v: "lump", l: "New lump" }, { v: "wound", l: "Wound" }] },
  { key: "breathing", q: "Breathing at rest", options: [{ v: "normal", l: "Normal" }, { v: "fast", l: "Fast" }, { v: "laboured", l: "Laboured" }] },
  { key: "urination", q: "Weeing", options: [{ v: "normal", l: "Normal" }, { v: "more", l: "More" }, { v: "straining", l: "Straining" }, { v: "none", l: "None" }] },
];

const NORMAL: Answers = {
  appetite: "normal", energy: "normal", water: "normal", stool: "normal", vomiting: "none",
  mobility: "normal", skin: "normal", breathing: "normal", urination: "normal",
};

const DEFAULT_PET: Pet = { name: "Biscuit", species: "dog", breed: "Labrador", ageYears: 8, weightKg: 34 };

const SCENARIOS: { label: string; pet: Pet; answers: Partial<Answers>; notes: string }[] = [
  { label: "Healthy week", pet: DEFAULT_PET, answers: {}, notes: "" },
  {
    label: "Subtle drift (older dog)",
    pet: DEFAULT_PET,
    answers: { water: "more", energy: "lower", mobility: "stiff" },
    notes: "Seems to be drinking more and slow getting up after walks for about a week.",
  },
  {
    label: "Emergency (cat)",
    pet: { name: "Miso", species: "cat", breed: "British Shorthair", ageYears: 4, weightKg: 5 },
    answers: { urination: "straining", energy: "lower" },
    notes: "Keeps going to the litter tray and crying, very little comes out.",
  },
];

async function compressImage(file: File): Promise<{ mimeType: "image/jpeg"; dataBase64: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  return { mimeType: "image/jpeg", dataBase64: dataUrl.split(",")[1] };
}

export default function CheckinPage() {
  const [pet, setPet] = useState<Pet>(DEFAULT_PET);
  const [answers, setAnswers] = useState<Answers>(NORMAL);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<{ mimeType: "image/jpeg"; dataBase64: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    const saved = loadPet();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    if (saved) setPet(saved);
    setHistoryCount(loadCheckins().length);
  }, []);

  function applyScenario(s: (typeof SCENARIOS)[number]) {
    setPet(s.pet);
    setAnswers({ ...NORMAL, ...s.answers });
    setNotes(s.notes);
    setResult(null);
  }

  async function submit() {
    setLoading(true);
    setError(null);
    savePet(pet);
    const log = loadCheckins().filter((c) => c.petName === pet.name);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pet,
          answers,
          notes,
          photo: photo ?? undefined,
          history: log.map((c) => c.healthScore),
          streakWeeks: streakWeeks(log),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult(data);
      addCheckin({ ...data, petName: pet.name });
      setHistoryCount(loadCheckins().length);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const field = "w-full rounded-xl border border-teal-900/15 bg-white px-3 py-2";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Weekly check-in</h1>
          <p className="text-sm text-teal-900/70">About 60 seconds. Tap what is different from a normal week.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button key={s.label} onClick={() => applyScenario(s)} className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800 ring-1 ring-teal-200">
              Demo: {s.label}
            </button>
          ))}
          <button
            onClick={() => {
              seedDemo(pet);
              setHistoryCount(loadCheckins().length);
            }}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-teal-800 ring-1 ring-teal-200"
          >
            Seed 6 weeks history ({historyCount} saved)
          </button>
        </div>

        <fieldset className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <legend className="px-1 text-sm font-semibold">Pet</legend>
          <input className={field} value={pet.name} onChange={(e) => setPet({ ...pet, name: e.target.value })} placeholder="Name" />
          <select className={field} value={pet.species} onChange={(e) => setPet({ ...pet, species: e.target.value as Pet["species"] })}>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="rabbit">Rabbit</option>
            <option value="other">Other</option>
          </select>
          <input className={field} value={pet.breed} onChange={(e) => setPet({ ...pet, breed: e.target.value })} placeholder="Breed" />
          <div className="flex gap-2">
            <input className={field} type="number" min={0} value={pet.ageYears} onChange={(e) => setPet({ ...pet, ageYears: Number(e.target.value) })} aria-label="Age (years)" />
            <input className={field} type="number" min={0} value={pet.weightKg ?? ""} onChange={(e) => setPet({ ...pet, weightKg: e.target.value ? Number(e.target.value) : undefined })} aria-label="Weight (kg)" />
          </div>
          <p className="col-span-2 -mt-1 text-[11px] text-teal-900/50">Age in years · weight in kg</p>
        </fieldset>

        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          {QUESTIONS.map((q) => (
            <div key={q.key}>
              <div className="mb-1 text-sm font-medium">{q.q}</div>
              <div className="flex flex-wrap gap-1.5">
                {q.options.map((o) => {
                  const active = answers[q.key] === o.v;
                  return (
                    <button
                      key={o.v}
                      onClick={() => setAnswers({ ...answers, [q.key]: o.v })}
                      className={`rounded-full px-3 py-1 text-sm ring-1 ${active ? "bg-teal-700 text-white ring-teal-700" : "bg-white text-teal-900 ring-teal-900/15"}`}
                    >
                      {o.l}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <label className="block text-sm font-medium">
            Anything else? (optional)
            <textarea className={`${field} mt-1`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. scratching left ear since Tuesday" />
          </label>
          <label className="block text-sm font-medium">
            Photo (optional, +5 credits)
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-1 block w-full text-sm"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                setPhoto(f ? await compressImage(f) : null);
              }}
            />
          </label>
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-full bg-teal-700 py-3 font-semibold text-white shadow hover:bg-teal-800 disabled:opacity-60"
        >
          {loading ? "Assessing..." : "Submit check-in"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        {result ? (
          <ResultCard r={result} />
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-teal-900/15 p-8 text-center text-sm text-teal-900/60">
            Your assessment appears here: traffic-light status, score vs. your pet&apos;s own baseline, next step, and a vet-ready brief.
          </div>
        )}
      </div>
    </div>
  );
}
