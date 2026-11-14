import { aiEnabled } from "@/lib/ai/gemini";
import { AskInputSchema, cannedAnswer, geminiAsk, redFlags, vetNowResult, type AskResult } from "@/lib/ai/ask";
import { DISCLAIMER } from "@/lib/types";

/**
 * POST /api/ask
 * Body: { question, pet, checkin?, walk? } (see src/lib/ai/ask.ts)
 * Returns: { answer, riskLevel, suggestVet, followUps } plus vetNow, reasons, source and the disclaimer.
 * Red flags in the question or the latest notes skip the AI and return the "needs a vet now" answer.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = AskInputSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid question", issues: parsed.error.flatten() }, { status: 422 });
  const input = parsed.data;

  const reasons = redFlags(input);
  let result: AskResult;
  if (reasons.length) result = vetNowResult(input.pet, reasons);
  else if (!aiEnabled()) result = cannedAnswer(input.pet);
  else {
    try {
      result = await geminiAsk(input);
    } catch (err) {
      console.error("[ask] AI failed, using the safe answer:", err);
      result = cannedAnswer(input.pet);
    }
  }
  return Response.json({ ...result, disclaimer: DISCLAIMER });
}
