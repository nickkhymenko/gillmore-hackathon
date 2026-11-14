import { GoogleGenAI, Type } from "@google/genai";
import { AssessmentSchema, type Assessment, type CheckinInput } from "../types";
import type { SafetyResult } from "../safety";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
export const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

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

const responseSchema = {
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
  timeoutMs = 20000,
): Promise<Assessment> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const { photo, ...rest } = input;

  const context = {
    ...rest,
    photoAttached: Boolean(photo),
    safetyLayer: { minimumStatus: safety.minimumStatus, reasons: safety.reasons },
    trendVsOwnBaseline: trendNote,
  };

  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
    { text: `Weekly check-in data (JSON):\n${JSON.stringify(context, null, 2)}` },
  ];
  if (photo) parts.push({ inlineData: { mimeType: photo.mimeType, data: photo.dataBase64 } });

  const call = ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.2,
    },
  });

  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI timeout")), timeoutMs));
  const res = await Promise.race([call, timeout]);
  return AssessmentSchema.parse(JSON.parse(res.text ?? "{}"));
}
