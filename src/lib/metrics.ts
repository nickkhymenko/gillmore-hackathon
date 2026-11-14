import { findBreed } from "@/data/breeds";
import type { StoredCheckin } from "./store";
import type { Answers, Pet, TwinProfile } from "./types";

/**
 * Turns weekly tap answers into 0 to 100 scales (100 = a normal week for this pet) so they can be
 * charted against the pet's own baseline. These are wellbeing indices, not clinical measurements.
 */
export type MetricKey = keyof Answers | "weight";

export const SCALE: Record<keyof Answers, Record<string, number>> = {
  appetite: { normal: 100, increased: 88, reduced: 60, none: 20 },
  energy: { normal: 100, lower: 65, very_low: 30 },
  water: { normal: 100, more: 60, less: 70 },
  stool: { normal: 100, soft: 80, diarrhoea: 50, blood: 20, none: 60 },
  vomiting: { none: 100, once: 75, repeated: 30 },
  mobility: { normal: 100, stiff: 70, limping: 45, unable: 10 },
  skin: { normal: 100, itchy: 75, lump: 65, wound: 60 },
  breathing: { normal: 100, fast: 55, laboured: 15 },
  urination: { normal: 100, more: 70, straining: 25, none: 15 },
};

export const METRIC_LABEL: Record<MetricKey, { title: string; noun: string }> = {
  appetite: { title: "Appetite", noun: "appetite" },
  energy: { title: "Energy", noun: "energy" },
  water: { title: "Thirst", noun: "thirst" },
  stool: { title: "Digestion", noun: "digestion" },
  vomiting: { title: "Tummy", noun: "tummy" },
  mobility: { title: "Mobility", noun: "mobility" },
  skin: { title: "Skin and coat", noun: "skin and coat" },
  breathing: { title: "Breathing at rest", noun: "breathing at rest" },
  urination: { title: "Litter and weeing", noun: "weeing" },
  weight: { title: "Weight", noun: "weight" },
};

const FLAT_FACED = ["pug", "french-bulldog", "english-bulldog", "shih-tzu", "boxer", "cavalier", "persian"];

export function isFlatFaced(pet: Pet, profile?: TwinProfile) {
  const b = findBreed(pet.breed, pet.species);
  return (b && FLAT_FACED.includes(b.id)) || (pet.species === "dog" && profile?.muzzle === "short");
}

/** Which four trends matter most for this species, breed and age. */
export function metricsFor(pet: Pet, profile?: TwinProfile, hasWeights = false): MetricKey[] {
  const senior = pet.ageYears >= (pet.species === "cat" ? 11 : pet.species === "horse" ? 18 : pet.species === "rabbit" ? 6 : 8);
  const big = pet.sizeClass === "large" || pet.sizeClass === "giant";
  let list: MetricKey[];
  switch (pet.species) {
    case "cat":
      list = ["water", "urination", "appetite", "energy"];
      break;
    case "rabbit":
      list = ["appetite", "stool", "energy", "skin"];
      break;
    case "horse":
      list = ["mobility", "appetite", "energy", "breathing"];
      break;
    default:
      list = senior || big ? ["mobility", "water", "energy", "appetite"] : ["energy", "appetite", "mobility", "skin"];
  }
  if (isFlatFaced(pet, profile)) list = (["breathing", ...list.filter((m) => m !== "breathing")] as MetricKey[]).slice(0, 4);
  if (hasWeights) list = (["weight", ...list] as MetricKey[]).slice(0, 4);
  return list;
}

export type Point = { week: string; value: number; date: string };
export type Series = {
  key: MetricKey;
  points: Point[];
  baseline: number | null;
  band: [number, number] | null;
  latest: number | null;
  delta: number | null;
  unit: string;
  domain: [number, number];
};

const fmtWeek = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** Builds one series. Baseline = median of the earlier weeks (all but the latest), the band is its normal spread. */
export function buildSeries(key: MetricKey, log: StoredCheckin[]): Series {
  const rows = log
    .map((c) => ({ c, v: key === "weight" ? c.weightKg : c.answers ? SCALE[key][c.answers[key]] : undefined }))
    .filter((r): r is { c: StoredCheckin; v: number } => typeof r.v === "number" && Number.isFinite(r.v))
    .slice(-12);
  const points = rows.map(({ c, v }) => ({ week: fmtWeek(c.createdAt), value: v, date: c.createdAt }));
  const unit = key === "weight" ? "kg" : "";
  const earlier = points.slice(0, -1).map((p) => p.value);
  const latest = points.at(-1)?.value ?? null;
  if (earlier.length < 2) return { key, points, baseline: null, band: null, latest, delta: null, unit, domain: key === "weight" ? domainFor(points) : [0, 100] };
  const sorted = [...earlier].sort((a, b) => a - b);
  const baseline = sorted[Math.floor(sorted.length / 2)];
  const half = key === "weight" ? Math.max(baseline * 0.03, 0.2) : 8;
  const band: [number, number] = key === "weight" ? [baseline - half, baseline + half] : [Math.max(0, baseline - half), Math.min(100, baseline + half)];
  const delta = latest === null ? null : Math.round((latest - baseline) * 10) / 10;
  return { key, points, baseline, band, latest, delta, unit, domain: key === "weight" ? domainFor(points, band) : [0, 100] };
}

function domainFor(points: Point[], band?: [number, number]): [number, number] {
  const vals = [...points.map((p) => p.value), ...(band ?? [])];
  if (!vals.length) return [0, 10];
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max((hi - lo) * 0.4, hi * 0.04, 0.5);
  return [Math.max(0, Math.floor(lo - pad)), Math.ceil(hi + pad)];
}

/** One plain-English sentence per chart. */
export function sentenceFor(s: Series, name: string): string {
  const what = METRIC_LABEL[s.key].noun;
  if (s.latest === null) return `No ${what} answers yet.`;
  if (s.baseline === null || s.delta === null) return `Two more weeks and we can compare ${name}'s ${what} with their usual.`;
  if (s.key === "weight") {
    const pct = (s.delta / s.baseline) * 100;
    if (Math.abs(pct) < 3) return `${name}'s weight is steady at ${s.latest} kg.`;
    return `${name} is ${Math.abs(s.delta)} kg ${s.delta > 0 ? "heavier" : "lighter"} than usual. ${Math.abs(pct) >= 5 ? "Worth mentioning to your vet." : "Keep an eye on it."}`;
  }
  const d = Math.round(s.delta);
  if (d <= -15) return `${METRIC_LABEL[s.key].title} is ${-d} points below ${name}'s usual. Worth a vet's look.`;
  if (d <= -8) return `${METRIC_LABEL[s.key].title} has dipped ${-d} points below ${name}'s usual. Keep an eye on it.`;
  if (d >= 8) return `${METRIC_LABEL[s.key].title} is back up, ${d} points above ${name}'s recent usual.`;
  return `${METRIC_LABEL[s.key].title} is in line with ${name}'s usual.`;
}
