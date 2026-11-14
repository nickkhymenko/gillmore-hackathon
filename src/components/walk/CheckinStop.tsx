"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { ResultCard } from "../ResultCard";
import { ResultSkeleton } from "../ResultSkeleton";
import { addCheckin, type PetRecord, type StoredCheckin } from "@/lib/store";
import type { Answers, CheckinResult } from "@/lib/types";
import { useNow } from "@/lib/usePets";

const NORMAL: Answers = {
  appetite: "normal", energy: "normal", water: "normal", stool: "normal", vomiting: "none",
  mobility: "normal", skin: "normal", breathing: "normal", urination: "normal",
};

const QUESTIONS: { key: keyof Answers; q: string; options: [string, string][] }[] = [
  { key: "appetite", q: "Appetite", options: [["normal", "Normal"], ["increased", "More"], ["reduced", "Less"], ["none", "Not eating"]] },
  { key: "energy", q: "Energy", options: [["normal", "Normal"], ["lower", "Lower"], ["very_low", "Very low"]] },
  { key: "water", q: "Drinking", options: [["normal", "Normal"], ["more", "More"], ["less", "Less"]] },
  { key: "mobility", q: "Movement", options: [["normal", "Normal"], ["stiff", "Stiff"], ["limping", "Limping"], ["unable", "Can't stand"]] },
  { key: "stool", q: "Poo", options: [["normal", "Normal"], ["soft", "Soft"], ["diarrhoea", "Diarrhoea"], ["blood", "Blood"], ["none", "None"]] },
  { key: "vomiting", q: "Being sick", options: [["none", "No"], ["once", "Once"], ["repeated", "Repeatedly"]] },
  { key: "skin", q: "Skin and coat", options: [["normal", "Normal"], ["itchy", "Itchy"], ["lump", "New lump"], ["wound", "Wound"]] },
  { key: "breathing", q: "Breathing at rest", options: [["normal", "Normal"], ["fast", "Fast"], ["laboured", "Laboured"]] },
  { key: "urination", q: "Weeing", options: [["normal", "Normal"], ["more", "More"], ["straining", "Straining"], ["none", "None"]] },
];

const WEEK = 7 * 24 * 3600 * 1000;

/** This week's 60-second check-in, inline. One decision first: was it a normal week? */
export function CheckinStop({ rec, log }: { rec: PetRecord; log: StoredCheckin[] }) {
  const now = useNow();
  const latest = log.at(-1) ?? null;
  const doneThisWeek = latest && now - new Date(latest.createdAt).getTime() < 6 * 24 * 3600 * 1000;
  const [mode, setMode] = useState<"ask" | "details">("ask");
  const [answers, setAnswers] = useState<Answers>(NORMAL);
  const [notes, setNotes] = useState("");
  const [weight, setWeight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [again, setAgain] = useState(false);
  const name = rec.pet.name;

  async function submit(a: Answers) {
    setLoading(true);
    setError(null);
    const kg = parseFloat(weight);
    const weightKg = Number.isFinite(kg) && kg > 0 ? kg : undefined;
    const pet = { ...rec.pet, ...(weightKg ? { weightKg } : {}) };
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pet,
          answers: a,
          notes,
          history: log.map((c) => c.healthScore).slice(-12),
          streakWeeks: log.filter((c) => Date.now() - new Date(c.createdAt).getTime() < 12 * WEEK).length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      addCheckin({ ...data, petName: name, petId: rec.id, answers: a, notes, weightKg });
      setResult(data);
      setAgain(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <ResultSkeleton petName={name} />;

  const shown = result ?? (doneThisWeek && !again ? latest : null);
  if (shown)
    return (
      <div className="space-y-4">
        {!result && <p className="text-muted">Already checked in this week. Here is the result.</p>}
        <ResultCard r={shown} compact />
        <button type="button" onClick={() => { setResult(null); setAgain(true); setMode("ask"); setAnswers(NORMAL); }} className="link min-h-11 text-sm">
          Something changed? Check in again
        </button>
      </div>
    );

  return (
    <div className="space-y-8">
      <h3 className="display text-[clamp(2rem,5vw,3.5rem)]">How has {name} been this week?</h3>
      {mode === "ask" ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => submit(NORMAL)} className="btn btn-primary text-lg">
            All normal <ArrowUpRight size={18} weight="bold" aria-hidden />
          </button>
          <button type="button" onClick={() => setMode("details")} className="btn btn-ghost text-lg">
            Something&apos;s different
          </button>
          <Link href="#movement" className="link min-h-11 content-center text-sm">
            Add a video (optional)
          </Link>
        </div>
      ) : (
        <AnimatePresence>
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              submit(answers);
            }}
          >
            <p className="text-muted">Tap only what is different from a normal week. About 60 seconds.</p>
            <ul className="divide-y divide-line border-y border-line">
              {QUESTIONS.map((q) => (
                <li key={q.key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold" id={`q-${q.key}`}>
                    {q.q}
                  </span>
                  <div role="radiogroup" aria-labelledby={`q-${q.key}`} className="flex flex-wrap gap-1.5">
                    {q.options.map(([v, l]) => {
                      const on = answers[q.key] === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setAnswers({ ...answers, [q.key]: v })}
                          className={`min-h-11 rounded-brand border px-3 text-sm transition-colors ${on ? "border-ink bg-ink font-semibold text-paper" : "border-line bg-white/50 hover:border-ink/40"}`}
                        >
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
            <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
              <label className="space-y-1">
                <span className="eyebrow">Anything else? (optional)</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} placeholder="For example: scratching left ear since Tuesday" className="w-full rounded-brand border border-line bg-white/60 px-3 py-2" />
              </label>
              <label className="space-y-1">
                <span className="eyebrow">Weight today (optional)</span>
                <span className="flex items-center gap-2">
                  <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" type="number" min={0} max={1200} step={0.1} placeholder={rec.pet.weightKg ? String(rec.pet.weightKg) : "kg"} className="tnum min-h-11 w-full rounded-brand border border-line bg-white/60 px-3 py-2" />
                  <span className="text-muted">kg</span>
                </span>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button type="submit" className="btn btn-primary text-lg">
                Check in <ArrowUpRight size={18} weight="bold" aria-hidden />
              </button>
              <button type="button" onClick={() => setMode("ask")} className="link min-h-11 text-muted">
                Cancel
              </button>
            </div>
          </motion.form>
        </AnimatePresence>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-red-800">
          {error}. Please try again.
        </p>
      )}
    </div>
  );
}
