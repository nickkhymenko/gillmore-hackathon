"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, GearSix, Plus, Trash } from "@phosphor-icons/react";
import { PetAvatar } from "./PetAvatar";
import { removePet, setActivePet } from "@/lib/store";
import { undoable } from "@/lib/toast";
import { useHousehold } from "@/lib/usePets";

/** Avatar stack in the header: switch pet, add another, pet settings, remove this pet (with undo). */
export function PetSwitcher() {
  const { household } = useHousehold();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pets = household.pets;
  if (pets.length === 0) return null;
  const active = pets.find((p) => p.id === household.activeId) ?? pets[0];
  const others = pets.filter((p) => p.id !== active.id).slice(0, 2);

  return (
    <div ref={root} className="relative shrink-0">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${active.pet.name}. Switch pet or add another`}
        onClick={() => setOpen((o) => !o)}
        className="fade-up flex min-h-11 items-center rounded-full pl-1 pr-1 hover:bg-ink/5"
      >
        {others.map((p) => (
          <span key={p.id} className="-mr-3 hidden rounded-full ring-2 ring-paper sm:block">
            <PetAvatar traits={p.profile} size={28} animated={false} title={p.pet.name} />
          </span>
        ))}
        <span className="relative rounded-full ring-2 ring-paper">
          <PetAvatar traits={active.profile} size={36} title={`${active.pet.name}'s avatar`} />
        </span>
      </button>

      {open && (
        <div role="menu" aria-label="Pets" className="fade-up absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-brand border border-line bg-paper shadow-lg">
          <p className="eyebrow px-4 pb-1 pt-3">Your pets</p>
          {pets.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitemradio"
              aria-checked={p.id === active.id}
              onClick={() => {
                setActivePet(p.id);
                setOpen(false);
                if (p.setupStep !== null) router.push("/");
              }}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left hover:bg-ink/5"
            >
              <PetAvatar traits={p.profile} size={32} animated={false} title="" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.pet.name}</span>
                <span className="block truncate text-xs text-muted">{p.setupStep !== null ? "Setup not finished" : p.pet.breed || p.profile.breedGuess || p.pet.species}</span>
              </span>
              {p.id === active.id && <Check size={16} weight="bold" aria-hidden />}
            </button>
          ))}
          <div className="border-t border-line py-1">
            <Link role="menuitem" href="/add" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 px-4 text-sm font-medium hover:bg-ink/5">
              <Plus size={16} aria-hidden /> Add another pet
            </Link>
            <Link role="menuitem" href="/twin" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 px-4 text-sm font-medium hover:bg-ink/5">
              <GearSix size={16} aria-hidden /> {active.pet.name}&apos;s settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                undoable(`${active.pet.name} removed.`, removePet(active.id));
              }}
              className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm font-medium text-red-800 hover:bg-red-50"
            >
              <Trash size={16} aria-hidden /> Remove {active.pet.name}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
