"use client";

import Link from "next/link";
import { ArrowUpRight, Bell, PawPrint, PiggyBank } from "@phosphor-icons/react";
import { PetAvatar } from "./PetAvatar";

/** Shown wherever a page needs a pet and there isn't one yet. One primary action, one way to look around. */
export function EmptyPetState({ where = "Dashboard" }: { where?: string }) {
  return (
    <section className="grid items-center gap-12 py-10 lg:grid-cols-12 lg:py-16">
      <div className="space-y-8 lg:col-span-7">
        <div>
          <p className="eyebrow">Petra / {where}</p>
          <h1 className="display mt-4 text-[clamp(2.75rem,7vw,5.5rem)]">
            This space is for <span className="accent-word">your pet.</span>
          </h1>
          <p className="mt-5 max-w-[46ch] text-lg text-muted">A minute to set up, then it fills with things written for them alone.</p>
        </div>
        <ul className="grid gap-px overflow-hidden rounded-brand border border-line bg-line sm:grid-cols-3">
          {[
            [Bell, "Early warnings", "Small changes against their own normal, before they become claims."],
            [PawPrint, "A personalised walk", "Targets by breed, age and health, with today's weather."],
            [PiggyBank, "A cheaper premium", "Check-ins and walks lower it. It never goes up."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof Bell;
            return (
              <li key={t as string} className="bg-paper p-5">
                <I size={22} aria-hidden />
                <p className="mt-3 font-semibold">{t as string}</p>
                <p className="mt-1 text-sm text-muted">{d as string}</p>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/#start" className="btn btn-primary min-h-14 px-6 text-lg">
            Start with your pet <ArrowUpRight size={20} weight="bold" aria-hidden />
          </Link>
          <a href="/dashboard?demo=biscuit" className="link min-h-11 content-center">
            See a demo pet
          </a>
        </div>
      </div>
      <div className="hidden justify-center lg:col-span-5 lg:flex">
        <div className="relative">
          <PetAvatar traits={{ species: "dog", sizeClass: "medium", coatColours: ["#D9D2C4"], coatPattern: "solid", earShape: "floppy", muzzle: "medium" }} size={280} animated={false} title="An empty pet portrait, waiting for your pet" className="opacity-60 grayscale" />
          <span className="absolute inset-0 grid place-items-center text-6xl font-semibold text-ink/30" aria-hidden>
            ?
          </span>
        </div>
      </div>
    </section>
  );
}
