/**
 * Member offers on the dashboard's Savings tab. Fictional example partners, no real logos, not real offers,
 * except the planned nutrition range below, which is a plan and labelled so.
 */

/** The featured nutrition partner. One constant, so it can be renamed in one place. */
export const NUTRITION_BRAND = "Doctapet Nutrition";

export type Offer = { brand: string; offer: string; detail?: string };
export type OfferGroup = { id: string; title: string; offers: Offer[] };

export const OFFER_GROUPS: OfferGroup[] = [
  {
    id: "nutrition",
    title: "Supplements and nutrition",
    offers: [
      { brand: "Wholebowl", offer: "20% off joint and omega-3 supplements", detail: "Check with your vet first." },
      { brand: "Barkley Kitchen", offer: "First bag of fresh food half price" },
    ],
  },
  {
    id: "vets",
    title: "Partner vets",
    offers: [
      { brand: "Greenpaw Vets", offer: "Free nurse health check every year" },
      { brand: "Fernlea Veterinary", offer: "15% off online and in-person consults" },
    ],
  },
  {
    id: "insurers",
    title: "Insurer partnerships",
    offers: [
      { brand: "Harbourline", offer: "The Petra discount: up to 15% off your premium" },
      { brand: "Kestrel Mutual", offer: "The Petra discount, plus a loyalty month at renewal" },
    ],
  },
  {
    id: "accessories",
    title: "Accessories and grooming",
    offers: [
      { brand: "Tagalong Supply", offer: "15% off leads and harnesses" },
      { brand: "Suds & Tails", offer: "£10 off your first groom" },
    ],
  },
];
