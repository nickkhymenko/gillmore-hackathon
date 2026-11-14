"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { SpeciesIllustration } from "./illustrations";

/**
 * Shown wherever a page needs a pet and there isn't one yet (the dashboard and Savings).
 * Same shape everywhere: illustration, headline, one line, Meet your Pet Twin, and a demo pet.
 */
export function EmptyPetState({
  where = "Dashboard",
  title = (
    <>
      This space is for <span className="accent-word">your pet.</span>
    </>
  ),
  line = "A minute to set up, then it fills with things written for them alone.",
}: {
  where?: string;
  title?: React.ReactNode;
  line?: string;
}) {
  return (
    <section className="grid items-center gap-10 py-10 lg:grid-cols-12 lg:py-16">
      <div className="space-y-8 lg:col-span-7">
        <div>
          <p className="eyebrow">Petra / {where}</p>
          <h1 className="display mt-4 text-[clamp(2.75rem,7vw,5.5rem)]">{title}</h1>
          <p className="mt-5 max-w-[46ch] text-lg text-muted">{line}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/#start" className="btn btn-primary min-h-14 px-6 text-lg">
            Meet your Pet Twin <ArrowUpRight size={20} weight="bold" aria-hidden />
          </Link>
          <a href="?demo=biscuit" className="link min-h-11 content-center">
            See a demo pet
          </a>
        </div>
      </div>
      <div className="lg:col-span-5">
        <SpeciesIllustration species="dog" className="mx-auto block h-auto w-full max-w-[320px] overflow-hidden rounded-brand" />
      </div>
    </section>
  );
}
