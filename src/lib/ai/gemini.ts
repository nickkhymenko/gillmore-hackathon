import { GoogleGenAI, ThinkingLevel, Type, type Schema, type ThinkingConfig } from "@google/genai";
import { AssessmentSchema, type Assessment, type CheckinInput } from "../types";
import type { SafetyResult } from "../safety";

/**
 * Default: the Flash-Lite alias. Measured on 14 Nov 2026 it answers a structured prompt in about 1s,
 * while gemini-flash-latest did not answer within 120s on the same key.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
export const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

export const AI_TIMEOUT_MS = 12_000;

/**
 * Lowest thinking setting the model family accepts. These are short structured tasks, so
 * reasoning tokens only add latency.
 *  - Gemini 2.5: thinking budget of 0 (off).
 *  - Flash-Lite (3.x and the -latest alias): MINIMAL.
 *  - Other Gemini 3+ models: LOW (MINIMAL is rejected by gemini-flash-latest).
 */
export function lowThinking(model: string): ThinkingConfig {
  if (/gemini-2\.5/.test(model)) return { thinkingBudget: 0 };
  if (/lite/.test(model)) return { thinkingLevel: ThinkingLevel.MINIMAL };
  return { thinkingLevel: ThinkingLevel.LOW };
}

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };

/**
 * One structured JSON call with a hard timeout. Shared by every AI route so they all get the
 * same model, thinking and timeout behaviour. Throws on timeout or API error: callers keep a
 * deterministic fallback.
 */
export async function generateJson(opts: {
  system: string;
  parts: Part[];
  schema: Schema;
  timeoutMs?: number;
  temperature?: number;
}): Promise<unknown> {
  const { system, parts, schema, timeoutMs = AI_TIMEOUT_MS, temperature = 0.2 } = opts;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("AI timeout"));
    }, timeoutMs);
  });

  const run = (thinkingConfig?: ThinkingConfig) =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature,
        abortSignal: controller.signal,
        ...(thinkingConfig ? { thinkingConfig } : {}),
      },
    });

  const call = run(lowThinking(GEMINI_MODEL)).catch((err: unknown) => {
    // A model override may not accept our thinking setting: retry once with the model default.
    const status = (err as { status?: number })?.status;
    if (status === 400 && !controller.signal.aborted) return run();
    throw err;
  });
  // If the timeout wins the race, the aborted call rejects later: do not leave it unhandled.
  call.catch(() => {});

  try {
    const res = await Promise.race([call, timeout]);
    return JSON.parse(res.text ?? "{}");
  } finally {
    clearTimeout(timer);
  }
}

const SYSTEM = `You are a veterinary TRIAGE and PREVENTION assistant embedded in a UK pet-care app.
Rules you must follow:
- You do NOT diagnose and do NOT recommend prescription medicines. Only a registered vet can (Veterinary Surgeons Act 1966).
- Assess how urgently the owner should involve a vet, and explain early-warning signs in plain, kind British English.
- A deterministic safety layer has already run. NEVER return a status lower than "minimumStatus". You may escalate.
- If a photo is provided, describe only what is visible (coat, eyes, skin, body condition, posture). Say if image quality is poor.
- vetBrief is for the vet: concise, clinical, bullet-like prose, includes species/breed/age, owner-reported changes, photo findings, trend vs baseline.
- healthScore: 100 = perfectly normal week, below 70 = concerning, below 40 = urgent.
- preventionTips: 2 to 4 specific, actionable tips for this species, breed and age.
- Keep ownerMessage under 60 words.`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    status: { type: Type.STRING, enum: ["green", "amber", "red"] },
    healthScore: { type: Type.INTEGER },
    headline: { type: Type.STRING },
    ownerMessage: { type: Type.STRING },
    flags: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          area: { type: Type.STRING },
          observation: { type: Type.STRING },
          whyItMatters: { type: Type.STRING },
          urgency: { type: Type.STRING, enum: ["low", "medium", "high"] },
        },
        required: ["area", "observation", "whyItMatters", "urgency"],
      },
    },
    nextStep: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["keep_monitoring", "online_consult", "vet_within_48h", "emergency_now"] },
        rationale: { type: Type.STRING },
      },
      required: ["action", "rationale"],
    },
    preventionTips: { type: Type.ARRAY, items: { type: Type.STRING } },
    vetBrief: { type: Type.STRING },
    photoObservations: { type: Type.STRING },
  },
  required: ["status", "healthScore", "headline", "ownerMessage", "flags", "nextStep", "preventionTips", "vetBrief"],
};

export async function geminiAssessment(
  input: CheckinInput,
  safety: SafetyResult,
  trendNote: string | null,
  timeoutMs = AI_TIMEOUT_MS,
): Promise<Assessment> {
  const { photo, ...rest } = input;

  const context = {
    ...rest,
    photoAttached: Boolean(photo),
    safetyLayer: { minimumStatus: safety.minimumStatus, reasons: safety.reasons },
    trendVsOwnBaseline: trendNote,
  };

  const parts: Part[] = [{ text: `Weekly check-in data (JSON):\n${JSON.stringify(context, null, 2)}` }];
  if (photo) parts.push({ inlineData: { mimeType: photo.mimeType, data: photo.dataBase64 } });

  const json = await generateJson({ system: SYSTEM, parts, schema: responseSchema, timeoutMs });
  return AssessmentSchema.parse(json);
}
