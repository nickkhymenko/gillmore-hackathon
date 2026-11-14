import { z } from "zod";

/**
 * FROZEN CONTRACT between the app and the ML video model (docs/06-PS1-PLAN.md section 7, docs/13).
 * Changes only by agreement in the team chat. Both the UI and the ML service must parse with these schemas.
 *
 * Any metric the model does not measure must be null, never invented.
 * Results are "signs worth a vet's look", never a diagnosis.
 */

export const SCAN_TYPES = ["walk", "sleep_breathing", "face", "general"] as const;
export type ScanType = (typeof SCAN_TYPES)[number];

/** One frame of a live analysis, for drawing an overlay on the camera feed. Coordinates are 0..1 of the frame. */
export const LiveFrameResultSchema = z.object({
  t: z.number(),
  keypoints: z.array(z.object({ x: z.number(), y: z.number(), name: z.string(), score: z.number().min(0).max(1) })).optional(),
  label: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type LiveFrameResult = z.infer<typeof LiveFrameResultSchema>;

export const MetricsSchema = z.object({
  mobilityScore: z.number().min(0).max(100).nullable(), // 0 to 100
  gaitAsymmetry: z.number().min(0).max(1).nullable(), // 0 to 1
  breathingRatePerMin: z.number().min(0).max(300).nullable(),
  activityLevel: z.number().min(0).max(1).nullable(), // 0 to 1
  bodyConditionScore: z.number().min(1).max(9).nullable(), // 1 to 9
});
export type Metrics = z.infer<typeof MetricsSchema>;

export const FlagSchema = z.object({
  code: z.string(),
  label: z.string(),
  severity: z.enum(["green", "amber", "red"]),
  confidence: z.number().min(0).max(1),
});
export type Flag = z.infer<typeof FlagSchema>;

/** The clip result returned by `${ML_API_URL}/analyze` and by every VideoProvider. */
export const ClipResultSchema = z.object({
  scanId: z.string(),
  petId: z.string(),
  timestamp: z.string(),
  scanType: z.enum(SCAN_TYPES),
  metrics: MetricsSchema,
  flags: z.array(FlagSchema),
  quality: z.object({ ok: z.boolean(), issue: z.string().nullable() }),
  modelVersion: z.string(),
});
export type ClipResult = z.infer<typeof ClipResultSchema>;

/** What `/api/scan` returns: the clip result plus where it came from. */
export const ScanResponseSchema = ClipResultSchema.extend({
  source: z.enum(["ml", "mock"]),
  /** Why the mock was used instead of the model (no ML_API_URL, timeout, bad response). */
  fallbackReason: z.string().optional(),
});
export type ScanResponse = z.infer<typeof ScanResponseSchema>;

/** Metadata sent with a clip (multipart fields on POST /api/scan and POST {ML_API_URL}/analyze). */
export type ClipMeta = { petId: string; species: string; scanType: ScanType };

/** Size and length limits shared by the UI and the API. */
export const MAX_CLIP_SECONDS = 30;
export const MAX_CLIP_BYTES = 4_000_000; // stays under hosting body limits
