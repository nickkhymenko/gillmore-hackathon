"use client";

/**
 * Video provider adapter. OWNED BY THE ML SIDE after the V0 seam (docs/13): the UI side does not edit this file.
 *
 * Selection by NEXT_PUBLIC_VIDEO_MODE:
 *  - "mock" (default): demo analysis on the device. Nothing is uploaded.
 *  - "server": clips go to POST /api/scan, which forwards to ML_API_URL/analyze and falls back to mock.
 *  - "browser": the model runs client-side (to be implemented by the ML side: startLive + analyzeClip).
 *
 * Every analyzeClip result must parse with ClipResultSchema (src/lib/video/contract.ts).
 */
import { ScanResponseSchema, type ClipMeta, type LiveFrameResult, type ScanResponse } from "./contract";
import { mockClipResult, mockLiveFrame } from "./mock";

export type VideoMode = "server" | "browser" | "mock";

export interface VideoProvider {
  mode: VideoMode;
  /** Analyse a recorded or uploaded clip. Always resolves; on failure returns the mock with source "mock". */
  analyzeClip(blob: Blob, meta: ClipMeta): Promise<ScanResponse>;
  /** Optional real-time analysis of the camera feed. Returns a stop function. */
  startLive?(video: HTMLVideoElement, onFrame: (r: LiveFrameResult) => void, meta: ClipMeta): () => void;
}

/** Demo provider: analysis on the device, a gentle fake overlay for live mode. */
export const mockProvider: VideoProvider = {
  mode: "mock",
  async analyzeClip(blob, meta) {
    await new Promise((r) => setTimeout(r, 1200)); // feels like analysis, keeps the UI honest about waiting
    return { ...mockClipResult(meta, blob.size), source: "mock", fallbackReason: "Demo analysis (model not switched on)" };
  },
  startLive(_video, onFrame, meta) {
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 100) {
        last = t;
        onFrame(mockLiveFrame(t, meta.species));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  },
};

/** Server provider: POST /api/scan (multipart). The route forwards to the model and falls back to mock. */
export const serverProvider: VideoProvider = {
  mode: "server",
  async analyzeClip(blob, meta) {
    const form = new FormData();
    form.append("video", blob, blob.type.includes("mp4") ? "clip.mp4" : "clip.webm");
    form.append("petId", meta.petId);
    form.append("species", meta.species);
    form.append("scanType", meta.scanType);
    try {
      const res = await fetch("/api/scan", { method: "POST", body: form, signal: AbortSignal.timeout(25_000) });
      const parsed = ScanResponseSchema.safeParse(await res.json());
      if (res.ok && parsed.success) return parsed.data;
      return { ...mockClipResult(meta, blob.size), source: "mock", fallbackReason: `Scan service returned ${res.status}` };
    } catch {
      return { ...mockClipResult(meta, blob.size), source: "mock", fallbackReason: "Scan service unreachable" };
    }
  },
};

export function getVideoProvider(): VideoProvider {
  const mode = (process.env.NEXT_PUBLIC_VIDEO_MODE ?? "mock") as VideoMode;
  if (mode === "server") return serverProvider;
  // "browser" is implemented by the ML side; until then it behaves like mock.
  return mockProvider;
}
