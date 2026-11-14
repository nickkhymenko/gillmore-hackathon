"use client";

import { PetAvatar } from "../PetAvatar";
import { Cite } from "./Stop";
import { findBreed } from "@/data/breeds";
import { humanYears } from "@/lib/humanAge";
import type { PetRecord } from "@/lib/store";

const fmtAge = (a: number) => (a < 1 ? `${Math.round(a * 12)} months` : `${a % 1 ? a.toFixed(1) : a} ${a === 1 ? "year" : "years"}`);

export function HelloStop({ rec }: { rec: PetRecord }) {
  const { pet, profile } = rec;
  const human = humanYears(pet.species, pet.ageYears);
  const breed = findBreed(pet.breed, pet.species);
  return (
    <div className="grid items-center gap-10 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <h1 className="display text-[clamp(3rem,8vw,7.5rem)]">
          Hello, <span className="accent-word">{pet.name}.</span>
        </h1>
        <dl className="mt-8 grid max-w-xl grid-cols-2 gap-x-8 gap-y-5 border-t border-line pt-5 sm:grid-cols-3">
          <div>
            <dt className="eyebrow">Breed</dt>
            <dd className="mt-1 text-lg font-semibold tracking-[-0.02em]">{pet.breed || "Mixed or not sure"}</dd>
          </div>
          <div>
            <dt className="eyebrow">Age</dt>
            <dd className="mt-1 text-lg font-semibold tracking-[-0.02em]">{fmtAge(pet.ageYears)}</dd>
          </div>
          {human && (
            <div>
              <dt className="eyebrow">In human years</dt>
              <dd className="mt-1 text-lg font-semibold tracking-[-0.02em]">
                {human.prefix ? `${human.prefix} ` : "about "}
                {human.value}
                <Cite ids={[human.source as "wang2020" | "catchart"]} />
                <span className="block text-xs font-normal text-muted">approximate</span>
              </dd>
            </div>
          )}
          {pet.weightKg !== undefined && (
            <div>
              <dt className="eyebrow">Weight</dt>
              <dd className="mt-1 text-lg font-semibold tracking-[-0.02em]">
                {pet.weightKg} kg
                {breed && <span className="block text-xs font-normal text-muted">typical {breed.typicalKg[0]} to {breed.typicalKg[1]} kg</span>}
              </dd>
            </div>
          )}
        </dl>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.14em]">
          Powered by Doctapet. <span className="text-muted">Here with you.</span>
        </p>
      </div>
      <div className="flex justify-center lg:col-span-4">
        <PetAvatar traits={profile} size={260} title={`${pet.name}'s avatar`} />
      </div>
    </div>
  );
}
