"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BONES, type GaitClip } from "./types";

/** wait: the clip's first frame, no overlay. build: keypoints appear one by one on that frame. live: the clip plays with the full skeleton. */
export type ScanStage = "wait" | "build" | "live";

type Props = {
  src: string;
  poster?: string;
  clip: GaitClip | null;
  stage: ScanStage;
  /** Reduced motion: no stagger, the skeleton is simply there. */
  instant?: boolean;
  /** The first frame is decoded, so the overlay has something to sit on. */
  onReady?: () => void;
  /** While building: how many body points are on screen so far. */
  onBuild?: (points: number) => void;
  /** Every point and bone is drawn. */
  onBuilt?: () => void;
  /** about 20 times a second: seconds into the analysed segment and how many points are tracked in this frame */
  onFrame?: (f: { t: number; points: number }) => void;
  /** change this number to play the segment again */
  replayKey?: number;
  /** fired once when the segment has played to the end */
  onEnd?: () => void;
  /** Overlays drawn above the video (the scan line, a status chip). */
  children?: ReactNode;
};

const ACCENT = "#ffd43b";
/** One new body point every STEP_MS while the skeleton builds. */
export const STEP_MS = 75;

/**
 * Plays a clip and draws the model's pre-computed skeleton on a canvas on top, synced to the video clock.
 * Coordinates are normalised, so any resolution works. Nothing plays until the stage says so.
 */
export function SkeletonPlayer({ src, poster, clip, stage, instant = false, onReady, onBuild, onBuilt, onFrame, replayKey = 0, onEnd, children }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const cb = useRef({ onBuild, onBuilt, onFrame, onEnd });
  useEffect(() => {
    cb.current = { onBuild, onBuilt, onFrame, onEnd };
  });

  // play the analysed segment once, then hold the last frame
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !clip) return;
    if (stage !== "live") {
      v.pause();
      if (Math.abs(v.currentTime - clip.start) > 0.01) v.currentTime = clip.start;
      return;
    }
    const end = clip.start + clip.duration - 0.5 / clip.fps;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      v.pause();
      cb.current.onEnd?.();
    };
    const onTime = () => {
      if (v.currentTime >= end) finish();
    };
    v.currentTime = clip.start;
    void v.play().catch(() => {});
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", finish);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", finish);
    };
  }, [clip, src, stage, replayKey]);

  // draw loop
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let buildStart: number | null = null;
    let shown = -1;
    let built = false;
    const draw = (now: number) => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (v && c) {
        const rect = v.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        if (c.width !== Math.round(rect.width * dpr) || c.height !== Math.round(rect.height * dpr)) {
          c.width = Math.round(rect.width * dpr);
          c.height = Math.round(rect.height * dpr);
        }
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, rect.width, rect.height);
          if (clip && v.videoWidth && stage === "build") {
            buildStart ??= now;
            const total = clip.bodyparts.length;
            const reveal = instant ? total + 4 : (now - buildStart) / STEP_MS;
            drawFrame(ctx, v, clip, rect.width, rect.height, 0, reveal);
            const row = clip.frames[0] ?? [];
            const n = row.slice(0, Math.max(0, Math.min(total, Math.floor(reveal)))).filter(Boolean).length;
            if (n !== shown) {
              shown = n;
              cb.current.onBuild?.(n);
            }
            // A short beat after the last bone lands, then the clip plays.
            if (!built && reveal >= total + 4) {
              built = true;
              cb.current.onBuilt?.();
            }
          } else if (clip && v.videoWidth && stage === "live") {
            const t = v.currentTime - clip.start;
            if (t >= -0.05 && t <= clip.duration + 0.2) drawFrame(ctx, v, clip, rect.width, rect.height, Math.max(0, Math.min(clip.frames.length - 1, Math.floor(t * clip.fps))), Infinity);
          }
        }
        if (clip && stage === "live" && now - last > 50) {
          last = now;
          const t = Math.max(0, Math.min(clip.duration, v.currentTime - clip.start));
          const k = Math.min(clip.frames.length - 1, Math.floor(t * clip.fps));
          const row = clip.frames[k];
          cb.current.onFrame?.({ t, points: row ? row.filter(Boolean).length : 0 });
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [clip, stage, instant]);

  return (
    <div className="relative mx-auto overflow-hidden rounded-card bg-[#E9E6DF] shadow-lift" style={{ aspectRatio: aspect ?? 16 / 9, maxHeight: "62svh" }}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="auto"
        className="absolute inset-0 h-full w-full object-contain"
        muted
        playsInline
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight);
        }}
        onLoadedData={() => onReady?.()}
      />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
      {children}
    </div>
  );
}

/**
 * Draws frame `k`. `reveal` is how many body points are on screen (fractional while building): a point pops in
 * as it arrives and a bone is drawn once both of its ends are there.
 */
function drawFrame(ctx: CanvasRenderingContext2D, v: HTMLVideoElement, clip: GaitClip, boxW: number, boxH: number, k: number, reveal: number) {
  const row = clip.frames[k];
  if (!row) return;

  // area actually covered by the video inside the box (object-contain letterboxing)
  const vr = v.videoWidth / v.videoHeight;
  const br = boxW / boxH;
  const w = br > vr ? boxH * vr : boxW;
  const h = br > vr ? boxH : boxW / vr;
  const ox = (boxW - w) / 2;
  const oy = (boxH - h) / 2;

  const idx = new Map(clip.bodyparts.map((b, i) => [b, i]));
  /** 0 when the point has not arrived yet, rising to 1 over one step as it lands. */
  const age = (name: string) => {
    const i = idx.get(name);
    return i === undefined ? 0 : Math.max(0, Math.min(1, reveal - i));
  };
  const pt = (name: string) => {
    const i = idx.get(name);
    const p = i === undefined ? null : row[i];
    return p ? { x: ox + p[0] * w, y: oy + p[1] * h } : null;
  };
  const lw = Math.max(2, Math.min(w, h) / 160);

  ctx.lineCap = "round";
  for (const [a, b] of BONES) {
    const pa = pt(a);
    const pb = pt(b);
    const alpha = Math.min(age(a), age(b));
    if (!pa || !pb || alpha <= 0) continue;
    // The bone grows from one joint to the other as the second one lands.
    const bx = pa.x + (pb.x - pa.x) * alpha;
    const by = pa.y + (pb.y - pa.y) * alpha;
    const left = b.includes("left");
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = lw + 2;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.strokeStyle = left ? ACCENT : "#ffffff";
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  for (const name of clip.bodyparts) {
    const p = pt(name);
    const a = age(name);
    if (!p || a <= 0) continue;
    // Pop: a little larger as it lands, with a ring that fades.
    if (a < 1) {
      ctx.strokeStyle = `rgba(255,212,59,${(1 - a).toFixed(2)})`;
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.arc(p.x, p.y, lw * (1.4 + a * 3.2), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, lw * (0.9 + (1 - a) * 0.9) + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, lw * (0.9 + (1 - a) * 0.9), 0, Math.PI * 2);
    ctx.fill();
  }
  // the two points the check measures
  for (const name of ["left_earbase", "tail_base"]) {
    const p = pt(name);
    if (!p || age(name) < 1) continue;
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, lw * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}
