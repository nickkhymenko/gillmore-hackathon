"use client";

import Link from "next/link";
import { Sparkle } from "@phosphor-icons/react";
import { PLAN_NAME, PLAN_SHORT, usePremium } from "@/lib/premium";

/** A small "Plus" pill in the header once the owner has joined Petra Plus. */
export function PremiumBadge() {
  const member = usePremium();
  if (!member) return null;
  return (
    <Link
      href="/dashboard#savings"
      className="fade-up inline-flex shrink-0 items-center gap-1 rounded-full border border-ink/10 bg-accent-soft px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] text-ink"
      data-testid="premium-badge"
      aria-label={`${PLAN_NAME} member. Open member offers`}
    >
      <Sparkle size={12} weight="fill" aria-hidden /> {PLAN_SHORT}
    </Link>
  );
}
