"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { PetAvatar, type AvatarTraits } from "../PetAvatar";
import { SOURCES, type SourceId } from "@/data/evidence";
import { openSources } from "../SourcesLink";

const ORDER = Object.keys(SOURCES) as SourceId[];

/** Superscript footnote: opens the Sources sheet (the one "Sources" link in the footer). */
export function Cite({ ids }: { ids: SourceId[] }) {
  if (!ids.length) return null;
  return (
    <sup className="ml-0.5 text-[0.65em] font-semibold">
      {ids.map((id, i) => (
        <button key={id} type="button" onClick={openSources} className="link px-px" aria-label={`Source ${ORDER.indexOf(id) + 1}`}>
          {ORDER.indexOf(id) + 1}
          {i < ids.length - 1 ? "," : ""}
        </button>
      ))}
    </sup>
  );
}

/**
 * One stop on the walk. It fades and rises in when the paw reaches it, and the pet's avatar
 * "sits" beside the stop label with a small hop.
 */
export function Stop({ id, n, label, traits, children }: { id: string; n: number; label: string; traits: AvatarTraits; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <section id={id} aria-labelledby={`${id}-label`} className="scroll-mt-32 py-16 sm:py-24">
      <div data-stop className="flex items-center gap-3">
        <h2 id={`${id}-label`} className="eyebrow">
          <span className="tnum text-ink">{String(n).padStart(2, "0")}</span> / {label}
        </h2>
        <motion.span
          data-reveal
          initial={reduce ? false : { opacity: 0, x: -14, y: -6 }}
          whileInView={{ opacity: 1, x: 0, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -38% 0px" }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
          aria-hidden
        >
          <PetAvatar traits={traits} size={30} animated={false} title="" />
        </motion.span>
      </div>
      <motion.div
        data-reveal
        className="mt-6"
        initial={reduce ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -30% 0px" }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </section>
  );
}
