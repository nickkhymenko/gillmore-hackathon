"use client";

import Link from "next/link";
import { ArrowUpRight, WarningCircle } from "@phosphor-icons/react";
import type { PetRecord, StoredCheckin } from "@/lib/store";
import { useNow } from "@/lib/usePets";
import { pronouns, walkPlan } from "@/lib/walkplan";

/** The big call to action that leads into Savings. */
export function CheaperCta({ name }: { name: string }) {
  return (
    <Link href="/savings" className="btn btn-primary min-h-14 px-6 text-lg sm:text-xl">
      Make my insurance cheaper today <ArrowUpRight size={20} weight="bold" aria-hidden />
      <span className="sr-only">with {name}&apos;s walks</span>
    </Link>
  );
}

/** "Given {name}'s characteristics, here is their walk": written for this one pet. */
export function YourWalkStop({ rec, log }: { rec: PetRecord; log: StoredCheckin[] }) {
  const now = useNow();
  const { pet } = rec;
  const p = pronouns(pet);
  const plan = walkPlan(pet, rec.profile, log, now);
  // At most three tips, merging pace, where, ideas and watch-fors.
  const tips: [string, string][] = [
    ["Watch for", plan.watch[0]],
    ["Pace and place", `${plan.pace}. ${plan.terrain}.`],
    ["Try", plan.enrichment[0]],
  ].filter((t): t is [string, string] => Boolean(t[1]));
  const what = plan.kind === "play" ? "play plan" : plan.kind === "free-roam" ? "free-roam plan" : plan.kind === "turnout" ? "exercise plan" : "walk";

  return (
    <div className="space-y-10">
      <h3 className="display max-w-4xl text-[clamp(2rem,5vw,3.75rem)]">
        Given {pet.name}&apos;s characteristics, here is {p.possessive} <span className="accent-word">{what}.</span>
      </h3>

      {plan.rest && (
        <p className="flex max-w-2xl items-start gap-3 rounded-brand p-4 text-sm font-medium" style={{ background: "#FBEACB", color: "#6B3A00" }} role="status">
          <WarningCircle size={20} weight="fill" aria-hidden className="mt-0.5 shrink-0" />
          {plan.rest}
        </p>
      )}

      <div className="space-y-8">
        {plan.minutes !== null ? (
          <div>
            <p className="eyebrow">{plan.kind === "play" ? "Play today" : "Daily target"}</p>
            <p className="text-[clamp(3rem,8vw,5rem)] font-semibold leading-none tracking-[-0.05em]">
              {plan.minutes}
              <span className="text-2xl font-medium tracking-[-0.02em] text-muted"> minutes</span>
            </p>
            {plan.sessions.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {plan.sessions.map((s) => (
                  <li key={s.label} className="rounded-brand border border-line bg-white/60 px-3 py-2 text-sm">
                    <span className="font-semibold">{s.label}</span> {s.minutes} min
                  </li>
                ))}
              </ul>
            )}
            {(plan.category || plan.adjustments.length > 0) && (
              <p className="mt-3 max-w-2xl text-sm text-muted">
                {plan.category && `Kennel Club exercise category: ${plan.category.label}${plan.category.estimated ? " (estimated for this breed or mix)" : ""}. `}
                {plan.adjustments.join(" ")}
              </p>
            )}
          </div>
        ) : (
          plan.kind === "walks" && <p className="text-2xl font-semibold tracking-[-0.03em]">No walk target today.</p>
        )}
        <ol className="grid gap-px overflow-hidden rounded-card border border-line bg-line shadow-soft md:grid-cols-3">
          {tips.map(([t, d], i) => (
            <li key={t} className="bg-surface p-5">
              <p className="eyebrow">
                <span className="tnum text-ink">{String(i + 1).padStart(2, "0")}</span> / {t}
              </p>
              <p className="mt-2">{d}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6">
        <CheaperCta name={pet.name} />
        <span className="max-w-sm text-sm text-muted">
          Hit {pet.name}&apos;s personal target and {p.possessive} premium drops. It can only go down.
        </span>
      </div>
    </div>
  );
}
