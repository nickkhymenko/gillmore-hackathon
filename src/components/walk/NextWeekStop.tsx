"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarPlus } from "@phosphor-icons/react";
import { downloadIcs, nextWeekSameDay } from "@/lib/ics";
import { streak } from "@/lib/discount";
import type { PetRecord, StoredCheckin } from "@/lib/store";
import { useNow } from "@/lib/usePets";
import { CheaperCta } from "./YourWalkStop";

export function NextWeekStop({ rec, log }: { rec: PetRecord; log: StoredCheckin[] }) {
  const now = useNow();
  const weeks = streak(log, now);
  const next = nextWeekSameDay(new Date(log.at(-1)?.createdAt ?? now));
  const when = next.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="space-y-8">
      <h3 className="display text-[clamp(2.5rem,7vw,5.5rem)]">
        Same time <span className="accent-word">next week?</span>
      </h3>
      <div className="flex flex-wrap gap-x-12 gap-y-4">
        <div>
          <p className="eyebrow">Streak</p>
          <p className="text-4xl font-semibold tracking-[-0.03em]">
            {weeks} {weeks === 1 ? "week" : "weeks"}
          </p>
        </div>
        <div>
          <p className="eyebrow">Next check-in</p>
          <p className="text-4xl font-semibold tracking-[-0.03em]">{when}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="button" onClick={() => downloadIcs(rec.pet.name, next)} className="btn btn-primary text-lg">
          <CalendarPlus size={20} aria-hidden /> Add a weekly reminder
        </button>
        <Link href="/dashboard" className="link inline-flex min-h-11 items-center gap-1">
          Go to {rec.pet.name}&apos;s dashboard <ArrowUpRight size={16} aria-hidden />
        </Link>
      </div>
      <p className="text-sm text-muted">The reminder is a calendar file for your own calendar. Nothing is sent anywhere.</p>
      <div className="border-t border-line pt-8">
        <p className="display mb-5 max-w-2xl text-[clamp(1.75rem,4vw,2.75rem)]">
          Make {rec.pet.name}&apos;s walks <span className="accent-word">pay.</span>
        </p>
        <CheaperCta name={rec.pet.name} />
      </div>
    </div>
  );
}
