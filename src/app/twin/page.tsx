"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { PhotoTwin } from "@/components/PhotoTwin";
import { clearAll, saveTwin } from "@/lib/store";
import { useTwin } from "@/lib/useTwin";

/**
 * Pet Twin. For now this hosts the photo step on its own so it can be tested;
 * the full onboarding (Step 1) and the scroll-driven walk (Step 2) build on it.
 */
export default function TwinPage() {
  const twin = useTwin();
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? twin?.name ?? "";

  return (
    <div className="space-y-8 py-4 sm:py-8">
      <label className="flex max-w-sm flex-col gap-1">
        <span className="eyebrow">Pet name</span>
        <input
          value={name}
          maxLength={40}
          placeholder="Biscuit"
          autoComplete="off"
          onChange={(e) => {
            setDraft(e.target.value);
            if (twin) saveTwin({ ...twin, name: e.target.value.trim() });
          }}
          className="border-b border-ink/40 bg-transparent py-2 text-2xl font-semibold tracking-[-0.03em] placeholder:text-ink/25 focus:border-ink"
        />
      </label>

      <PhotoTwin
        name={name}
        footer={
          twin && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-5">
              <Link href="/checkin" className="btn btn-primary">
                Start this week&apos;s scan <ArrowUpRight size={18} weight="bold" aria-hidden />
              </Link>
              <button
                type="button"
                className="link text-sm text-muted"
                onClick={() => {
                  clearAll();
                  setDraft(null);
                }}
              >
                Reset demo
              </button>
            </div>
          )
        }
      />
    </div>
  );
}
