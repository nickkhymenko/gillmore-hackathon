"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import type { Species } from "@/lib/types";

const STEP = 46; // distance between paw prints along the path, in px

/** A single print, drawn around (0,0) with toes pointing up. Species-specific. */
export function PrintShape({ species, scale = 1 }: { species: Species; scale?: number }) {
  if (species === "horse")
    return (
      <path
        transform={`scale(${scale})`}
        d="M-7 6 C-9 -2 -7 -9 0 -9 C7 -9 9 -2 7 6 L4 6 C5.5 0 4.5 -5 0 -5 C-4.5 -5 -5.5 0 -4 6 Z"
      />
    );
  if (species === "rabbit")
    return (
      <g transform={`scale(${scale})`}>
        <ellipse cx="0" cy="2" rx="3.6" ry="8" />
        <circle cx="-3.4" cy="-8" r="1.7" />
        <circle cx="0" cy="-9.4" r="1.7" />
        <circle cx="3.4" cy="-8" r="1.7" />
      </g>
    );
  const cat = species === "cat";
  return (
    <g transform={`scale(${scale * (cat ? 0.8 : 1)})`}>
      <path d="M0 0 C-5 0 -7.5 4 -6.5 6.5 C-5.5 9 -2 8 0 8 C2 8 5.5 9 6.5 6.5 C7.5 4 5 0 0 0 Z" />
      <ellipse cx="-6.8" cy="-3" rx={cat ? 2.3 : 2} ry={cat ? 2.6 : 2.8} transform="rotate(-20 -6.8 -3)" />
      <ellipse cx="-2.4" cy="-6.6" rx={cat ? 2.3 : 2} ry={cat ? 2.6 : 2.9} />
      <ellipse cx="2.4" cy="-6.6" rx={cat ? 2.3 : 2} ry={cat ? 2.6 : 2.9} />
      <ellipse cx="6.8" cy="-3" rx={cat ? 2.3 : 2} ry={cat ? 2.6 : 2.8} transform="rotate(20 6.8 -3)" />
      {!cat && (
        <g stroke="currentColor" strokeWidth="1" strokeLinecap="round">
          <path d="M-7.6 -6.4 l-0.8 -2" />
          <path d="M-2.4 -10 v-2" />
          <path d="M2.4 -10 v-2" />
          <path d="M7.6 -6.4 l0.8 -2" />
        </g>
      )}
    </g>
  );
}

type Geo = { w: number; h: number; d: string; stops: { x: number; y: number }[]; pauseY: number | null };

const PAUSE_PX = 160; // how much scrolling the paw waits at a data-walk-pause moment
type Print = { x: number; y: number; r: number; at: number };

/**
 * The walk: a winding SVG path down the left gutter, drawn as the page scrolls. This pet's paw follows the
 * scroll and stamps species-specific prints behind it, alternating left and right and fading with distance.
 * Stops are the elements inside the container that carry data-stop.
 * Reduced motion: the path is drawn in full, prints are static and there is no moving paw.
 */
export function WalkPath({ containerRef, species, reduce }: { containerRef: RefObject<HTMLDivElement | null>; species: Species; reduce: boolean }) {
  const pathRef = useRef<SVGPathElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [len, setLen] = useState(0);
  const [reached, setReached] = useState(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(180);

  // Geometry: follow the stops, re-measure on resize.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      // Measure the content, not scrollHeight: the SVG itself would otherwise feed back into the height.
      const content = el.querySelector<HTMLElement>("[data-walk-content]");
      const h = content ? content.offsetHeight : el.clientHeight;
      const gutter = w >= 1024 ? 190 : 40;
      const left = gutter * (w >= 1024 ? 0.22 : 0.28);
      const right = gutter * (w >= 1024 ? 0.78 : 0.72);
      const top = el.getBoundingClientRect().top;
      const stops = [...el.querySelectorAll<HTMLElement>("[data-stop]")].map((s, i) => ({
        x: i % 2 ? right : left,
        y: s.getBoundingClientRect().top - top + 10,
      }));
      const pts = [{ x: (left + right) / 2, y: 0 }, ...stops, { x: stops.length % 2 ? right : left, y: h - 4 }];
      let d = `M${pts[0].x},${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const dy = (b.y - a.y) * 0.5;
        d += ` C${a.x},${a.y + dy} ${b.x},${b.y - dy} ${b.x},${b.y}`;
      }
      const pause = el.querySelector<HTMLElement>("[data-walk-pause]");
      const pauseY = pause ? pause.getBoundingClientRect().top - top + pause.offsetHeight / 2 : null;
      setGeo({ w, h, d, stops, pauseY });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const content = el.querySelector("[data-walk-content]");
    if (content) ro.observe(content);
    return () => ro.disconnect();
  }, [containerRef]);

  useEffect(() => {
    if (pathRef.current) setLen(pathRef.current.getTotalLength());
  }, [geo]);

  // Prints along the whole path, alternating sides.
  const prints = useMemo<Print[]>(() => {
    const p = pathRef.current;
    if (!p || !len) return [];
    const out: Print[] = [];
    const side = (geo?.w ?? 0) >= 1024 ? 7 : 5;
    for (let d = STEP, i = 0; d < len; d += STEP, i++) {
      const a = p.getPointAtLength(d);
      const b = p.getPointAtLength(Math.min(len, d + 2));
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const off = i % 2 ? side : -side;
      out.push({ x: a.x - Math.sin(ang) * off, y: a.y + Math.cos(ang) * off, r: (ang * 180) / Math.PI + 90, at: d });
    }
    return out;
  }, [len, geo]);

  // The paw pauses briefly at a data-walk-pause moment: scroll progress maps to path length with a flat step there.
  const pause = useMemo(() => {
    const p = pathRef.current;
    if (!p || !len || !geo || geo.pauseY === null || geo.h <= 0) return null;
    let lo = 0;
    let hi = len;
    for (let k = 0; k < 24; k++) {
      const mid = (lo + hi) / 2;
      if (p.getPointAtLength(mid).y < geo.pauseY) lo = mid;
      else hi = mid;
    }
    const q = Math.min(0.98, Math.max(0.02, geo.pauseY / geo.h));
    return { at: lo, q, hold: Math.min(0.5 * (1 - q), PAUSE_PX / geo.h) };
  }, [len, geo]);
  const lengthAt = (p: number) => {
    if (!pause) return p * len;
    const { at, q, hold } = pause;
    if (p <= q) return (p / q) * at;
    if (p <= q + hold) return at;
    return at + ((p - q - hold) / (1 - q - hold)) * (len - at);
  };

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start 62%", "end 62%"] });
  const drawn = useTransform(scrollYProgress, (p) => (reduce ? 1 : p));

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const path = pathRef.current;
    if (!path || !len || reduce) return;
    const at = Math.max(0, Math.min(len, lengthAt(p)));
    const a = path.getPointAtLength(at);
    const b = path.getPointAtLength(Math.min(len, at + 2));
    x.set(a.x);
    y.set(a.y);
    rotate.set((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90);
    const idx = Math.floor(at / STEP);
    setReached((r) => (r === idx ? r : idx));
  });

  if (!geo) return null;
  const big = geo.w >= 1024;

  return (
    <svg className="pointer-events-none absolute inset-0 -z-0 overflow-visible" width={geo.w} height={geo.h} aria-hidden>
      <path d={geo.d} fill="none" stroke="var(--ink)" strokeOpacity={0.12} strokeWidth={1} />
      <motion.path ref={pathRef} d={geo.d} fill="none" stroke="var(--ink)" strokeOpacity={0.45} strokeWidth={1.5} strokeLinecap="round" style={{ pathLength: drawn }} />
      <g className="text-ink" fill="currentColor">
        {prints.map((pr, i) => {
          const behind = reached - i;
          const visible = reduce || behind >= 0;
          const opacity = reduce ? 0.16 : visible ? Math.max(0.12, 0.55 - behind * 0.035) : 0;
          return (
            <g key={i} transform={`translate(${pr.x} ${pr.y}) rotate(${pr.r})`} style={{ opacity, transition: "opacity 400ms ease-out" }}>
              <PrintShape species={species} scale={big ? 0.7 : 0.5} />
            </g>
          );
        })}
      </g>
      {geo.stops.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y})`}>
          <circle r={big ? 15 : 11} fill="var(--bg)" stroke="var(--ink)" strokeWidth={1.5} />
          <text textAnchor="middle" dominantBaseline="central" fontSize={big ? 11 : 9} fontWeight={600} fill="var(--ink)" className="tnum">
            {String(i + 1).padStart(2, "0")}
          </text>
        </g>
      ))}
      {!reduce && (
        <motion.g style={{ x, y }}>
          <circle r={big ? 20 : 14} fill="var(--accent)" stroke="var(--ink)" strokeWidth={1.5} />
          <motion.g style={{ rotate }} className="text-ink" fill="currentColor">
            <PrintShape species={species} scale={big ? 1.05 : 0.75} />
          </motion.g>
        </motion.g>
      )}
    </svg>
  );
}

/** Very subtle light that changes along the walk: morning at the top, park green mid-page, warm evening at the end. */
export function WalkBackdrop({ reduce }: { reduce: boolean }) {
  const { scrollYProgress } = useScroll();
  const morning = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const park = useTransform(scrollYProgress, [0.2, 0.5, 0.8], [0, 1, 0]);
  const evening = useTransform(scrollYProgress, [0.65, 1], [0, 1]);
  if (reduce) return null;
  const layer = "pointer-events-none fixed inset-0 -z-10";
  return (
    <>
      <motion.div aria-hidden className={layer} style={{ opacity: morning, background: "linear-gradient(180deg, color-mix(in oklab, var(--bg) 80%, #FFE6AD) 0%, var(--bg) 70%)" }} />
      <motion.div aria-hidden className={layer} style={{ opacity: park, background: "color-mix(in oklab, var(--bg) 86%, #C9DFBC)" }} />
      <motion.div aria-hidden className={layer} style={{ opacity: evening, background: "linear-gradient(0deg, color-mix(in oklab, var(--bg) 78%, #F1C3A1) 0%, color-mix(in oklab, var(--bg) 92%, #F1C3A1) 60%)" }} />
    </>
  );
}

/** Sticky mini progress bar: a paw print per stop, filled once reached; stop name on hover and focus. */
export function WalkProgress({ stops, species }: { stops: { id: string; label: string }[]; species: Species }) {
  const [current, setCurrent] = useState(-1);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.62;
      let c = -1;
      stops.forEach((s, i) => {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top < line) c = i;
      });
      setCurrent(c);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [stops]);

  return (
    <nav aria-label="Walk progress" className="sticky top-[68px] z-30 -mx-4 border-b border-line bg-paper/85 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6">
      <ol className="flex items-center justify-between gap-1">
        {stops.map((s, i) => (
          <li key={s.id} className="group relative">
            <a
              href={`#${s.id}`}
              aria-current={i === current ? "step" : undefined}
              className={`grid h-9 w-9 place-items-center rounded-full transition-colors duration-300 ${i === current ? "bg-accent" : "hover:bg-ink/5"}`}
            >
              <svg width="18" height="18" viewBox="-12 -12 24 24" aria-hidden className="text-ink" fill="currentColor" style={{ opacity: i <= current ? 1 : 0.28, transition: "opacity 300ms" }}>
                <PrintShape species={species} scale={0.9} />
              </svg>
              <span className="sr-only">{s.label}</span>
            </a>
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-ink px-2 py-1 text-xs text-white group-focus-within:block group-hover:block">
              {s.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
