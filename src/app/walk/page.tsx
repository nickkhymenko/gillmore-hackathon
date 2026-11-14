"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { PetAvatar } from "@/components/PetAvatar";
import { useActivePet } from "@/lib/usePets";

/**
 * Health Walk. Stand-in until the scroll-driven walk lands (Part 2 of docs/10):
 * greets the pet and links to this week's check-in so the onboarding never ends on a dead page.
 */
export default function WalkPage() {
  const { pet: rec, ready } = useActivePet();
  if (!ready) return <div className="min-h-[60svh]" aria-busy="true" />;
  if (!rec || rec.setupStep !== null)
    return (
      <section className="space-y-6 py-16">
        <p className="eyebrow">Health Walk</p>
        <h1 className="display text-[clamp(2.5rem,7vw,5rem)]">{rec ? `Let's finish ${rec.pet.name}'s twin first.` : "Meet your pet first."}</h1>
        <Link href="/" className="btn btn-primary text-lg">
          {rec ? "Carry on" : "Meet your Pet Twin"} <ArrowUpRight size={18} weight="bold" aria-hidden />
        </Link>
      </section>
    );
  return (
    <section className="grid min-h-[70svh] items-center gap-10 py-10 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <p className="eyebrow">01 / Hello</p>
        <h1 className="display text-[clamp(3rem,8vw,7.5rem)]">
          Hello, <span className="accent-word">{rec.pet.name}.</span>
        </h1>
        <p className="max-w-[48ch] text-lg text-muted">
          {[rec.pet.breed, `${rec.pet.ageYears} ${rec.pet.ageYears === 1 ? "year" : "years"}`, rec.pet.weightKg ? `${rec.pet.weightKg} kg` : null].filter(Boolean).join(" · ")}
        </p>
        <Link href="/checkin" className="btn btn-primary text-lg">
          Start this week&apos;s check-in <ArrowUpRight size={18} weight="bold" aria-hidden />
        </Link>
      </div>
      <div className="flex justify-center lg:col-span-4">
        <PetAvatar traits={rec.profile} size={240} title={`${rec.pet.name}'s avatar`} />
      </div>
    </section>
  );
}
