"use client";

import { useEffect, useState } from "react";
import { Sheet } from "./Sheet";
import { SOURCES } from "@/data/evidence";

const PREMIUM_SOURCES = [
  "ABI (2024). UK pet insurance: owners paid an average of £389 per pet. The anchor for the illustrative premiums.",
  "MoneySuperMarket. Average monthly premiums by breed: French Bulldog about £16.62, Labrador about £13.29.",
  "ManyPets. Breed rankings: the Border Collie is among the cheapest breeds to insure.",
  "Pearson Ham. Premiums for pets over 6 rose about 26% in a year; a 13-year-old costs about 4 times a 1-year-old to insure.",
];

/** Opens the sources sheet from anywhere, e.g. a footnote. */
export const openSources = () => window.dispatchEvent(new Event("petra:sources"));

/** The one "Sources" link in the footer: every reference behind the figures, in a sheet. */
export function SourcesLink() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("petra:sources", on);
    return () => window.removeEventListener("petra:sources", on);
  }, []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="link min-h-11 text-left sm:min-h-0">
        Sources
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Sources">
        <p className="text-sm text-muted">Prices, savings and healthy years in Petra are illustrative, built from these public sources.</p>
        <ol className="max-h-[55vh] space-y-2 overflow-y-auto text-xs text-muted">
          {[...Object.values(SOURCES), ...PREMIUM_SOURCES].map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="tnum w-5 shrink-0 font-semibold text-ink">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </Sheet>
    </>
  );
}
