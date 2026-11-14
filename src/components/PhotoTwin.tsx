"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, ArrowsClockwise, Camera, Check, PencilSimple, Trash } from "@phosphor-icons/react";
import { PetAvatar } from "./PetAvatar";
import { preparePhoto } from "@/lib/image";
import { deriveTheme, hexToRgb, rgbToHsl, withAccent } from "@/lib/palette";
import { SPECIES_DEFAULT_SHAPE } from "@/lib/profile";
import { removePhoto, resetPetTheme, themeEdited, updatePet, type PetRecord } from "@/lib/store";
import { SIZE_THEME, SPECIES_THEME } from "@/lib/theme";
import { undoable } from "@/lib/toast";
import { useHousehold } from "@/lib/usePets";
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

function Chip<T extends string>({ label, value, options, onChange, render = cap }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void; render?: (v: T) => string }) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-brand border border-line bg-white/60 py-1 pl-3 pr-1 text-sm">
      <span className="eyebrow !tracking-[0.1em]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="cursor-pointer rounded-[4px] bg-transparent py-1 pl-1 pr-1 font-semibold hover:bg-ink/5">
        {options.map((o) => (
          <option key={o} value={o}>
            {render(o)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionLabel({ n, children, aside }: { n: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
      <h3 className="eyebrow">
        <span className="tnum text-ink">{n}</span> / {children}
      </h3>
      {aside && <span className="tnum text-right text-xs text-muted">{aside}</span>}
    </div>
  );
}

/** Replace, remove and reset controls. Shown everywhere the photo appears. */
export function PhotoControls({ rec, onReplace }: { rec: PetRecord; onReplace: () => void }) {
  if (!rec.photo) return null;
  const edited = themeEdited(rec);
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      <button type="button" onClick={onReplace} className="link inline-flex min-h-11 items-center gap-1.5">
        <ArrowsClockwise size={15} aria-hidden /> Replace photo
      </button>
      <button type="button" onClick={() => undoable("Photo removed.", removePhoto(rec.id))} className="link inline-flex min-h-11 items-center gap-1.5">
        <Trash size={15} aria-hidden /> Remove photo
      </button>
      <button
        type="button"
        disabled={!edited}
        onClick={() => resetPetTheme(rec.id)}
        title={edited ? "Go back to the colours from the photo" : "Already using the colours from the photo"}
        className="link inline-flex min-h-11 items-center gap-1.5 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
      >
        <ArrowCounterClockwise size={15} aria-hidden /> Reset theme
      </button>
    </div>
  );
}

/**
 * Photo to Pet Twin, for one pet. The owner adds a photo and three things happen:
 *  1. Colours are extracted on the device and the page re-themes at once (no AI, a few ms).
 *  2. /api/twin reads the photo (Gemini vision) and guesses breed, size, coat, ears and muzzle.
 *  3. An illustrated SVG avatar is assembled from those traits.
 * `onboarding` keeps it to one decision (the photo); `settings` shows every trait as an editable chip.
 */
export function PhotoTwin({ petId, mode = "settings" }: { petId: string; mode?: "onboarding" | "settings" }) {
  const { household } = useHousehold();
  const rec = household.pets.find((p) => p.id === petId) ?? null;
  const [busy, setBusy] = useState(false);
  const [paletteMs, setPaletteMs] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingBreed, setEditingBreed] = useState(false);
  const [showChips, setShowChips] = useState(mode === "settings");
  const [dragging, setDragging] = useState(false);
  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!rec) return null;
  const name = rec.pet.name || "your pet";
  const profile = rec.profile;
  const settings = mode === "settings";
  const hasTwin = Boolean(rec.photo) || rec.twinSource !== "breed" || settings;

  function updateProfile(patch: Partial<TwinProfile>) {
    updatePet(petId, (p) => ({ profile: { ...p.profile, ...patch }, twinSource: "owner" }));
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
    const theme = deriveTheme(prepared.swatches);
    updatePet(petId, {
      photo: prepared.thumb,
      swatches: prepared.swatches.map((s) => s.hex),
      photoTheme: theme,
      theme,
    });
    setPaletteMs(prepared.paletteMs);
    setBusy(true);

    // 2. Then: ask the vision model what it sees.
    try {
      const res = await fetch("/api/twin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, species: rec?.pet.species, photo: prepared.photo }),
      });
      const data = (await res.json()) as TwinResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (id !== requestId.current) return; // a newer photo replaced this one

      if (data.source === "fallback") {
        setNotice("The photo reader is not available right now. The colours are already from your photo, and you can set the details next.");
        return;
      }
      if (!data.petVisible) {
        setNotice("We could not spot a pet in this photo. Try another one, or carry on and set the details yourself.");
        return;
      }
      // 3. Refine: the model's coat colours (the animal only) replace the raw photo palette.
      // The owner chose the species, so it stays; say so if the photo disagrees.
      const chosen = rec?.pet.species ?? data.profile.species;
      if (data.profile.species !== chosen) setNotice(`This photo looks like a ${data.profile.species}, but you chose ${chosen}. Go back to change the species, or try another photo.`);
      const refined = deriveTheme(prepared.swatches, data.profile.coatColours);
      updatePet(petId, (p) => ({
        profile: { ...data.profile, species: chosen, coatColours: data.profile.coatColours.length ? data.profile.coatColours : p.profile.coatColours },
        photoTheme: refined,
        theme: refined,
        twinSource: "gemini",
      }));
    } catch {
      if (id === requestId.current) setNotice("We could not reach the photo reader. The colours are already from your photo, and you can set the details next.");
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  const pct = Math.round(profile.breedConfidence * 100);
  const condition = BODY_CONDITION_LABEL[profile.bodyCondition];

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-x-12">
      {/* Photo */}
      <div className="min-w-0 lg:col-span-5">
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
          className={`group relative block cursor-pointer overflow-hidden rounded-brand border bg-white/50 transition-colors duration-300 focus-within:ring-2 focus-within:ring-ink ${
            rec.photo ? "aspect-square border-line sm:aspect-[4/5]" : "aspect-[4/3] lg:aspect-[4/5]"
          } ${dragging ? "border-ink bg-accent-soft" : rec.photo ? "" : "border-dashed border-ink/40 hover:bg-accent-soft"}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={rec.photo ? `Replace ${name}'s photo` : `Add a photo of ${name}`}
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {rec.photo ? (
            <Image src={rec.photo} alt={`Photo of ${name}`} fill unoptimized sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex flex-col items-start justify-end gap-3 p-5 sm:p-6">
              <Camera size={36} aria-hidden />
              <span className="display text-3xl sm:text-4xl">Tap to add a photo</span>
              <span className="max-w-[30ch] text-sm text-muted">Take one now or pick a favourite. Face and body in good light work best. You can drop a file here on desktop.</span>
            </span>
          )}
        </label>
        <div className="mt-1">
          <PhotoControls rec={rec} onReplace={() => inputRef.current?.click()} />
        </div>
        <p className="mt-1 text-xs text-muted">The photo is read once to build the twin. A small copy stays on this device only.</p>
        {error && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-800">
            {error}
          </p>
        )}
      </div>

      {/* Twin */}
      <div className="min-w-0 space-y-8 lg:col-span-7">
        {!hasTwin && (
          <ol className="grid gap-px overflow-hidden rounded-brand border border-line bg-line text-sm sm:grid-cols-3">
            {[
              ["01", "Palette", "Colours taken from the photo on this device. No AI for this part."],
              ["02", "Twin", "Breed, size, coat, ears and muzzle guessed from the photo. You confirm."],
              ["03", "Avatar", `An illustrated portrait of ${name}, assembled from those traits.`],
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

        {rec.photo && rec.swatches.length > 0 && (
          <section className="fade-up space-y-4">
            <SectionLabel n="01" aside={paletteMs !== null ? `Built on this device in ${Math.max(1, Math.round(paletteMs))} ms. No AI.` : "From your photo"}>
              Palette
            </SectionLabel>
            <ul className="flex flex-wrap gap-3" aria-label="Colours from the photo. Choose one to use as the accent.">
              {rec.swatches.map((hex) => {
                // Grey swatches fall back to the brand accent, so only colourful swatches can be "the" accent.
                const on = rgbToHsl(hexToRgb(hex))[1] >= 0.08 && rec.theme.accent === withAccent(rec.theme, hex).accent;
                return (
                  <li key={hex} className="w-14">
                    <button
                      type="button"
                      onClick={() => updatePet(petId, (p) => ({ theme: withAccent(p.theme, hex) }))}
                      aria-pressed={on}
                      aria-label={`Use ${hex} as the accent colour`}
                      className="relative block h-14 w-14 rounded-brand border border-line transition-transform hover:-translate-y-0.5"
                      style={{ background: hex }}
                    >
                      {on && (
                        <span className="absolute inset-0 grid place-items-center">
                          <Check size={18} weight="bold" color={luma(hex) > 0.45 ? "#141414" : "#FFFFFF"} aria-hidden />
                        </span>
                      )}
                    </button>
                    <span className="tnum mt-1 block text-[10px] text-muted">{hex}</span>
                  </li>
                );
              })}
              <li aria-hidden className="mx-1 w-px self-stretch bg-line" />
              {(
                [
                  ["Page", rec.theme.bg],
                  ["Accent", rec.theme.accent],
                  ["Dark", rec.theme.dark],
                ] as const
              ).map(([label, hex]) => (
                <li key={label} className="w-14">
                  <span className="block h-14 w-14 rounded-full border border-line" style={{ background: hex }} />
                  <span className="mt-1 block text-[10px] font-semibold">{label}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">Tap a colour to make it the accent. Reset theme goes back to the photo&apos;s own palette.</p>
          </section>
        )}

        {hasTwin && (
          <section className="fade-up space-y-4">
            <SectionLabel
              n={rec.photo ? "02" : "01"}
              aside={busy ? "First draft from the palette" : rec.twinSource === "gemini" ? "Read from the photo" : rec.twinSource === "owner" ? "Edited by you" : rec.photo ? "Your picks" : "From your answers"}
            >
              Twin
            </SectionLabel>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <PetAvatar traits={profile} size={148} title={`${name}'s illustrated avatar`} className={busy ? "shimmer" : ""} />
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
                          updateProfile({ breedGuess: v, breedConfidence: v ? 1 : 0 });
                          updatePet(petId, (p) => ({ pet: { ...p.pet, breed: v } }));
                          setEditingBreed(false);
                        }}
                      >
                        <label className="sr-only" htmlFor={`breed-${petId}`}>
                          Breed
                        </label>
                        <input
                          id={`breed-${petId}`}
                          name="breed"
                          defaultValue={profile.breedGuess}
                          placeholder="Breed, or Mixed"
                          maxLength={60}
                          autoFocus
                          className="min-h-11 min-w-0 flex-1 rounded-brand border border-ink/40 bg-white px-3 py-2 text-lg"
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
                              {cap(name)} is a <strong>{profile.breedGuess}</strong>.
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
                          <>{rec.photo ? "We have not got a breed yet." : `${cap(name)}'s twin is ready for a photo.`}</>
                        )}{" "}
                        {settings ? (
                          <button type="button" onClick={() => setEditingBreed(true)} className="link inline-flex min-h-11 items-center gap-1 text-base text-muted">
                            {profile.breedGuess ? "Not right? Change" : "Add the breed"} <PencilSimple size={14} aria-hidden />
                          </button>
                        ) : (
                          profile.breedGuess && <span className="block text-base text-muted">You can confirm the breed on the next screen.</span>
                        )}
                      </p>
                    )}
                  </div>
                )}

                {!busy && condition && (
                  <p className="text-sm text-muted">
                    {cap(name)} {condition} in this photo. That is a visual impression only, so confirm with your vet.
                  </p>
                )}
                {!busy && profile.notes && <p className="text-sm text-muted">{profile.notes}</p>}
                {!settings && !busy && (
                  <button type="button" onClick={() => setShowChips((s) => !s)} aria-expanded={showChips} className="link min-h-11 text-sm">
                    {showChips ? "Done adjusting" : "Adjust the avatar"}
                  </button>
                )}
              </div>
            </div>

            {showChips && (
              <div className={`flex flex-wrap gap-2 ${busy ? "pointer-events-none opacity-50" : ""}`} aria-busy={busy}>
                {settings && (
                  <Chip
                    label="Species"
                    value={profile.species}
                    options={SPECIES.filter((s) => s !== "other")}
                    onChange={(species) => {
                      updateProfile({ species, ...SPECIES_DEFAULT_SHAPE[species] });
                      updatePet(petId, (p) => ({ pet: { ...p.pet, species } }));
                    }}
                    render={(s) => SPECIES_THEME[s].label}
                  />
                )}
                {settings && (
                  <Chip
                    label="Size"
                    value={profile.sizeClass}
                    options={SIZE_CLASSES}
                    onChange={(sizeClass) => {
                      updateProfile({ sizeClass });
                      updatePet(petId, (p) => ({ pet: { ...p.pet, sizeClass } }));
                    }}
                    render={(s) => `${SIZE_THEME[s].label}, ${SIZE_THEME[s].hint}`}
                  />
                )}
                <Chip label="Coat" value={profile.coatPattern} options={COAT_PATTERNS} onChange={(coatPattern) => updateProfile({ coatPattern })} />
                <Chip label="Ears" value={profile.earShape} options={EAR_SHAPES} onChange={(earShape) => updateProfile({ earShape })} render={(e) => (e === "semi" ? "Folded tips" : cap(e))} />
                <Chip label="Muzzle" value={profile.muzzle} options={MUZZLES} onChange={(muzzle) => updateProfile({ muzzle })} />
                {settings && (
                  <Chip label="Life stage" value={profile.ageGuess} options={AGE_GUESSES} onChange={(ageGuess) => updateProfile({ ageGuess })} render={(a) => (a === "puppy" ? youngLabel(profile.species) : cap(a))} />
                )}
              </div>
            )}
            <p className="text-xs text-muted">Appearance only. Petra does not diagnose from a photo.</p>
          </section>
        )}
      </div>
    </div>
  );
}

function luma(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
