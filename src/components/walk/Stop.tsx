"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { PetAvatar, type AvatarTraits } from "../PetAvatar";
import { SOURCES, type SourceId } from "@/data/evidence";

const ORDER = Object.keys(SOURCES) as SourceId[];

/** Superscript footnote link to the sources list at the end of the walk. */
export function Cite({ ids }: { ids: SourceId[] }) {
  if (!ids.length) return null;
  return (
    <sup className="ml-0.5 text-[0.65em] font-semibold">
      {ids.map((id, i) => (
        <a key={id} href={`#src-${id}`} className="link px-px" aria-label={`Source ${ORDER.indexOf(id) + 1}`}>
          {ORDER.indexOf(id) + 1}
          {i < ids.length - 1 ? "," : ""}
        </a>
      ))}
    </sup>
  );
}

export function Footnotes() {
  return (
    <section id="sources" className="scroll-mt-32 border-t border-line pt-6">
      <h2 className="eyebrow">Sources</h2>
      <ol className="mt-3 space-y-2 text-xs text-muted">
        {ORDER.map((id, i) => (
          <li key={id} id={`src-${id}`} className="flex gap-2 scroll-mt-32">
            <span className="tnum w-5 shrink-0 font-semibold text-ink">{i + 1}</span>
            <span>{SOURCES[id]}</span>
          </li>
        ))}
      </ol>
    </section>
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
