"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowsClockwise, Camera, PencilSimple } from "@phosphor-icons/react";
import { PetAvatar } from "./PetAvatar";
import { preparePhoto } from "@/lib/image";
import { deriveTheme, type Swatch } from "@/lib/palette";
import { saveTwin, type StoredTwin } from "@/lib/store";
import { SIZE_THEME, SPECIES_THEME, applyTheme } from "@/lib/theme";
import { useTwin } from "@/lib/useTwin";
import {
  AGE_GUESSES,
  BODY_CONDITION_LABEL,
  COAT_PATTERNS,
  EAR_SHAPES,
  MUZZLES,
  SIZE_CLASSES,
  SPECIES,
  type Species,
  type TwinProfile,
  type TwinResult,
} from "@/lib/types";

const STATUS = ["Reading the photo", "Matching breed traits", "Drawing the twin"];

const SPECIES_DEFAULT_SHAPE: Record<Species, Pick<TwinProfile, "sizeClass" | "earShape" | "muzzle">> = {
  dog: { sizeClass: "medium", earShape: "floppy", muzzle: "medium" },
  cat: { sizeClass: "small", earShape: "upright", muzzle: "short" },
  rabbit: { sizeClass: "small", earShape: "upright", muzzle: "short" },
  horse: { sizeClass: "giant", earShape: "upright", muzzle: "long" },
  other: { sizeClass: "small", earShape: "upright", muzzle: "medium" },
};

/** Instant, on-device first draft: species from the hint, coat colours straight from the photo palette. */
function provisionalProfile(species: Species, swatches: Swatch[]): TwinProfile {
  return {
    species,
    breedGuess: "",
    breedConfidence: 0,
    ...SPECIES_DEFAULT_SHAPE[species],
    coatColours: swatches.slice(0, 2).map((s) => s.hex),
    coatPattern: "solid",
    bodyCondition: "unknown",
    ageGuess: "adult",
    notes: "",
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const youngLabel = (species: Species) => (species === "cat" ? "Kitten" : species === "horse" ? "Foal" : species === "dog" ? "Puppy" : "Young");

function RotatingStatus() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(n + 1, STATUS.length - 1)), 1300);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="flex items-center gap-2 text-sm font-medium" role="status" aria-live="polite">
      <span className="shimmer inline-block h-2 w-2 rounded-full bg-accent ring-1 ring-ink/20" />
      {STATUS[i]}
      <span className="tnum text-muted">
        {i + 1}/{STATUS.length}
      </span>
    </p>
  );
}

function Chip<T extends string>({
  label,
  value,
  options,
  onChange,
  render = cap,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  render?: (v: T) => string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-brand border border-line bg-white/60 py-1 pl-3 pr-1 text-sm">
      <span className="eyebrow !tracking-[0.1em]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer rounded-[4px] bg-transparent py-1 pl-1 pr-1 font-semibold hover:bg-ink/5"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {render(o)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionLabel({ n, children, aside }: { n: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
      <h2 className="eyebrow">
        <span className="tnum text-ink">{n}</span> / {children}
      </h2>
      {aside && <span className="tnum text-xs text-muted">{aside}</span>}
    </div>
  );
}

/**
 * Photo to Pet Twin. The owner adds one photo and three things happen:
 *  1. Colours are extracted on the device and the page re-themes at once (no AI, a few ms).
 *  2. /api/twin reads the photo (Gemini vision) and guesses breed, size, coat, ears and muzzle.
 *  3. An illustrated SVG avatar is assembled from those traits. Every guess is an editable chip.
 * Used as the second onboarding step and on /twin.
 */
export function PhotoTwin({ name, speciesHint, footer }: { name: string; speciesHint?: Species; footer?: ReactNode }) {
  const twin = useTwin();
  const [busy, setBusy] = useState(false);
  const [paletteMs, setPaletteMs] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingBreed, setEditingBreed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const petName = name.trim() || twin?.name || "your pet";
  const profile = twin?.profile ?? null;

  function update(patch: Partial<TwinProfile>) {
    if (!twin) return;
    saveTwin({ ...twin, profile: { ...twin.profile, ...patch }, source: "owner", updatedAt: new Date().toISOString() });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file is not a photo. Try a JPEG or PNG.");
      return;
    }
    const id = ++requestId.current;
    setError(null);
    setNotice(null);
    setEditingBreed(false);

    let prepared;
    try {
      prepared = await preparePhoto(file);
    } catch {
      setError("We could not open that photo. Try a JPEG or PNG, or take a new one.");
      return;
    }

    // 1. Instant: theme the page from the photo itself.
    const species = speciesHint ?? twin?.profile.species ?? "dog";
    const swatchHexes = prepared.swatches.map((s) => s.hex);
    const draft: StoredTwin = {
      name: name.trim() || twin?.name || "",
      profile: provisionalProfile(species, prepared.swatches),
      theme: deriveTheme(prepared.swatches),
      swatches: swatchHexes,
      photo: prepared.thumb,
      source: "fallback",
      updatedAt: new Date().toISOString(),
    };
    applyTheme(draft.theme);
    saveTwin(draft);
    setPaletteMs(prepared.paletteMs);
    setBusy(true);

    // 2. Then: ask the vision model what it sees.
    try {
      const res = await fetch("/api/twin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name, species: speciesHint, photo: prepared.photo }),
      });
      const data = (await res.json()) as TwinResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (id !== requestId.current) return; // a newer photo replaced this one

      if (data.source === "fallback") {
        setNotice("The photo reader is not available right now, so pick the details yourself. The colours are already from your photo.");
        return;
      }
      if (!data.petVisible) {
        setNotice("We could not spot a pet in this photo. Try another one, or pick the details yourself.");
        return;
      }
      // 3. Refine: coat colours from the model replace the raw photo palette for the tint and the avatar.
      const coat = data.profile.coatColours.length ? data.profile.coatColours : draft.profile.coatColours;
      const theme = deriveTheme(prepared.swatches, data.profile.coatColours);
      applyTheme(theme);
      saveTwin({ ...draft, profile: { ...data.profile, coatColours: coat }, theme, source: "gemini", updatedAt: new Date().toISOString() });
    } catch {
      if (id === requestId.current) setNotice("We could not reach the photo reader. Pick the details yourself, the colours are already from your photo.");
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  const pct = profile ? Math.round(profile.breedConfidence * 100) : 0;
  const condition = profile ? BODY_CONDITION_LABEL[profile.bodyCondition] : null;

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-8">
      {/* Photo */}
      <div className="min-w-0 lg:col-span-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFile(e.dataTransfer.files?.[0]);
          }}
          className={`group relative block cursor-pointer ${twin?.photo ? "aspect-square sm:aspect-[4/5]" : "aspect-[4/3] lg:aspect-[4/5]"} overflow-hidden rounded-brand border bg-white/50 transition-colors duration-300 focus-within:ring-2 focus-within:ring-ink ${
            dragging ? "border-ink bg-accent-soft" : twin?.photo ? "border-line" : "border-dashed border-ink/40 hover:bg-accent-soft"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={twin?.photo ? `Replace ${petName}'s photo` : `Add a photo of ${petName}`}
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {twin?.photo ? (
            <>
              <Image src={twin.photo} alt={`Photo of ${petName}`} fill unoptimized sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" />
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-brand bg-paper/95 px-3 py-2 text-sm font-semibold">
                <ArrowsClockwise size={16} weight="bold" aria-hidden /> Use another photo
              </span>
            </>
          ) : (
            <span className="absolute inset-0 flex flex-col items-start justify-end gap-3 p-5 sm:p-6">
              <Camera size={36} weight="regular" aria-hidden />
              <span className="display text-3xl sm:text-4xl">
                Add a photo
                <br />
                of {petName}.
              </span>
              <span className="max-w-[28ch] text-sm text-muted">Take one now or pick a favourite. Face and body in good light work best. Drop a file here on desktop.</span>
            </span>
          )}
        </label>
        <p className="mt-2 text-xs text-muted">The photo is read once to build the twin. A small copy stays on this device only.</p>
        {error && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </div>

      {/* Headline: first on mobile, top right on desktop */}
      <div className="order-first min-w-0 lg:order-none lg:col-span-7 lg:col-start-6 lg:row-start-1">
          <p className="eyebrow">Prevently / Pet Twin</p>
          <h1 className="display mt-3 text-[clamp(2.5rem,6.2vw,4.75rem)]">
            {twin ? (
              <>
                Meet {petName}&apos;s <span className="accent-word">twin.</span>
              </>
            ) : (
              <>
                One photo. A whole app <span className="accent-word">about {petName}.</span>
              </>
            )}
          </h1>
          <p className="mt-4 max-w-[52ch] text-muted">
            {twin
              ? "The colours on this page now come from the photo. The guesses below are appearance only, and every one can be changed."
              : "We take the colours from the photo, guess the breed and build an illustrated twin. The app then tunes itself to that pet."}
          </p>
      </div>

      {/* Twin details */}
      <div className="min-w-0 space-y-8 lg:col-span-7 lg:col-start-6 lg:row-start-2">

        {!twin && (
          <ol className="grid gap-px overflow-hidden rounded-brand border border-line bg-line text-sm sm:grid-cols-3">
            {[
              ["01", "Palette", "Colours taken from the photo on this device. No upload needed for this part."],
              ["02", "Twin", "Breed, size, coat, ears and muzzle guessed from the photo. You confirm."],
              ["03", "Avatar", "An illustrated portrait assembled from those traits."],
            ].map(([n, t, d]) => (
              <li key={n} className="bg-paper p-4">
                <p className="eyebrow">
                  <span className="tnum text-ink">{n}</span> / {t}
                </p>
                <p className="mt-2 text-muted">{d}</p>
              </li>
            ))}
          </ol>
        )}

        {twin && profile && (
          <>
            <section className="fade-up space-y-4">
              <SectionLabel n="01" aside={paletteMs !== null ? `Built on this device in ${Math.max(1, Math.round(paletteMs))} ms. No AI.` : "From your photo"}>
                Palette
              </SectionLabel>
              <ul className="flex flex-wrap gap-3">
                {twin.swatches.map((hex) => (
                  <li key={hex} className="w-14">
                    <span className="block h-14 w-14 rounded-brand border border-line" style={{ background: hex }} />
                    <span className="tnum mt-1 block text-[10px] text-muted">{hex}</span>
                  </li>
                ))}
                <li aria-hidden className="mx-1 w-px self-stretch bg-line" />
                {(
                  [
                    ["Page", twin.theme.bg],
                    ["Accent", twin.theme.accent],
                    ["Dark", twin.theme.dark],
                  ] as const
                ).map(([label, hex]) => (
                  <li key={label} className="w-14">
                    <span className="block h-14 w-14 rounded-full border border-line" style={{ background: hex }} />
                    <span className="mt-1 block text-[10px] font-semibold">{label}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="fade-up space-y-4">
              <SectionLabel n="02" aside={busy ? "First draft from the palette" : twin.source === "gemini" ? "Read from the photo" : twin.source === "owner" ? "Edited by you" : "Your picks"}>
                Twin
              </SectionLabel>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <PetAvatar traits={profile} size={148} title={`${petName}'s illustrated avatar`} className={busy ? "shimmer" : ""} />
                <div className="min-w-0 flex-1 space-y-3">
                  {busy ? (
                    <RotatingStatus />
                  ) : notice ? (
                    <p className="text-sm font-medium" role="status">
                      {notice}
                    </p>
                  ) : null}

                  {!busy && (
                    <div aria-live="polite">
                      {editingBreed ? (
                        <form
                          className="flex flex-wrap items-center gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const v = String(new FormData(e.currentTarget).get("breed") ?? "").trim();
                            update({ breedGuess: v, breedConfidence: v ? 1 : 0 });
                            setEditingBreed(false);
                          }}
                        >
                          <label className="sr-only" htmlFor="twin-breed">
                            Breed
                          </label>
                          <input
                            id="twin-breed"
                            name="breed"
                            defaultValue={profile.breedGuess}
                            placeholder="Breed, or Mixed"
                            maxLength={60}
                            autoFocus
                            className="min-w-0 flex-1 rounded-brand border border-ink/40 bg-white px-3 py-2 text-lg"
                          />
                          <button className="btn btn-primary" type="submit">
                            Save
                          </button>
                        </form>
                      ) : (
                        <p className="text-xl leading-snug tracking-[-0.02em] sm:text-2xl">
                          {profile.breedGuess ? (
                            profile.breedConfidence >= 1 ? (
                              <>
                                {cap(petName)} is a <strong>{profile.breedGuess}</strong>.
                              </>
                            ) : pct >= 50 ? (
                              <>
                                Looks like a <strong>{profile.breedGuess}</strong>, <span className="tnum">{pct}%</span> sure.
                              </>
                            ) : (
                              <>
                                Could be a <strong>{profile.breedGuess}</strong>, but we are only <span className="tnum">{pct}%</span> sure.
                              </>
                            )
                          ) : (
                            <>We have not got a breed yet.</>
                          )}{" "}
                          <button type="button" onClick={() => setEditingBreed(true)} className="link inline-flex items-center gap-1 text-base text-muted">
                            {profile.breedGuess ? "Not right? Change" : "Add the breed"} <PencilSimple size={14} aria-hidden />
                          </button>
                        </p>
                      )}
                    </div>
                  )}

                  {!busy && condition && (
                    <p className="text-sm text-muted">
                      {cap(petName)} {condition} in this photo. That is a visual impression only, so confirm with your vet.
                    </p>
                  )}
                  {!busy && profile.notes && <p className="text-sm text-muted">{profile.notes}</p>}
                </div>
              </div>

              <div className={`flex flex-wrap gap-2 ${busy ? "pointer-events-none opacity-50" : ""}`} aria-busy={busy}>
                <Chip
                  label="Species"
                  value={profile.species}
                  options={SPECIES}
                  onChange={(species) => update({ species, ...SPECIES_DEFAULT_SHAPE[species] })}
                  render={(s) => SPECIES_THEME[s].label}
                />
                <Chip label="Size" value={profile.sizeClass} options={SIZE_CLASSES} onChange={(sizeClass) => update({ sizeClass })} render={(s) => `${SIZE_THEME[s].label}, ${SIZE_THEME[s].hint}`} />
                <Chip label="Coat" value={profile.coatPattern} options={COAT_PATTERNS} onChange={(coatPattern) => update({ coatPattern })} />
                <Chip label="Ears" value={profile.earShape} options={EAR_SHAPES} onChange={(earShape) => update({ earShape })} render={(e) => (e === "semi" ? "Folded tips" : cap(e))} />
                <Chip label="Muzzle" value={profile.muzzle} options={MUZZLES} onChange={(muzzle) => update({ muzzle })} />
                <Chip label="Life stage" value={profile.ageGuess} options={AGE_GUESSES} onChange={(ageGuess) => update({ ageGuess })} render={(a) => (a === "puppy" ? youngLabel(profile.species) : cap(a))} />
              </div>
              <p className="text-xs text-muted">Appearance only. Prevently does not diagnose from a photo.</p>
            </section>
          </>
        )}

        {footer}
      </div>
    </div>
  );
}
