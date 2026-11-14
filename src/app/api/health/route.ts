import { GEMINI_MODEL, aiEnabled } from "@/lib/ai/gemini";

/** GET /api/health : quick status check. Shows whether live AI or demo (rules) mode is active. */
export async function GET(request: Request) {
  void request;
  return Response.json({
    ok: true,
    aiMode: aiEnabled() ? "gemini" : "demo-rules",
    model: aiEnabled() ? GEMINI_MODEL : null,
    time: new Date().toISOString(),
  });
}
