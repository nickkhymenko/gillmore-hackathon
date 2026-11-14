import { ClipResultSchema, MAX_CLIP_BYTES, SCAN_TYPES, type ClipMeta, type ScanResponse, type ScanType } from "@/lib/video/contract";
import { mockClipResult } from "@/lib/video/mock";

/**
 * POST /api/scan (multipart: video, petId, species, scanType)
 * Forwards the clip to `${ML_API_URL}/analyze` with a 20 s timeout. On any error, or when ML_API_URL is not set,
 * returns the demo analysis instead. Response: the clip result plus `source: "ml" | "mock"`.
 * The video is passed straight through and never stored.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Send multipart form data with a video" }, { status: 400 });
  }
  const video = form.get("video");
  if (!(video instanceof Blob) || video.size === 0) return Response.json({ error: "Missing video" }, { status: 422 });
  if (video.size > MAX_CLIP_BYTES) return Response.json({ error: `Video too large (max ${MAX_CLIP_BYTES / 1_000_000} MB)` }, { status: 413 });
  const scanType = String(form.get("scanType") ?? "general") as ScanType;
  const meta: ClipMeta = {
    petId: String(form.get("petId") ?? "unknown").slice(0, 80),
    species: String(form.get("species") ?? "dog").slice(0, 20),
    scanType: SCAN_TYPES.includes(scanType) ? scanType : "general",
  };

  const url = process.env.ML_API_URL;
  if (!url) return Response.json({ ...mockClipResult(meta, video.size), source: "mock", fallbackReason: "Model not switched on" } satisfies ScanResponse);

  try {
    const out = new FormData();
    out.append("video", video, (video as File).name || "clip.webm");
    out.append("petId", meta.petId);
    out.append("species", meta.species);
    out.append("scanType", meta.scanType);
    const res = await fetch(`${url.replace(/\/$/, "")}/analyze`, { method: "POST", body: out, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`model returned ${res.status}`);
    const parsed = ClipResultSchema.safeParse(await res.json());
    if (!parsed.success) throw new Error("model response did not match the contract");
    return Response.json({ ...parsed.data, source: "ml" } satisfies ScanResponse);
  } catch (err) {
    console.error("[scan] model failed, using demo analysis:", err);
    const reason = err instanceof Error && err.name === "TimeoutError" ? "Model timed out" : "Model unavailable";
    return Response.json({ ...mockClipResult(meta, video.size), source: "mock", fallbackReason: reason } satisfies ScanResponse);
  }
}
