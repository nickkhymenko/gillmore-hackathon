import { BREED_WALK, CATEGORY_LABEL, CATEGORY_MINUTES, GENERIC_WATCH, SIZE_CATEGORY, type ExerciseCategory } from "@/data/exercise";
import { findBreed } from "@/data/breeds";
import { isFlatFaced } from "./metrics";
import type { StoredCheckin } from "./store";
import type { Pet, TwinProfile } from "./types";

export type Pronouns = { subject: string; object: string; possessive: string };

/** Pronouns for copy. Defaults to they/them until the owner sets one in settings. */
export function pronouns(pet: Pet): Pronouns {
  if (pet.pronoun === "he") return { subject: "he", object: "him", possessive: "his" };
  if (pet.pronoun === "she") return { subject: "she", object: "her", possessive: "her" };
  return { subject: "they", object: "them", possessive: "their" };
}

export type LifeStage = "young" | "adult" | "senior";
const SENIOR = { dog: 8, cat: 11, rabbit: 6, horse: 18, other: 8 } as const;
export const lifeStageOf = (pet: Pet): LifeStage => (pet.ageYears < 1 ? "young" : pet.ageYears >= SENIOR[pet.species] ? "senior" : "adult");

export type WalkPlan = {
  kind: "walks" | "play" | "free-roam" | "turnout";
  /** null when rest is advised. */
  minutes: number | null;
  sessions: { label: string; minutes: number }[];
  category?: { label: string; estimated: boolean };
  pace: string;
  terrain: string;
  enrichment: string[];
  watch: string[];
  adjustments: string[];
  rest: string | null;
  vulnerableToHeat: boolean;
};

/** "Given {name}'s characteristics, here is their walk": target, split, pace, enrichment, watch-fors. */
export function walkPlan(pet: Pet, profile: TwinProfile, log: StoredCheckin[], now: number): WalkPlan {
  const stage = lifeStageOf(pet);
  const latest = log.at(-1);
  const flagged = latest && latest.status !== "green" && now - new Date(latest.createdAt).getTime() < 14 * 864e5;
  const stiff = latest?.answers && ["stiff", "limping"].includes(latest.answers.mobility);
  const overweight = profile.bodyCondition === "over";
  const flat = Boolean(isFlatFaced(pet, profile));
  const vulnerableToHeat = flat || overweight || stage === "senior";
  const adjustments: string[] = [];

  if (pet.species === "cat")
    return {
      kind: "play",
      minutes: stage === "senior" ? 20 : 30,
      sessions: stage === "senior" ? [{ label: "Morning play", minutes: 10 }, { label: "Evening play", minutes: 10 }] : [{ label: "Morning play", minutes: 10 }, { label: "Afternoon play", minutes: 10 }, { label: "Evening play", minutes: 10 }],
      pace: stage === "senior" ? "Gentle: let them stalk and pounce at their own speed" : "Short bursts of chase, then rest: how cats naturally hunt",
      terrain: "Climbing spots, window perches and safe hiding boxes",
      enrichment: ["Wand toy play that ends with a catch", "Puzzle feeders for part of the daily food", "Rotate toys weekly so they stay new"],
      watch: ["Drinking and litter habits", "Weight: play helps indoor cats stay lean"],
      adjustments: flagged ? ["A flag is active: keep play gentle until a vet has had a look"] : [],
      rest: latest?.status === "red" ? "Rest and see a vet first." : null,
      vulnerableToHeat: false,
    };
  if (pet.species === "rabbit")
    return {
      kind: "free-roam",
      minutes: null,
      sessions: [],
      pace: "Their own: hops, zoomies and binkies",
      terrain: "A secure run or rabbit-proofed room with places to hide",
      enrichment: ["Free-roam time every day, ideally most of the day", "A digging box and tunnels", "Scatter feeding hay and greens"],
      watch: ["Eating and droppings every day", "Heat: rabbits overheat easily, so shade and cool tiles in summer"],
      adjustments: [],
      rest: latest?.status === "red" ? "See a vet first." : null,
      vulnerableToHeat: true,
    };
  if (pet.species === "horse")
    return {
      kind: "turnout",
      minutes: null,
      sessions: [],
      pace: stage === "senior" ? "Gentle hacking and plenty of turnout" : "A mix of hacking, schooling and turnout",
      terrain: "Good footing; avoid hard or frozen ground for fast work",
      enrichment: ["Daily turnout with company", "Varied hacking routes", "Slow feeders for hay"],
      watch: ["Weight and fat over the crest in spring (laminitis risk)", "Any change in how they move"],
      adjustments: [],
      rest: latest?.status === "red" ? "Rest and see a vet first." : null,
      vulnerableToHeat: false,
    };

  // Dogs
  const breed = findBreed(pet.breed, "dog");
  const known = breed ? BREED_WALK[breed.id] : undefined;
  const cat: ExerciseCategory = known?.category ?? SIZE_CATEGORY[pet.sizeClass ?? profile.sizeClass];
  let minutes = CATEGORY_MINUTES[cat];
  if (pet.activity === "low") minutes *= 0.85;

  let sessions: WalkPlan["sessions"];
  if (stage === "young") {
    const months = Math.max(2, Math.round(pet.ageYears * 12));
    const each = Math.min(5 * months, Math.round(minutes / 2));
    minutes = each * 2;
    sessions = [{ label: "Morning", minutes: each }, { label: "Evening", minutes: each }];
    adjustments.push(`Puppy guidance: about 5 minutes per month of age, up to twice a day (${months} months, so ${each} minutes a walk). A rule of thumb, not a hard limit.`);
  } else {
    if (stage === "senior") {
      minutes *= 0.75;
      adjustments.push("Senior: shorter, more frequent walks are kinder on joints.");
    }
    if (overweight) {
      minutes *= 0.7;
      adjustments.push("A bit heavy: start at this level and add about 10% a week as fitness builds.");
    }
    if (stiff) {
      minutes *= 0.6;
      adjustments.push("Stiffness this week: gentle lead walks on soft ground. Swimming or hydrotherapy is great for joints.");
    }
    minutes = Math.round(minutes / 5) * 5;
    const split = stage === "senior" || stiff ? [0.4, 0.3, 0.3] : minutes <= 30 ? [0.6, 0.4] : [0.55, 0.45];
    const names = split.length === 3 ? ["Morning", "Midday", "Evening"] : ["Morning", "Evening"];
    sessions = split.map((f, i) => ({ label: names[i], minutes: Math.max(5, Math.round((minutes * f) / 5) * 5) }));
    minutes = sessions.reduce((s, x) => s + x.minutes, 0);
  }
  if (flat) adjustments.push("Flat-faced: keep each walk short and steady, and skip the hottest part of the day.");

  const rest = flagged ? (latest!.status === "red" ? `Rest and see a vet first. Walks can wait until ${pet.name} has been checked.` : "A flag is active: keep walks short and gentle, and book that vet consult before building up.") : null;

  return {
    kind: "walks",
    minutes: latest?.status === "red" && flagged ? null : minutes,
    sessions,
    category: { label: CATEGORY_LABEL[cat], estimated: Boolean(known?.estimated || !known) },
    pace: stage === "senior" || stiff ? "Steady and unhurried, with sniff stops" : cat === "120+" ? "Brisk, with a stretch of off-lead running where safe" : "Comfortable, with time to sniff",
    terrain: stiff || stage === "senior" ? "Soft, flat ground: grass and paths rather than hills and steps" : "Mix it up: woods, fields and park paths",
    enrichment: [
      "A sniff walk once a week: let the nose lead, it tires them out",
      cat === "120+" || cat === "120" ? "Fetch or a flirt pole for a burst of running" : "Short training games along the way",
      stiff || stage === "senior" || breed?.id === "labrador" || breed?.id === "golden-retriever" ? "Swimming or hydrotherapy: great exercise that is easy on joints" : "Scent games at home on rainy days",
    ],
    watch: known?.watch ?? GENERIC_WATCH[pet.sizeClass ?? profile.sizeClass],
    adjustments,
    rest,
    vulnerableToHeat,
  };
}
