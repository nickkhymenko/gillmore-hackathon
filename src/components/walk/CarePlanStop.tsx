"use client";

import { useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { PilotSheet } from "../Sheet";
import { Cite } from "./Stop";
import type { CareRec } from "@/data/careRules";
import { SUPPLEMENT_WARNING, buildCarePlan, careContext } from "@/lib/careplan";
import type { PetRecord, StoredCheckin } from "@/lib/store";

const TYPE_LABEL: Record<CareRec["type"], string> = { vet: "Vet", diet: "Diet", habit: "Habit", supplement: "Supplement", product: "Product" };

function EvidenceBadge({ e }: { e?: CareRec["evidence"] }) {
  if (!e) return null;
  return <span className="rounded-[3px] border border-line px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider">Evidence: {e}</span>;
}

/** Example partner products, clearly labelled. Never linked to the premium discount. */
function Offers({ rec }: { rec: CareRec }) {
  if (!rec.offers?.length) return null;
  return (
    <div className="mt-4">
      <p className="eyebrow">Partner offers (examples, no affiliation)</p>
      <ul className="mt-2 flex snap-x gap-3 overflow-x-auto pb-2">
        {rec.offers.slice(0, 3).map((o) => (
          <li key={o.brand + o.product} className="min-w-[13rem] snap-start rounded-brand border border-dashed border-ink/25 bg-white/40 p-3 text-sm">
            <p className="font-semibold">{o.brand}</p>
            <p>{o.product}</p>
            <p className="mt-1 text-xs text-muted">{o.perk}</p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Placeholder brands for the demo. Buying anything never affects your premium.</p>
    </div>
  );
}

/** Care plan: generic advice first, evidence graded, supplements paused while a flag is active. */
export function CarePlanStop({ rec, log }: { rec: PetRecord; log: StoredCheckin[] }) {
  const plan = buildCarePlan(careContext(rec.pet, rec.profile, log));
  const [sheet, setSheet] = useState<string | null>(null);
  const name = rec.pet.name;
  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <h3 className="display text-[clamp(2rem,5vw,3.5rem)]">
          {name}&apos;s <span className="accent-word">care plan.</span>
        </h3>
        <p className="mt-3 text-muted">Built from {name}&apos;s answers, age and breed. Generic advice first; anything you could buy comes last and is optional.</p>
      </div>

      {plan.paused && (
        <p className="flex max-w-2xl items-start gap-3 rounded-brand p-4 text-sm font-medium" style={{ background: "#FBEACB", color: "#6B3A00" }} role="status">
          <WarningCircle size={20} weight="fill" aria-hidden className="mt-0.5 shrink-0" />
          {plan.pausedReason}
        </p>
      )}

      <ol className="grid gap-px overflow-hidden rounded-brand border border-line bg-line md:grid-cols-2">
        {plan.recs.map((r, i) => (
          <li key={r.id} className="flex flex-col bg-paper p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">
                <span className="tnum text-ink">{String(i + 1).padStart(2, "0")}</span> / {TYPE_LABEL[r.type]}
              </span>
              <EvidenceBadge e={r.evidence} />
            </div>
            <h4 className="mt-3 text-xl font-semibold tracking-[-0.02em]">{r.title}</h4>
            <p className="mt-1 text-sm text-muted">{r.detail}</p>
            <details className="mt-2 text-sm">
              <summary className="link inline-flex min-h-11 cursor-pointer items-center">Why this</summary>
              <p className="pb-2">
                {r.why}
                <Cite ids={r.sources} />
              </p>
            </details>
            {r.type === "supplement" && (
              <div className="mt-2 space-y-3 border-t border-line pt-3">
                <p className="text-sm font-semibold">{SUPPLEMENT_WARNING}</p>
                <button type="button" onClick={() => setSheet("An online vet consult about supplements")} className="link min-h-11 text-sm">
                  Discuss with a vet
                </button>
              </div>
            )}
            {r.type === "vet" && (
              <button type="button" onClick={() => setSheet("Booking with your vet from here")} className="link mt-auto min-h-11 self-start pt-2 text-sm">
                Book with a vet
              </button>
            )}
            <Offers rec={r} />
          </li>
        ))}
      </ol>
      <p className="text-sm font-semibold">Your discount comes from check-ins only. It is never linked to buying anything.</p>
      <PilotSheet open={sheet !== null} onClose={() => setSheet(null)} what={sheet ?? ""} />
    </div>
  );
}
