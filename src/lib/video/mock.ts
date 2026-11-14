import type { ClipMeta, ClipResult, LiveFrameResult } from "./contract";

/**
 * Demo analysis used until the real model is switched on, and as the fallback when it fails.
 * Owned by the UI side (the ML side owns provider.ts). Plausible values only; metrics a scan type
 * would not measure are null, exactly as the real model must do.
 */
function seeded(n: number) {
  let s = n % 2147483647 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export function mockClipResult(meta: ClipMeta, bytes = 0, now = Date.now()): ClipResult {
  const r = seeded(bytes + now / 1000);
  const cat = meta.species === "cat";
  const walk = meta.scanType === "walk" || meta.scanType === "general";
  const sleep = meta.scanType === "sleep_breathing" || meta.scanType === "general";
  const asym = walk ? Math.round((0.04 + r() * 0.12) * 100) / 100 : null;
  const flags: ClipResult["flags"] = [];
  if (asym !== null && asym > 0.13) flags.push({ code: "GAIT_ASYMMETRY", label: "Slightly uneven gait, worth watching", severity: "amber", confidence: Math.round((0.55 + r() * 0.2) * 100) / 100 });
  return {
    scanId: `mock-${Math.round(now).toString(36)}-${Math.round(r() * 1e6).toString(36)}`,
    petId: meta.petId,
    timestamp: new Date(now).toISOString(),
    scanType: meta.scanType,
    metrics: {
      mobilityScore: walk ? Math.round(76 + r() * 16) : null,
      gaitAsymmetry: asym,
      breathingRatePerMin: sleep ? Math.round((cat ? 20 : 16) + r() * 9) : null,
      activityLevel: walk ? Math.round((0.45 + r() * 0.35) * 100) / 100 : null,
      bodyConditionScore: meta.scanType === "general" || meta.scanType === "walk" ? 4 + Math.round(r() * 2) : null,
    },
    flags,
    quality: { ok: true, issue: null },
    modelVersion: "mock-0.1",
  };
}

/** A fake live overlay so the live mode can be demoed before the model exists: a few keypoints that breathe gently. */
export function mockLiveFrame(t: number, species: string): LiveFrameResult {
  const s = Math.sin(t / 400) * 0.01;
  const pts: [string, number, number][] = [
    ["nose", 0.5, 0.36],
    ["left_eye", 0.46, 0.32],
    ["right_eye", 0.54, 0.32],
    ["withers", 0.5, 0.5],
    ["left_front_paw", 0.42, 0.78],
    ["right_front_paw", 0.58, 0.78],
    ["tail_base", 0.66, 0.55],
  ];
  return {
    t,
    keypoints: pts.map(([name, x, y], i) => ({ name, x: x + s * (i % 2 ? 1 : -1), y: y + s, score: 0.6 })),
    label: `${species === "cat" ? "Cat" : species === "dog" ? "Dog" : "Pet"} (demo overlay)`,
    confidence: 0.6,
  };
}
