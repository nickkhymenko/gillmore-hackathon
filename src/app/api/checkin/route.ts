import { CheckinInputSchema, DISCLAIMER, type CheckinResult } from "@/lib/types";
import { computeTrend, creditsFor, maxStatus, runSafetyRules } from "@/lib/safety";
import { rulesAssessment } from "@/lib/ai/rules";
import { aiEnabled, geminiAssessment } from "@/lib/ai/gemini";

/**
 * POST /api/checkin
 * Body: CheckinInput (see src/lib/types.ts)
 * Pipeline: validate -> safety rules -> AI (Gemini, multimodal) -> safety floor -> trend vs own baseline -> credits
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const parsed = CheckinInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid check-in", issues: parsed.error.flatten() }, { status: 422 });
  }
  const input = parsed.data;

  const safety = runSafetyRules(input);
  const fallback = rulesAssessment(input, safety);
  const preTrend = computeTrend(input.history, fallback.healthScore);

  let assessment = fallback;
  let source: CheckinResult["source"] = "rules";
  if (aiEnabled()) {
    try {
      assessment = await geminiAssessment(input, safety, preTrend.note);
      source = "gemini";
    } catch (err) {
      console.error("[checkin] AI failed, using rules fallback:", err);
    }
  }

  // Safety floor: the AI may escalate, never downgrade.
  const finalStatus = maxStatus(assessment.status, safety.minimumStatus);
  const safetyOverride = finalStatus !== assessment.status;
  if (safetyOverride) {
    assessment = {
      ...assessment,
      status: finalStatus,
      nextStep: fallback.nextStep,
      headline: fallback.headline,
    };
  }

  const trend = computeTrend(input.history, assessment.healthScore);

  const result: CheckinResult = {
    ...assessment,
    source,
    safetyOverride,
    safetyReasons: safety.reasons,
    trend,
    creditsEarned: creditsFor(input),
    disclaimer: DISCLAIMER,
    createdAt: new Date().toISOString(),
  };
  return Response.json(result);
}
