import { findBreed } from "./breeds";
import type { Pet, Species } from "@/lib/types";

/**
 * Sources rendered as numbered footnotes. Only published, verifiable references; where a figure is
 * not exact it is labelled "approximate" in the UI.
 */
export const SOURCES = {
  mcmillan2024: "McMillan KM et al. (2024). Longevity of companion dog breeds: those at risk from early death. Scientific Reports. About 585,000 UK dogs; median lifespan about 12.5 years; smaller breeds tend to live longer and flat-faced breeds shorter.",
  teng2022: "Teng KT et al. (2022). Life tables of annual life expectancy and mortality for companion dogs in the United Kingdom. Scientific Reports. RVC VetCompass.",
  teng2024: "Teng KT et al. (2024). Life tables of annual life expectancy and risk factors for mortality in cats in the UK. Journal of Feline Medicine and Surgery. RVC VetCompass.",
  kealy2002: "Kealy RD et al. (2002). Effects of diet restriction on life span and age-related changes in dogs. Journal of the American Veterinary Medical Association. Labradors kept lean lived a median of about 1.8 years longer than littermates fed more.",
  wang2020: "Wang T et al. (2020). Quantitative translation of dog-to-human aging by conserved remodeling of the DNA methylome. Cell Systems. Human age is about 16 × ln(dog age) + 31.",
  catchart: "Feline life stage guidance (AAHA/AAFP and International Cat Care). Commonly used cat to human age chart; approximate.",
  vetcompass: "O'Neill DG et al. RVC VetCompass studies of common disorders in UK dogs and cats (dental disease, obesity and ear and skin disease are among the most common).",
  pdsa: "PDSA Animal Wellbeing (PAW) Report. UK owner behaviour on vaccination, vet visits and weight.",
  wsava: "WSAVA Global Dental Guidelines (2020). Daily tooth brushing is the most effective home care for plaque.",
  vohc: "Veterinary Oral Health Council (VOHC). Seal of acceptance for dental products that meet plaque or tartar standards.",
  rwaf: "Rabbit Welfare Association and Fund. Hay or grass should make up most of a rabbit's diet (about 85%).",
  reading: "Gillmore Hackathon 2026 Participant Reading Guide (UK pet insurance figures, 2024).",
} as const;

export type SourceId = keyof typeof SOURCES;

/** Typical lifespan in years: approximate ranges, never a prediction for one pet. */
export function lifespanFor(pet: Pet): { range: [number, number]; note: string; sources: SourceId[] } {
  const b = findBreed(pet.breed, pet.species);
  const size = pet.sizeClass ?? b?.size ?? "medium";
  if (pet.species === "dog") {
    const bySize: Record<string, [number, number]> = { toy: [12, 15], small: [12, 15], medium: [11, 14], large: [10, 13], giant: [8, 11] };
    let range = bySize[size];
    const flat = b && ["pug", "french-bulldog", "english-bulldog", "shih-tzu", "boxer", "cavalier"].includes(b.id);
    if (flat) range = [range[0] - 2, range[1] - 2];
    return {
      range,
      note: flat
        ? "Approximate range for a flat-faced dog of this size. UK data show flat-faced breeds tend to live shorter lives."
        : "Approximate range for a dog of this size. Across UK dogs the median is about 12.5 years, and smaller breeds tend to live longer.",
      sources: ["mcmillan2024", "teng2022"],
    };
  }
  if (pet.species === "cat")
    return { range: [11, 15], note: "Approximate. UK cats have an average life expectancy at birth of about 11.7 years, and many live into their mid teens.", sources: ["teng2024"] };
  if (pet.species === "rabbit") return { range: [8, 12], note: "Approximate range commonly given for pet rabbits in the UK.", sources: ["pdsa"] };
  if (pet.species === "horse") return { range: [25, 30], note: "Approximate range commonly given for horses and ponies.", sources: [] };
  return { range: [8, 12], note: "Approximate.", sources: [] };
}

export type Lever = { id: string; label: string; detail: string; effect: number; evidence: "Strong" | "Moderate" | "Limited" | "Untested"; sources: SourceId[] };

/**
 * Habits that help a pet stay healthy for longer. Effects are ILLUSTRATIVE (years added to the
 * "healthy years" bar), chosen to show direction and rough scale, not measured for any pet.
 */
export function leversFor(species: Species): Lever[] {
  const weight = species === "dog" ? 1.0 : species === "cat" ? 0.8 : 0.5;
  return [
    { id: "weight", label: "Healthy weight", detail: species === "dog" ? "In one Labrador study, dogs kept lean lived a median of about 1.8 years longer." : "Obesity is one of the most common problems vets see, and it shortens healthy life.", effect: weight, evidence: species === "dog" ? "Strong" : "Moderate", sources: species === "dog" ? ["kealy2002"] : ["vetcompass"] },
    { id: "dental", label: species === "rabbit" ? "Dental checks and lots of hay" : "Dental care", detail: species === "rabbit" ? "Constant chewing on hay keeps rabbit teeth worn down." : "Dental disease is among the most common conditions in UK pets. Daily brushing is the best home care.", effect: 0.3, evidence: "Moderate", sources: species === "rabbit" ? ["rwaf"] : ["vetcompass", "wsava"] },
    { id: "activity", label: "Daily activity", detail: "Regular exercise helps weight, joints and behaviour.", effect: 0.3, evidence: "Moderate", sources: ["pdsa"] },
    { id: "prevent", label: "Vaccinations and parasite control", detail: "Prevents infections that are serious and costly to treat.", effect: 0.3, evidence: "Strong", sources: ["pdsa"] },
    { id: "annual", label: "Annual vet check", detail: "Problems found earlier are usually easier and cheaper to treat.", effect: 0.3, evidence: "Moderate", sources: ["pdsa"] },
    { id: "weekly", label: "Weekly Petra check-in", detail: "Our hypothesis: spotting small changes weeks earlier adds healthy time. To be tested in the pilot.", effect: 0.2, evidence: "Untested", sources: [] },
  ];
}

/** Starting point for the healthy-years bar: typical lifespan midpoint minus the years usually lived with chronic illness. Illustrative. */
export function baseHealthyYears(range: [number, number], species: Species) {
  const mid = (range[0] + range[1]) / 2;
  return Math.max(1, mid - (species === "horse" ? 5 : 2.5));
}
