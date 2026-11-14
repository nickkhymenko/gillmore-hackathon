"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowUpRight, PawPrint } from "@phosphor-icons/react";
import { PetAvatar } from "../PetAvatar";
import { PhotoTwin } from "../PhotoTwin";
import { ActivityStep, AgeStep, BreedStep, ConsentStep, NameStep, NeuteredStep, Primary, Question, SpeciesStep, WeightStep } from "./steps";
import { addPet, getPet, updatePet, type PetRecord } from "@/lib/store";
import { useHousehold } from "@/lib/usePets";

const STEPS = ["Name", "Photo", "Species", "Breed", "Age", "Weight", "Neutered", "Activity", "Consent"] as const;

type Flow = { petId: string | null; step: number; dir: 1 | -1; fresh: boolean };

/** Paw prints that fill in as the owner moves through the questions. */
function PawProgress({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-0.5 sm:gap-2" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
      {STEPS.map((label, i) => (
        <li key={label} title={label} className={`grid h-6 w-6 place-items-center rounded-full sm:h-7 sm:w-7 transition-colors duration-500 ${i === step ? "bg-accent" : ""}`}>
          <PawPrint size={16} weight={i <= step ? "fill" : "regular"} className={`transition-opacity duration-500 ${i <= step ? "opacity-100" : "opacity-30"}`} style={{ transform: `rotate(${i % 2 ? 14 : -14}deg)` }} aria-hidden />
        </li>
      ))}
    </ol>
  );
}

/** Full-screen exit: a paw trots across and stamps prints, then we go to the walk. */
function WalkOff({ onDone }: { onDone: () => void }) {
  return (
    <motion.div className="fixed inset-0 z-[70] overflow-hidden bg-paper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} aria-hidden>
      {Array.from({ length: 7 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ left: `${8 + i * 13}%`, top: `calc(50% + ${i % 2 ? 18 : -18}px)` }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.5, 0.15], scale: 1 }}
          transition={{ delay: 0.25 + i * 0.12, duration: 0.6 }}
        >
          <PawPrint size={28} weight="fill" style={{ transform: "rotate(90deg)" }} />
        </motion.span>
      ))}
      <motion.span
        className="absolute top-1/2 -translate-y-1/2"
        initial={{ left: "-10%" }}
        animate={{ left: "110%" }}
        transition={{ delay: 0.15, duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
        onAnimationComplete={onDone}
      >
        <span className="grid h-16 w-16 place-items-center rounded-full bg-accent">
          <PawPrint size={34} weight="fill" style={{ transform: "rotate(90deg)" }} />
        </span>
      </motion.span>
    </motion.div>
  );
}

/**
 * First-run onboarding. One question per screen, slide transitions, paw progress.
 * Name, photo (Pet Twin), species, breed, age, weight, neutered, activity, consent; then the walk.
 * `startNew` begins a new pet straight away (the "Add another pet" route).
 */
export function Onboarding({ startNew = false }: { startNew?: boolean }) {
  const { household, ready } = useHousehold();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [flow, setFlow] = useState<Flow | null>(startNew ? { petId: null, step: 0, dir: 1, fresh: true } : null);
  const [leaving, setLeaving] = useState(false);

  const active = household.pets.find((p) => p.id === household.activeId) ?? household.pets[0] ?? null;
  const rec: PetRecord | null = flow?.petId ? (household.pets.find((p) => p.id === flow.petId) ?? null) : null;

  function go(step: number, petId = flow?.petId ?? null) {
    const dir: 1 | -1 = step >= (flow?.step ?? 0) ? 1 : -1;
    const before = petId ? getPet(petId) : null;
    // A step is "fresh" until the owner has moved past it once: then we prefill guesses instead of old answers.
    const fresh = !before || before.setupStep === null ? !before : step >= before.setupStep;
    if (petId) updatePet(petId, (p) => ({ setupStep: p.setupStep === null ? null : Math.max(p.setupStep, step) }));
    setFlow({ petId, step, dir, fresh });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }
  const next = () => flow && go(flow.step + 1);
  const back = () => {
    if (!flow) return;
    if (flow.step === 0) {
      if (startNew) router.back();
      else setFlow(null);
    } else go(flow.step - 1);
  };

  // ---------- before the flow starts ----------

  if (!flow) {
    if (ready && active && active.setupStep !== null) {
      return (
        <Landing
          eyebrow="Welcome back"
          title={
            <>
              Let&apos;s finish <span className="accent-word">{active.pet.name}&apos;s</span> twin.
            </>
          }
          sub={`You stopped at ${STEPS[Math.min(active.setupStep, STEPS.length - 1)].toLowerCase()}. Everything so far is saved on this device.`}
          cta="Carry on"
          onStart={() => go(Math.min(active.setupStep ?? 0, STEPS.length - 1), active.id)}
          avatar={active}
        />
      );
    }
    if (ready && active) {
      return (
        <Landing
          eyebrow="Welcome back"
          title={
            <>
              {active.pet.name}&apos;s walk is <span className="accent-word">ready.</span>
            </>
          }
          sub="A minute a week. Catch the small changes before they turn into big bills."
          cta={`Continue to ${active.pet.name}'s walk`}
          onStart={() => router.push("/walk")}
          avatar={active}
          secondary={
            <Link href="/add" className="link min-h-11 py-2">
              Add another pet
            </Link>
          }
        />
      );
    }
    return (
      <Landing
        eyebrow="Prevently / Pet health, early"
        title={
          <>
            Catch the <span className="accent-word">question</span> before it becomes a claim.
          </>
        }
        sub="Most pet insurance claims start as a question an owner had days or weeks earlier. Prevently answers it early, inside your insurer's app."
        cta="Meet your Pet Twin"
        onStart={() => go(0, null)}
        note="About a minute. One question at a time."
      />
    );
  }

  // ---------- the flow ----------

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 48 }),
    centre: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -48 }),
  };

  let content: React.ReactNode = null;
  if (flow.step === 0) {
    content = (
      <NameStep
        initial={rec?.pet.name ?? ""}
        onSubmit={(name) => {
          if (rec) {
            updatePet(rec.id, (p) => ({ pet: { ...p.pet, name } }));
            go(1, rec.id);
          } else {
            const created = addPet(name);
            go(1, created.id);
          }
        }}
      />
    );
  } else if (rec) {
    const props = { rec, fresh: flow.fresh, next };
    content =
      flow.step === 1 ? (
        <div className="space-y-8">
          <Question eyebrow="Pet Twin" sub="One photo and the whole app takes on their colours. Optional, and it never leaves this device except to be read once.">
            {rec.photo ? (
              <>
                Meet {rec.pet.name}&apos;s <span className="accent-word">twin.</span>
              </>
            ) : (
              <>Add a photo of {rec.pet.name}.</>
            )}
          </Question>
          <PhotoTwin petId={rec.id} mode="onboarding" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6">
            {rec.photo && <Primary onClick={next}>Looks right, continue</Primary>}
            <button type="button" onClick={next} className={rec.photo ? "link min-h-11 text-muted" : "btn btn-ghost text-lg"}>
              {rec.photo ? "Continue" : "Skip, I'll add one later"}
            </button>
          </div>
        </div>
      ) : flow.step === 2 ? (
        <SpeciesStep {...props} />
      ) : flow.step === 3 ? (
        <BreedStep {...props} />
      ) : flow.step === 4 ? (
        <AgeStep {...props} />
      ) : flow.step === 5 ? (
        <WeightStep {...props} />
      ) : flow.step === 6 ? (
        <NeuteredStep {...props} />
      ) : flow.step === 7 ? (
        <ActivityStep {...props} />
      ) : (
        <ConsentStep
          rec={rec}
          onFinish={(consent) => {
            updatePet(rec.id, { consent, setupStep: null });
            if (reduce) router.push("/walk");
            else setLeaving(true);
          }}
        />
      );
  } else if (ready) {
    // The pet was removed (or data deleted) mid-flow.
    content = (
      <div className="space-y-6">
        <Question eyebrow="Start again">That pet is no longer here.</Question>
        <Primary onClick={() => setFlow({ petId: null, step: 0, dir: -1, fresh: true })}>Start again</Primary>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100svh-9rem)] flex-col py-2 sm:py-6">
      <div className="mb-8 flex items-center justify-between gap-4 sm:mb-14">
        <button type="button" onClick={back} className="link inline-flex min-h-11 items-center gap-1.5 text-sm">
          <ArrowLeft size={15} aria-hidden /> Back
        </button>
        <PawProgress step={flow.step} />
      </div>
      <AnimatePresence mode="wait" custom={flow.dir} initial={false}>
        <motion.div key={flow.step} custom={flow.dir} variants={variants} initial="enter" animate="centre" exit="exit" transition={{ duration: reduce ? 0.12 : 0.36, ease: [0.22, 1, 0.36, 1] }} className="flex-1">
          {content}
        </motion.div>
      </AnimatePresence>
      {leaving && <WalkOff onDone={() => router.push("/walk")} />}
    </div>
  );
}

function Landing({
  eyebrow,
  title,
  sub,
  cta,
  onStart,
  note,
  avatar,
  secondary,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub: string;
  cta: string;
  onStart: () => void;
  note?: string;
  avatar?: PetRecord;
  secondary?: React.ReactNode;
}) {
  return (
    <section className="grid min-h-[calc(100svh-9rem)] items-center gap-10 py-8 lg:grid-cols-12">
      <div className="lg:col-span-9">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-4 text-[clamp(3rem,8vw,7.5rem)]">{title}</h1>
        <p className="mt-6 max-w-[48ch] text-lg text-muted sm:text-xl">{sub}</p>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <button type="button" onClick={onStart} className="btn btn-primary text-lg">
            {cta} <ArrowUpRight size={18} weight="bold" aria-hidden />
          </button>
          {secondary}
          {note && <span className="text-sm text-muted">{note}</span>}
        </div>
      </div>
      {avatar && (
        <div className="hidden justify-center lg:col-span-3 lg:flex">
          <PetAvatar traits={avatar.profile} size={220} title={`${avatar.pet.name}'s avatar`} />
        </div>
      )}
    </section>
  );
}
