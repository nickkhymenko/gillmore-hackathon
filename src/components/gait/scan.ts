import type { ScanResponse } from "@/lib/video/contract";
import type { StoredCheckin } from "@/lib/store";
import type { GaitClip } from "./types";

/** Model id shown with demo walk results: SuperAnimal keypoints plus the team's gait analysis, run offline. */
export const DEMO_MODEL = "superanimal-quadruped + gait-analysis (offline, demo clip)";

/** The larger of the head and hip unevenness, in percent. Null when neither could be read. */
export function worstAsym(clip: GaitClip): number | null {
  const v = [clip.result.head_asym, clip.result.pelvis_asym].filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? Math.max(...v) : null;
}

/**
 * Mobility 0 to 100 from the model's step evenness: 100 minus the larger head or hip unevenness (percent).
 * A plain, documented mapping of the model's own numbers, nothing added.
 */
export function mobilityFromClip(clip: GaitClip): number | null {
  const w = worstAsym(clip);
  return w === null ? null : Math.max(0, Math.min(100, Math.round(100 - w)));
}

/** The demo clip's model result as a stored scan for this pet, so it feeds trends and Savings. */
export function scanFromClip(clip: GaitClip, petId: string, now = Date.now()): ScanResponse {
  const w = worstAsym(clip);
  return {
    scanId: `demo-${clip.id}-${now.toString(36)}`,
    petId,
    timestamp: new Date(now).toISOString(),
    scanType: "walk",
    metrics: {
      mobilityScore: mobilityFromClip(clip),
      gaitAsymmetry: w === null ? null : Math.min(1, Math.round(w) / 100),
      breathingRatePerMin: null,
      activityLevel: null,
      bodyConditionScore: null,
    },
    flags: clip.result.healthy
      ? []
      : [{ code: "GAIT_ASYMMETRY", label: `Uneven steps${clip.result.area ? `: ${clip.result.area}` : ""}`, severity: clip.result.model_light === "red" ? "red" : "amber", confidence: 1 }],
    quality: { ok: true, issue: null },
    modelVersion: DEMO_MODEL,
    source: "ml",
  };
}

export const isDemoScan = (s: ScanResponse) => s.scanId.startsWith("demo-");

/**
 * How a mobility score compares with this pet's own usual: the median of their earlier movement checks,
 * or, before there are any, what the owner reported about movement in the weekly check-ins.
 */
export function versusUsual(score: number, earlier: ScanResponse[], log: StoredCheckin[], name: string, even: boolean): string {
  const prior = earlier.map((s) => s.metrics.mobilityScore).filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (prior.length) {
    const median = prior[Math.floor(prior.length / 2)];
    const d = Math.round(score - median);
    if (Math.abs(d) <= 5) return `in line with ${name}'s usual`;
    return d < 0 ? `${-d} below ${name}'s usual of ${median}` : `${d} above ${name}'s usual of ${median}`;
  }
  const reported = log.filter((c) => c.answers?.mobility);
  if (reported.length) {
    const normal = reported.every((c) => c.answers?.mobility === "normal");
    if (even && normal) return `in line with ${name}'s usual`;
    return `a change from ${name}'s usual`;
  }
  return `the first check, so it sets ${name}'s usual`;
}

/** "Mobility 89, in line with Biscuit's usual" for the latest walk check, or null when there is none. */
export function mobilitySummary(scans: ScanResponse[], log: StoredCheckin[], name: string): { text: string; scan: ScanResponse } | null {
  const walks = scans.filter((s) => s.scanType === "walk" && s.source === "ml" && s.metrics.mobilityScore !== null);
  const last = walks.at(-1);
  if (!last) return null;
  const score = Math.round(last.metrics.mobilityScore!);
  return { text: `Mobility ${score}, ${versusUsual(score, walks.slice(0, -1), log, name, last.flags.length === 0)}`, scan: last };
}
