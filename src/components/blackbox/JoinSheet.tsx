"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { PetAvatar } from "../PetAvatar";
import { Sheet } from "../Sheet";
import { maxSaving } from "@/data/premiums";
import { joinPremium } from "@/lib/premium";
import type { PetRecord } from "@/lib/store";

const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

/** A tick that draws itself inside a ring that springs in, with a few sparks. The whole thing is one SVG. */
function SuccessMark({ reduce }: { reduce: boolean }) {
  const sparks = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 120 120" className="mx-auto h-28 w-28 overflow-visible" aria-hidden data-testid="join-success">
      {!reduce &&
        sparks.map((deg, i) => (
          <g key={deg} transform={`rotate(${deg} 60 60)`}>
            <motion.line x1="60" y1="4" x2="60" y2="12" stroke="#141414" strokeWidth="3" strokeLinecap="round" initial={{ opacity: 0, y: 12 }} animate={{ opacity: [0, 1, 0], y: [12, 0, -6] }} transition={{ duration: 0.7, delay: 0.25 + i * 0.02, ease: "easeOut" }} />
          </g>
        ))}
      <motion.circle cx="60" cy="60" r="40" fill="var(--accent)" initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} style={{ transformOrigin: "60px 60px" }} />
      <motion.path
        d="M42 61 L55 74 L80 47"
        fill="none"
        stroke="#141414"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
      />
    </svg>
  );
}

/**
 * The one-step sign-up. A sheet with the pet's avatar, one summary line and "Join Petra Premium"; confirming plays
 * the success mark, then "Welcome to Petra Premium" and the way to the dashboard. The membership is kept in this
 * browser (src/lib/premium.ts); "Reset demo" and "Delete all my data" clear it.
 */
export function JoinSheet({ rec, open, onClose }: { rec: PetRecord; open: boolean; onClose: () => void }) {
  const reduce = Boolean(useReducedMotion());
  const [done, setDone] = useState(false);
  const name = rec.pet.name;
  const close = () => {
    onClose();
    setDone(false);
  };
  return (
    <Sheet open={open} onClose={close} title={done ? "Welcome to Petra Premium" : "Join Petra Premium"} hideTitle>
      {done ? (
        <div className="space-y-5 pb-2 text-center" role="status">
          <SuccessMark reduce={reduce} />
          <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 220, damping: 24, delay: reduce ? 0 : 0.45 }} className="space-y-5">
            <h2 className="display text-[clamp(2rem,6vw,2.75rem)]">
              Welcome to <span className="accent-word">Petra Premium.</span>
            </h2>
            <p className="text-lg text-muted">{name} is covered for every walk.</p>
            <Link href="/dashboard" onClick={close} className="btn btn-primary min-h-14 w-full text-lg">
              Go to your dashboard <ArrowUpRight size={20} weight="bold" aria-hidden />
            </Link>
          </motion.div>
        </div>
      ) : (
        <div className="space-y-6 pb-2 text-center">
          <div className="mx-auto w-fit rounded-full bg-accent-soft p-2">
            <PetAvatar traits={rec.profile} size={104} title={`${name}'s avatar`} />
          </div>
          <div className="space-y-2">
            <h2 className="display text-[clamp(2rem,6vw,2.75rem)]">
              Petra Premium <span className="accent-word">for {name}.</span>
            </h2>
            <p className="text-lg text-muted" data-testid="join-summary">
              Walk Companion · up to {gbp(maxSaving(rec.pet))} a year off · cancel anytime
            </p>
          </div>
          <button
            type="button"
            autoFocus
            onClick={() => {
              joinPremium({ petId: rec.id, petName: name });
              setDone(true);
            }}
            className="btn btn-primary min-h-14 w-full text-lg"
          >
            Join Petra Premium
          </button>
          <p className="text-xs text-muted">A demo sign-up: nothing is charged and no details are taken. Illustrative saving at the top tier.</p>
        </div>
      )}
    </Sheet>
  );
}
