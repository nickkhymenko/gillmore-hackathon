import { TwinInputSchema, type TwinResult } from "@/lib/types";
import { aiEnabled } from "@/lib/ai/gemini";
import { fallbackTwin, geminiTwin } from "@/lib/ai/twin";

/**
 * POST /api/twin
 * Body: { name, species?, photo: { mimeType, dataBase64 } }
 * Returns a Pet Twin profile read from the photo (appearance only, never a diagnosis).
 * If the AI is off, slow (10s) or fails, returns a neutral fallback so the owner can pick instead.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const parsed = TwinInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid photo", issues: parsed.error.flatten() }, { status: 422 });
  }
  const input = parsed.data;

  if (aiEnabled()) {
    try {
      return Response.json(await geminiTwin(input));
    } catch (err) {
      console.error("[twin] AI failed, using fallback:", err);
    }
  }

  const result: TwinResult = { profile: fallbackTwin(input.species), source: "fallback", petVisible: true };
  return Response.json(result);
}
