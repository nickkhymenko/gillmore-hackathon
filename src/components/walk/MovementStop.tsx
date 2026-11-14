"use client";

import { MovementCheck } from "../gait/MovementCheck";
import { mobilitySummary } from "../gait/scan";
import type { PetRecord, StoredCheckin } from "@/lib/store";
import { useScans } from "@/lib/video/scans";

/** "Check Biscuit's walk": the movement check right after the walk card, with a demo walk ready to analyse in one tap. */
export function MovementStop({ rec, log }: { rec: PetRecord; log: StoredCheckin[] }) {
  const name = rec.pet.name;
  const summary = mobilitySummary(useScans(rec.id), log, name);
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="display text-[clamp(2rem,5vw,3.25rem)]">
          Ten seconds of walking, <span className="accent-word">every leg checked.</span>
        </h3>
        <p className="max-w-[58ch] text-lg text-muted" role="status" data-testid="movement-stop-summary">
          {summary
            ? `${summary.text}. Last checked ${new Date(summary.scan.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}${summary.scan.scanId.startsWith("demo-") ? " with a demo walk" : ""}.`
            : `A demo walk is ready: tap Analyse to see how ${name}'s movement check works.`}
        </p>
      </div>
      <MovementCheck rec={rec} log={log} intro={false} />
    </div>
  );
}
