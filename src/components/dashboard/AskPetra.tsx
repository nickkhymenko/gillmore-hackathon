"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, PaperPlaneRight, Siren, VideoCamera } from "@phosphor-icons/react";
import type { AskInput, AskResult } from "@/lib/ai/ask";
import type { PetRecord, StoredCheckin } from "@/lib/store";
import type { Species } from "@/lib/types";

const STARTERS: Record<Species, (n: string) => string[]> = {
  dog: (n) => [`How much exercise does ${n} need at this age?`, `Is it normal that ${n} is drinking more?`, `What should I check on ${n}'s paws after a walk?`],
  cat: (n) => [`How can I get ${n} to drink more water?`, `Is it normal that ${n} sleeps so much?`, `How do I keep ${n} active indoors?`],
  rabbit: (n) => [`What should ${n} eat every day?`, `How do I check ${n}'s teeth at home?`, `How much space does ${n} need to exercise?`],
  horse: (n) => [`How do I check ${n}'s hooves?`, `What should I watch for when ${n} is on spring grass?`, `How much turnout does ${n} need?`],
  other: (n) => [`What should a weekly health check for ${n} include?`, `How do I know if ${n} is in pain?`, `How can I keep ${n} at a healthy weight?`],
};

type Turn = { q: string; a: AskResult | null };

/** Ask Petra: a small chat on the dashboard. Answers come from /api/ask; red flags show the yellow vet card. */
export function AskPetra({ rec, latest, walk, onAction }: { rec: PetRecord; latest: StoredCheckin | null; walk?: AskInput["walk"]; onAction: (what: string) => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const busy = turns.at(-1)?.a === null;
  const input = useRef<HTMLInputElement>(null);
  const name = rec.pet.name;

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setText("");
    setTurns((t) => [...t, { q: question, a: null }]);
    const body: AskInput = {
      question,
      pet: rec.pet,
      checkin: latest ? { status: latest.status, headline: latest.headline, notes: latest.notes ?? "", createdAt: latest.createdAt } : undefined,
      walk,
    };
    let a: AskResult;
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(String(res.status));
      a = await res.json();
    } catch {
      a = { answer: `Petra could not answer just now. If ${name} seems unwell, contact your vet.`, riskLevel: "medium", suggestVet: true, followUps: [], vetNow: false, reasons: [], source: "fallback" };
    }
    setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, a } : x)));
  }

  const lastFollowUps = turns.at(-1)?.a?.followUps ?? [];
  const chips = turns.length === 0 ? STARTERS[rec.pet.species](name) : lastFollowUps;

  return (
    <div className="space-y-4">
      {turns.length > 0 && (
        <ol className="space-y-4" aria-live="polite">
          {turns.map((t, i) => (
            <li key={i} className="space-y-3">
              <p className="ml-auto w-fit max-w-[90%] rounded-[20px] rounded-br-md bg-accent-soft px-4 py-2.5 text-sm">{t.q}</p>
              {t.a === null ? (
                <p className="inline-flex items-center gap-1.5 rounded-[20px] rounded-bl-md bg-surface px-4 py-3 shadow-soft" role="status" aria-label="Petra is typing">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="typing-dot h-2 w-2 rounded-full bg-ink/60" style={{ animationDelay: `${d * 160}ms` }} aria-hidden />
                  ))}
                </p>
              ) : t.a.vetNow ? (
                <div className="card space-y-3 border-2 !border-[#c8412b] p-5" role="alert">
                  <p className="flex items-center gap-2 text-lg font-semibold">
                    <Siren size={22} weight="bold" aria-hidden /> This needs a vet now
                  </p>
                  <p className="text-sm">{t.a.answer.replace(/^This needs a vet now\.\s*/, "")}</p>
                  {t.a.reasons.length > 0 && <p className="text-xs font-semibold">Why: {t.a.reasons.join("; ")}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onAction("Starting an online vet consult")} className="btn btn-primary">
                      <VideoCamera size={18} aria-hidden /> Start online consult
                    </button>
                    <button type="button" onClick={() => onAction("Finding the nearest emergency vet")} className="btn btn-ghost">
                      Find emergency vet <ArrowUpRight size={16} weight="bold" aria-hidden />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-[20px] rounded-bl-md bg-surface p-4 shadow-soft">
                  <p className="text-sm leading-relaxed">{t.a.answer}</p>
                  {t.a.suggestVet && (
                    <button type="button" onClick={() => onAction("Booking an online vet consult")} className="link inline-flex min-h-11 items-center gap-1 text-sm">
                      Start an online vet consult <ArrowUpRight size={14} aria-hidden />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {chips.length > 0 && !busy && (
        <ul className="flex flex-wrap gap-2" aria-label={turns.length ? "Follow-up questions" : "Starter questions"}>
          {chips.map((c) => (
            <li key={c}>
              <button type="button" onClick={() => ask(c)} className="min-h-11 rounded-full border border-line bg-surface px-4 py-2 text-left text-sm hover:border-ink/40">
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(text);
        }}
        className="flex items-center gap-2"
      >
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          aria-label={`Ask Petra about ${name}`}
          placeholder={`Is it normal that ${name}…`}
          className="min-h-12 min-w-0 flex-1 rounded-full border border-line bg-surface px-5 text-base placeholder:text-muted focus:border-ink"
        />
        <button type="submit" disabled={busy || !text.trim()} className="btn btn-primary min-h-12 px-4" aria-label="Send question">
          <PaperPlaneRight size={18} weight="bold" aria-hidden />
        </button>
      </form>
      <p className="text-xs text-muted">Petra gives general care guidance, not a diagnosis. It never gives medicine doses.</p>
    </div>
  );
}
