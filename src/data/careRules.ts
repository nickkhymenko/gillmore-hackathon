import type { SourceId } from "./evidence";
import type { CareContext } from "@/lib/careplan";

/**
 * Care plan rules, as data. Each rule says when it applies and what it recommends.
 * Guardrails live in the engine (src/lib/careplan.ts): supplements are paused while an amber or red
 * flag is active, no doses or prescription medicines, generic ingredient names only.
 */
export type RecType = "vet" | "diet" | "habit" | "supplement" | "product";
export type Evidence = "Strong" | "Moderate" | "Limited";

export type CareRec = {
  id: string;
  type: RecType;
  title: string;
  detail: string;
  why: string;
  evidence?: Evidence;
  sources: SourceId[];
  /** Ranking weight: higher shows first. */
  priority: number;
  /** For supplements and products: example partner offers (placeholder brands, no affiliation). */
  offers?: Offer[];
};

export type Offer = { brand: string; product: string; perk: string };

export type CareRule = { id: string; when: (c: CareContext) => boolean; recs: (c: CareContext) => CareRec[] };

const OMEGA_OFFERS: Offer[] = [
  { brand: "Hedgerow Pet Co.", product: "Omega-3 fish oil for dogs", perk: "Example: 10% off first order" },
  { brand: "Tidewell", product: "Marine oil, pump bottle", perk: "Example: free delivery" },
  { brand: "Saltmarsh Naturals", product: "Omega-3 capsules", perk: "Example: subscribe and save" },
];
const JOINT_OFFERS: Offer[] = [
  { brand: "Hedgerow Pet Co.", product: "Joint support chews", perk: "Example: 10% off first order" },
  { brand: "Fellside Vet Nutrition", product: "Glucosamine and chondroitin powder", perk: "Example: trial size" },
];
const PROBIOTIC_OFFERS: Offer[] = [
  { brand: "Saltmarsh Naturals", product: "Probiotic paste", perk: "Example: trial size" },
  { brand: "Fellside Vet Nutrition", product: "Digestive support sachets", perk: "Example: free delivery" },
];
const DENTAL_OFFERS: Offer[] = [
  { brand: "Tidewell", product: "Dental chews (VOHC accepted)", perk: "Example: multi-buy saving" },
  { brand: "Hedgerow Pet Co.", product: "Finger toothbrush and enzymatic paste", perk: "Example: starter kit" },
];

export const CARE_RULES: CareRule[] = [
  {
    id: "joints",
    when: (c) => c.pet.species === "dog" && (c.big || c.senior) && c.trend.mobilityDown,
    recs: (c) => [
      { id: "mobility-check", type: "vet", title: "Book a mobility check with your vet", detail: `${c.name} has been stiffer than usual. A vet can check joints and pain before it limits walks.`, why: "Stiffness in a large or older dog is often early arthritis, which is easier to manage when caught early.", sources: ["vetcompass"], priority: 90 },
      { id: "weight-joints", type: "diet", title: "Keep weight in the lean range", detail: "Every extra kilo loads sore joints. Ask your vet for a target weight.", why: "Lean dogs have less arthritis and live longer.", evidence: "Strong", sources: ["kealy2002"], priority: 70 },
      { id: "omega-joints", type: "supplement", title: "Omega-3 fish oil for joint support", detail: "A generic omega-3 (fish oil) supplement made for dogs.", why: "Omega-3 fatty acids can help joint comfort in dogs with arthritis.", evidence: "Moderate", sources: [], priority: 50, offers: OMEGA_OFFERS },
      { id: "glucosamine", type: "supplement", title: "Glucosamine and chondroitin", detail: "Widely used for joints. Results in studies are mixed.", why: "Some owners see a benefit; the evidence is limited and mixed.", evidence: "Limited", sources: [], priority: 30, offers: JOINT_OFFERS },
    ],
  },
  {
    id: "skin",
    when: (c) => c.trend.itchyWeeks >= 1,
    recs: (c) => [
      ...(c.trend.itchyWeeks >= 3
        ? [{ id: "skin-consult", type: "vet" as const, title: "Online vet consult about the itching", detail: `${c.name} has been itchy for ${c.trend.itchyWeeks} weeks. That is long enough for a vet's view.`, why: "Itching for three weeks or more usually needs a cause found, such as parasites, allergy or infection.", sources: ["vetcompass"] as SourceId[], priority: 85 }]
        : []),
      { id: "parasites", type: "habit", title: "Check flea and parasite treatment is up to date", detail: "Look along the back and at the base of the tail, and check the date of the last treatment.", why: "Fleas are a common cause of itching.", evidence: "Strong", sources: ["pdsa"], priority: 60 },
      { id: "omega-skin", type: "supplement", title: "Omega-3 for skin and coat", detail: "A generic omega-3 (fish oil) supplement for your species.", why: "Omega-3 fatty acids can support skin barrier and coat condition.", evidence: "Moderate", sources: [], priority: 40, offers: OMEGA_OFFERS },
    ],
  },
  {
    id: "tummy",
    when: (c) => c.latest?.answers?.stool === "soft" || c.latest?.answers?.stool === "diarrhoea",
    recs: () => [
      { id: "tummy-watch", type: "vet", title: "See a vet if it lasts 48 hours or you see blood", detail: "Also if there is vomiting, low energy or not eating.", why: "Most upsets settle quickly; these are the signs that one is not.", sources: [], priority: 80 },
      { id: "hydration", type: "habit", title: "Plenty of fresh water and a bland day", detail: "Keep water topped up and feed small, plain meals.", why: "Upset tummies lose fluid quickly.", evidence: "Moderate", sources: [], priority: 55 },
      { id: "probiotic", type: "supplement", title: "Probiotic for digestive support", detail: "A generic probiotic made for pets.", why: "Probiotics may shorten mild upsets; the evidence is limited to moderate.", evidence: "Limited", sources: [], priority: 35, offers: PROBIOTIC_OFFERS },
    ],
  },
  {
    id: "teeth",
    when: (c) => (c.pet.species === "dog" || c.pet.species === "cat") && c.pet.ageYears >= 2,
    recs: (c) => [
      { id: "brushing", type: "habit", title: "Brush teeth daily", detail: `Start with a few seconds and a pet toothpaste, and build up. ${c.pet.species === "cat" ? "Many cats accept it with patience." : ""}`.trim(), why: "Daily brushing is the most effective way to prevent dental disease, one of the most common problems vets see.", evidence: "Strong", sources: ["wsava", "vetcompass"], priority: 45 },
      { id: "dental-chews", type: "product", title: "Dental chews with a VOHC seal", detail: "Choose products that carry the VOHC seal of acceptance.", why: "The seal means the product met plaque or tartar standards in trials.", evidence: "Moderate", sources: ["vohc"], priority: 25, offers: DENTAL_OFFERS },
    ],
  },
  {
    id: "weight",
    when: (c) => c.profile.bodyCondition === "over",
    recs: (c) => [
      { id: "portion-plan", type: "diet", title: "Portion plan and a vet weight clinic", detail: `Weigh ${c.name}'s food rather than scooping, and ask your vet practice about a weight clinic. No supplement needed.`, why: "Keeping a pet lean is one of the best-evidenced ways to add healthy years.", evidence: "Strong", sources: ["kealy2002"], priority: 75 },
    ],
  },
  {
    id: "cat-water",
    when: (c) => c.pet.species === "cat",
    recs: () => [
      { id: "cat-hydration", type: "habit", title: "Help your cat drink more", detail: "Try a water fountain, bowls away from food, and some wet food. Urinary diets only through your vet.", why: "Most healthy cats on a complete diet need no supplements; good hydration supports kidneys and bladder.", evidence: "Limited", sources: ["teng2024"], priority: 50 },
    ],
  },
  {
    id: "thirst",
    when: (c) => c.senior && c.trend.thirstUp,
    recs: (c) => [
      { id: "thirst-check", type: "vet", title: "Vet check for the extra thirst", detail: `${c.name} is drinking more than usual. A vet can run a simple urine and blood test. No supplement for this one.`, why: "Increased thirst in an older pet can be an early sign of kidney or hormonal disease, which is best found early.", sources: [], priority: 95 },
    ],
  },
  {
    id: "senior",
    when: (c) => c.senior,
    recs: (c) => [
      { id: "senior-check", type: "vet", title: "Senior health check every six months", detail: `${c.name} is a senior now. Twice-yearly checks catch changes earlier.`, why: "Older pets change faster, so vets recommend more frequent checks.", evidence: "Moderate", sources: ["pdsa"], priority: 40 },
    ],
  },
  {
    id: "flat-face",
    when: (c) => c.flatFaced,
    recs: (c) => [
      { id: "breathing-watch", type: "habit", title: "Count breathing while asleep", detail: `Once a week, count ${c.name}'s breaths for 30 seconds while asleep and double it. Use a harness, not a collar, and avoid heat.`, why: "Flat-faced breeds are prone to breathing problems; a rising resting rate is an early warning.", evidence: "Moderate", sources: ["mcmillan2024"], priority: 65 },
    ],
  },
  {
    id: "rabbit",
    when: (c) => c.pet.species === "rabbit",
    recs: () => [
      { id: "hay", type: "diet", title: "Unlimited hay, most of the diet", detail: "Hay or grass should be about 85% of what a rabbit eats.", why: "Hay keeps teeth worn and the gut moving.", evidence: "Strong", sources: ["rwaf"], priority: 70 },
      { id: "droppings", type: "habit", title: "Check droppings every day", detail: "Fewer or smaller droppings, or not eating, means call a vet the same day.", why: "Gut stasis in rabbits can become serious within hours.", evidence: "Strong", sources: ["rwaf"], priority: 65 },
    ],
  },
  {
    id: "horse",
    when: (c) => c.pet.species === "horse",
    recs: () => [
      { id: "farrier", type: "habit", title: "Farrier every six to eight weeks", detail: "Regular trimming keeps feet balanced and sound.", why: "Foot problems are a common cause of lameness.", evidence: "Moderate", sources: [], priority: 60 },
      { id: "weigh-tape", type: "habit", title: "Weigh tape once a month", detail: "Track weight and fat over the crest of the neck, especially in spring.", why: "Weight gain raises the risk of laminitis.", evidence: "Moderate", sources: [], priority: 55 },
      { id: "horse-dental", type: "vet", title: "Yearly dental check", detail: "By a vet or qualified equine dental technician.", why: "Sharp edges and uneven wear affect eating and comfort.", evidence: "Moderate", sources: [], priority: 45 },
    ],
  },
  {
    id: "baseline",
    when: () => true,
    recs: (c) => [
      { id: "annual", type: "vet", title: "Annual health check and vaccinations", detail: "Keep the yearly check, boosters and parasite treatment on schedule.", why: "Prevention is cheaper and kinder than treatment.", evidence: "Strong", sources: ["pdsa"], priority: 20 },
      { id: "weekly", type: "habit", title: "Keep the weekly check-in going", detail: `One minute a week builds ${c.name}'s own baseline, so small changes stand out.`, why: "It is also what earns your premium discount. Buying products never does.", sources: [], priority: 10 },
    ],
  },
];
