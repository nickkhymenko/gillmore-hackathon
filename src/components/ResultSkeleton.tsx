"use client";

import { useEffect, useState } from "react";

/** Loading state for the check-in result: a skeleton of the card plus a short rotating status line. */
export function ResultSkeleton({ petName }: { petName: string }) {
  const steps = ["Reading answers", `Comparing with ${petName || "your pet"}'s baseline`, "Writing the vet brief"];
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(n + 1, 2)), 1400);
    return () => clearInterval(id);
  }, []);

  const bar = "shimmer rounded-[4px] bg-ink/10";

  return (
    <div className="space-y-6 rounded-brand border border-line bg-white/60 p-5 sm:p-7" role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3">
        <span className="shimmer inline-block h-2.5 w-2.5 rounded-full bg-accent ring-1 ring-ink/20" />
        <span className="text-sm font-medium">{steps[i]}</span>
        <span className="tnum ml-auto text-xs text-muted">{i + 1} of 3</span>
      </div>
      <div className="flex items-end gap-6">
        <div className={`${bar} h-14 w-24`} />
        <div className={`${bar} h-8 w-28`} />
      </div>
      <div className="space-y-2">
        <div className={`${bar} h-6 w-3/4`} />
        <div className={`${bar} h-4 w-full`} />
        <div className={`${bar} h-4 w-5/6`} />
      </div>
      <div className="space-y-2 border-t border-line pt-5">
        <div className={`${bar} h-3 w-20`} />
        <div className={`${bar} h-6 w-1/2`} />
      </div>
    </div>
  );
}
