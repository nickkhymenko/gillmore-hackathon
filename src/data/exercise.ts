import type { SizeClass } from "@/lib/types";

/**
 * Daily exercise guidance by breed, using The Kennel Club's breed exercise categories
 * (up to 30 minutes, up to 1 hour, up to 2 hours, more than 2 hours a day).
 * Crossbreeds are not listed by the Kennel Club, so theirs are estimates and say so in the UI.
 */
export type ExerciseCategory = "30" | "60" | "120" | "120+";

export const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  "30": "Up to 30 minutes a day",
  "60": "Up to 1 hour a day",
  "120": "Up to 2 hours a day",
  "120+": "More than 2 hours a day",
};

/** Target minutes we plan around for each category (upper end, then adjusted for age and health). */
export const CATEGORY_MINUTES: Record<ExerciseCategory, number> = { "30": 30, "60": 60, "120": 100, "120+": 130 };

type BreedWalk = { category: ExerciseCategory; estimated?: boolean; watch: string[] };

export const BREED_WALK: Record<string, BreedWalk> = {
  labrador: { category: "120+", watch: ["Weight: Labradors gain easily, so keep treats in the daily allowance", "Joints: watch for stiffness after long walks", "Water: most love a swim; dry their ears afterwards"] },
  cockapoo: { category: "60", estimated: true, watch: ["Ears: check for grass seeds after country walks", "Coat: burrs and mud mats quickly, so brush after walks"] },
  "french-bulldog": { category: "60", watch: ["Overheating: walk in the cool of the day and keep walks short", "Breathing: stop if breathing becomes noisy or laboured", "Use a harness, not a collar"] },
  "cocker-spaniel": { category: "120+", watch: ["Ears and paws: check for grass seeds in summer", "Nose-led: practise recall in safe areas"] },
  dachshund: { category: "60", watch: ["Back: avoid jumping off sofas and lots of stairs", "Keep them lean to protect their spine"] },
  "border-collie": { category: "120+", watch: ["Needs mental work too: training games and scent work on walks", "Can overdo it: build in rest days"] },
  "golden-retriever": { category: "120+", watch: ["Weight and joints: steady exercise, not weekend marathons", "Water: dry ears after swimming"] },
  "german-shepherd": { category: "120+", watch: ["Hips: steady exercise, and avoid too much jumping while young", "Watch for hind-leg weakness on longer walks"] },
  staffie: { category: "60", watch: ["Strong pullers: a well-fitted harness helps", "Can overheat: shade and water on warm days"] },
  "jack-russell": { category: "60", watch: ["Prey drive: practise recall and use a long line near wildlife", "Keep an eye on knees (slipping kneecaps)"] },
  "shih-tzu": { category: "30", watch: ["Heat: short muzzle, so walk in the cool of the day", "Eyes: check for scratches after walks through long grass"] },
  pug: { category: "60", watch: ["Overheating: short walks, early or late on warm days", "Breathing: stop if it becomes noisy", "Weight: pugs gain easily"] },
  cavalier: { category: "60", watch: ["Watch for tiring sooner than usual or coughing: worth a vet check", "Keep walks steady rather than strenuous"] },
  springer: { category: "120+", watch: ["Grass seeds: check ears, paws and armpits", "Needs a job: retrieve and scent games"] },
  beagle: { category: "120+", watch: ["Nose-led: recall can vanish on a scent, use a long line", "Weight: beagles love food"] },
  "mini-schnauzer": { category: "60", watch: ["Fatty treats can upset tummies", "Keep up regular walks for weight"] },
  bichon: { category: "30", watch: ["Coat: check for mats and burrs after walks", "Short, frequent walks suit them"] },
  "border-terrier": { category: "60", watch: ["Prey drive: recall near wildlife", "Check for ticks after country walks"] },
  yorkie: { category: "30", watch: ["Small and light: watch for bigger dogs", "Cold: a coat helps in winter"] },
  chihuahua: { category: "30", watch: ["Cold: a coat helps in winter", "Short walks, and carry them over rough ground"] },
  labradoodle: { category: "120", estimated: true, watch: ["Coat: brush after muddy walks", "Weight and joints, like both parent breeds"] },
  westie: { category: "60", watch: ["Skin: rinse and check after walks through long grass", "Short legs: avoid very long hikes"] },
  "english-bulldog": { category: "30", watch: ["Overheating: walk only in the cool of the day", "Breathing: stop if it becomes noisy", "Short, gentle walks"] },
  boxer: { category: "120+", watch: ["Heat: short muzzle, so walk in cool hours", "Energetic: play and training help"] },
  whippet: { category: "60", watch: ["Thin coat: a coat in cold or wet weather", "Sighthound: secure areas for off-lead sprints"] },
  greyhound: { category: "60", watch: ["Sighthound: lead or secure areas only", "Short bursts are enough; they love to rest"] },
  husky: { category: "120+", watch: ["Heat: avoid exercise on warm days", "Escape artists: secure harness and recall"] },
  rottweiler: { category: "120+", watch: ["Joints: steady exercise, especially while growing", "Strong: good lead manners matter"] },
  "great-dane": { category: "120", watch: ["No exercise for an hour before and after meals (bloat risk)", "Gentle exercise while growing"] },
};

/** Fallback category by size for mixed or unlisted dogs. */
export const SIZE_CATEGORY: Record<SizeClass, ExerciseCategory> = { toy: "30", small: "60", medium: "60", large: "120", giant: "120" };

export const GENERIC_WATCH: Record<SizeClass, string[]> = {
  toy: ["Cold: a coat helps in winter", "Short, frequent walks suit small legs"],
  small: ["Check paws and coat after walks", "Keep up recall practice"],
  medium: ["Check paws and ears after walks", "Mix lead walks with play"],
  large: ["Weight and joints: steady exercise beats weekend marathons", "Water on longer walks"],
  giant: ["No hard exercise for an hour around meals (bloat risk)", "Gentle exercise while growing"],
};
