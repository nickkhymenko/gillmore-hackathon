"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { PrintShape } from "../walk/WalkPath";
import { DogSide } from "./DogSide";
import { ILLO } from "./palette";

const W = 1000;
const H = 260;
const GROUND = 214;
const MAX_PRINTS = 12;

type Print = { id: number; x: number; y: number; r: number };

/**
 * A light park scene for the landing page: the illustrated dog walks across as you scroll, and paw prints
 * follow the cursor or a finger. Inline SVG plus motion. Decorative only (aria-hidden).
 * Reduced motion: a still scene, no following prints.
 */
export function ParkWalk({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const reduce = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], [20, W - 300]);
  const [stride, setStride] = useState(0);
  const [prints, setPrints] = useState<Print[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);
  const seq = useRef(0);

  useMotionValueEvent(x, "change", (v) => {
    if (!reduce) setStride(Math.round(Math.sin(v / 14) * 10));
  });

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (reduce || !svg.current) return;
    const box = svg.current.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const py = ((e.clientY - box.top) / box.height) * H;
    const prev = last.current;
    if (prev && Math.hypot(px - prev.x, py - prev.y) < 34) return;
    const r = prev ? (Math.atan2(py - prev.y, px - prev.x) * 180) / Math.PI + 90 : 90;
    last.current = { x: px, y: py };
    const id = seq.current++;
    setPrints((p) => [...p.slice(-(MAX_PRINTS - 1)), { id, x: px + (id % 2 ? 7 : -7), y: py, r }]);
  }

  return (
    <div ref={ref} className={className} aria-hidden>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-pan-y overflow-hidden rounded-brand"
        onPointerMove={onMove}
        onPointerLeave={() => (last.current = null)}
      >
        <rect width={W} height={H} fill={ILLO.cream} />
        <circle cx="860" cy="64" r="30" fill={ILLO.yellow} />
        <path d={`M0 ${GROUND - 40} Q180 ${GROUND - 90} 380 ${GROUND - 46} T760 ${GROUND - 56} T${W} ${GROUND - 44} V${H} H0 Z`} fill={ILLO.sand} />
        {[
          [130, 1],
          [520, 0.8],
          [700, 1.1],
        ].map(([tx, s]) => (
          <g key={tx} transform={`translate(${tx} ${GROUND - 20}) scale(${s})`}>
            <rect x="-4" y="-60" width="8" height="62" rx="4" fill={ILLO.rust} />
            <circle cx="0" cy="-72" r="30" fill={ILLO.sandstone} />
          </g>
        ))}
        <rect y={GROUND} width={W} height={H - GROUND} fill={ILLO.sandstone} />
        <path d={`M0 ${GROUND + 18} H${W}`} stroke={ILLO.cream} strokeOpacity="0.6" strokeWidth="3" strokeDasharray="14 12" />

        <g className="text-ink" fill="currentColor">
          {(reduce ? STATIC_PRINTS : prints).map((p, i, all) => (
            <g key={p.id} transform={`translate(${p.x} ${p.y}) rotate(${p.r})`} style={{ opacity: reduce ? 0.25 : 0.12 + (0.5 * (i + 1)) / all.length, transition: "opacity 400ms ease-out" }}>
              <PrintShape species="dog" scale={0.9} />
            </g>
          ))}
        </g>

        {reduce ? (
          <DogSide transform={`translate(380 ${GROUND - 130}) scale(0.62)`} />
        ) : (
          <motion.g style={{ x }}>
            <DogSide stride={stride} transform={`translate(0 ${GROUND - 130}) scale(0.62)`} />
          </motion.g>
        )}
      </svg>
    </div>
  );
}

const STATIC_PRINTS: Print[] = [0, 1, 2, 3].map((i) => ({ id: i, x: 180 + i * 46, y: GROUND + 24 + (i % 2 ? 6 : -6), r: 90 }));
