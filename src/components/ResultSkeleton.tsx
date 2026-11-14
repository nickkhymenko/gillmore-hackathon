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

  const bar = "rounded bg-teal-900/10 motion-safe:animate-pulse";

  return (
    <div className="space-y-5 rounded-3xl bg-white p-5 ring-2 ring-teal-900/10" role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-teal-600 opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-700" />
        </span>
        <span className="text-sm font-medium text-teal-900">{steps[i]}</span>
        <span className="ml-auto text-xs tabular-nums text-teal-900/50">{i + 1} of 3</span>
      </div>

      <div className="flex items-end gap-4">
        <div className={`${bar} h-12 w-20`} />
        <div className={`${bar} mb-1 h-4 w-32`} />
        <div className={`${bar} ml-auto h-12 w-24`} />
      </div>
      <div className="space-y-2">
        <div className={`${bar} h-5 w-3/4`} />
        <div className={`${bar} h-4 w-full`} />
        <div className={`${bar} h-4 w-5/6`} />
      </div>
      <div className="space-y-2 rounded-2xl bg-teal-900/[0.03] p-4">
        <div className={`${bar} h-3 w-20`} />
        <div className={`${bar} h-5 w-1/2`} />
        <div className={`${bar} h-4 w-4/5`} />
      </div>
      <div className="space-y-2">
        <div className={`${bar} h-4 w-2/3`} />
        <div className={`${bar} h-4 w-1/2`} />
      </div>
    </div>
  );
}
