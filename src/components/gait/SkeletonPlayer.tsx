"use client";

import { useEffect, useRef, useState } from "react";
import { BONES, type GaitClip } from "./types";

type Props = {
  src: string;
  clip: GaitClip | null;
  /** show the skeleton overlay (off while "processing") */
  showSkeleton: boolean;
  onDuration?: (seconds: number) => void;
  /** about 20 times a second: seconds into the analysed segment and how many points are tracked in this frame */
  onFrame?: (f: { t: number; points: number }) => void;
  /** play the analysed segment (once). While false the video waits on its first frame. */
  playing?: boolean;
  /** change this number to play the segment again */
  replayKey?: number;
  /** fired once when the segment has played to the end */
  onEnd?: () => void;
};

const ACCENT = "#ffd43b";

/**
 * Plays the owner's video and draws the pre-computed skeleton on a canvas on top,
 * synced to the video clock. Coordinates are normalised, so any upload resolution works.
 */
export function SkeletonPlayer({ src, clip, showSkeleton, onDuration, onFrame, playing = true, replayKey = 0, onEnd }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aspect, setAspect] = useState<number | null>(null);

  // play the analysed segment once, then hold the last frame
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !clip) return;
    const end = clip.start + clip.duration - 0.5 / clip.fps;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      v.pause();
      onEnd?.();
    };
    const onTime = () => {
      if (v.currentTime >= end) finish();
    };
    v.currentTime = clip.start;
    if (playing) void v.play().catch(() => {});
    else v.pause();
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", finish);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", finish);
    };
    // onEnd is read when the segment ends; a new callback identity should not restart playback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip, src, playing, replayKey]);

  // draw loop
  useEffect(() => {
    let raf = 0;
    let last = 0;
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
          if (clip && showSkeleton && v.videoWidth) drawFrame(ctx, v, clip, rect.width, rect.height);
        }
        if (clip && onFrame && now - last > 50) {
          last = now;
          const t = Math.min(clip.duration, v.currentTime - clip.start);
          const k = Math.min(clip.frames.length - 1, Math.floor(t * clip.fps));
          const row = clip.frames[k];
          onFrame({ t, points: row ? row.filter(Boolean).length : 0 });
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [clip, showSkeleton, onFrame]);

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-brand bg-dark"
      style={{ aspectRatio: aspect ?? 16 / 9, maxHeight: "70svh" }}
    >
      <video
        ref={videoRef}
        src={src}
        className="absolute inset-0 h-full w-full object-contain"
        autoPlay={!clip}
        muted
        loop={!clip}
        playsInline
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight);
          onDuration?.(v.duration);
        }}
      />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
    </div>
  );
}

function drawFrame(ctx: CanvasRenderingContext2D, v: HTMLVideoElement, clip: GaitClip, boxW: number, boxH: number) {
  const t = v.currentTime - clip.start;
  if (t < -0.05 || t > clip.duration + 0.2) return;
  const k = Math.max(0, Math.min(clip.frames.length - 1, Math.floor(t * clip.fps)));
  const row = clip.frames[k];

  // area actually covered by the video inside the box (object-contain letterboxing)
  const vr = v.videoWidth / v.videoHeight;
  const br = boxW / boxH;
  const w = br > vr ? boxH * vr : boxW;
  const h = br > vr ? boxH : boxW / vr;
  const ox = (boxW - w) / 2;
  const oy = (boxH - h) / 2;

  const idx = new Map(clip.bodyparts.map((b, i) => [b, i]));
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
    if (!pa || !pb) continue;
    const left = b.includes("left");
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = lw + 2;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    ctx.strokeStyle = left ? ACCENT : "#ffffff";
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
  for (const name of clip.bodyparts) {
    const p = pt(name);
    if (!p) continue;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, lw * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // the two points the check measures
  for (const name of ["left_earbase", "tail_base"]) {
    const p = pt(name);
    if (!p) continue;
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, lw * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}
