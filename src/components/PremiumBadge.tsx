"use client";

import Link from "next/link";
import { usePremium } from "@/lib/premium";

/** "Premium" in the header once the owner has joined Petra Premium. */
export function PremiumBadge() {
  const member = usePremium();
  if (!member) return null;
  return (
    <Link href="/dashboard#savings" className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FFD43B]" data-testid="premium-badge">
      Premium
    </Link>
  );
}
