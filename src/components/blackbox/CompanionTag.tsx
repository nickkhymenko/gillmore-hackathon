"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * The Petra Walk Companion, as a clean light product render: a small white tag on a soft fabric loop, floating
 * gently over its own shadow. Flat fills only, no gradients. Decorative illustration.
 */
export function CompanionTag({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const float = reduce ? undefined : { y: [0, -10, 0] };
  const shadow = reduce ? undefined : { scaleX: [1, 0.86, 1], opacity: [0.1, 0.06, 0.1] };
  const loop = { duration: 5.5, repeat: Infinity, ease: "easeInOut" as const };
  return (
    <svg viewBox="0 0 360 360" className={className} role="img" aria-label="The Petra Walk Companion, a small white tag that clips to a collar">
      {/* soft, flat backdrop */}
      <circle cx="180" cy="176" r="150" fill="#FFFFFF" fillOpacity="0.7" />
      {/* contact shadow */}
      <motion.ellipse cx="180" cy="318" rx="74" ry="9" fill="#141414" opacity="0.1" animate={shadow} transition={loop} style={{ transformOrigin: "180px 318px" }} />
      <motion.g animate={float} transition={loop}>
        {/* collar loop */}
        <path d="M24 96 Q180 150 336 96 L336 124 Q180 178 24 124 Z" fill="#E7E2D8" />
        <path d="M24 103 Q180 157 336 103" fill="none" stroke="#141414" strokeOpacity="0.12" strokeWidth="1.5" strokeDasharray="3 7" strokeLinecap="round" />
        <path d="M24 117 Q180 171 336 117" fill="none" stroke="#141414" strokeOpacity="0.12" strokeWidth="1.5" strokeDasharray="3 7" strokeLinecap="round" />
        {/* clip */}
        <rect x="157" y="122" width="46" height="34" rx="11" fill="#D9D4C9" />
        <rect x="165" y="130" width="30" height="18" rx="7" fill="var(--accent-soft)" />
        {/* body: an outer shell, a lit top edge and the face */}
        <rect x="112" y="146" width="136" height="152" rx="46" fill="#DEDAD1" />
        <rect x="112" y="142" width="136" height="152" rx="46" fill="#FFFFFF" />
        <rect x="124" y="154" width="112" height="128" rx="36" fill="#F7F5F0" />
        {/* highlight */}
        <path d="M134 178 Q140 162 160 160" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
        {/* paw mark */}
        <g transform="translate(180 216) scale(2.2)" fill="#141414">
          <path d="M0 0 C-5 0 -7.5 4 -6.5 6.5 C-5.5 9 -2 8 0 8 C2 8 5.5 9 6.5 6.5 C7.5 4 5 0 0 0 Z" />
          <ellipse cx="-6.8" cy="-3" rx="2" ry="2.8" transform="rotate(-20 -6.8 -3)" />
          <ellipse cx="-2.4" cy="-6.6" rx="2" ry="2.9" />
          <ellipse cx="2.4" cy="-6.6" rx="2" ry="2.9" />
          <ellipse cx="6.8" cy="-3" rx="2" ry="2.8" transform="rotate(20 6.8 -3)" />
        </g>
        {/* status light */}
        <circle cx="180" cy="264" r="9" fill="var(--accent)" opacity="0.4" />
        <motion.circle cx="180" cy="264" r="4.5" fill="var(--accent)" stroke="#141414" strokeOpacity="0.25" strokeWidth="1" animate={reduce ? undefined : { opacity: [1, 0.45, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
      </motion.g>
    </svg>
  );
}
