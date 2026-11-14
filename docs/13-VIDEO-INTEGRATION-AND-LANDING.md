# Doc 13: New landing, species-first onboarding, and the live video model integration

Two people work in parallel. To avoid breaking `main`, the work is split by **files you own**. Precedence: `13` > `12` > `10` > `09` > `08` > `07`.

## Ownership (do not edit the other side's files)

| Area | Owner | Files |
|---|---|---|
| Landing, onboarding, dashboard UI, partner, everything else | **UI (Alexander's Claude)** | everything except below |
| Video model service | **ML (teammate's Claude)** | `ml/**` (new folder: model code, service, Dockerfile, README) |
| Video provider adapter | **ML** | `src/lib/video/provider.ts` |
| Video contract (shared, frozen) | **UI creates it, then frozen** | `src/lib/video/contract.ts`. Changes only by agreement in the team chat |
| Video panel UI | **UI** | `src/components/video/**`, `src/app/api/scan/route.ts` |

Rule: the UI side builds the **seam** first and merges it (Part V0). The ML side branches from `main` **after** V0 is merged, and works only in its files.

---

## Part V0 (UI side, do first, 20 minutes): the video seam

1. `src/lib/video/contract.ts`: zod schemas and types for the ML response exactly as `docs/06-PS1-PLAN.md` section 7, plus optional `overlays` for live mode:
   ```ts
   // per-frame live result (optional, for live overlay)
   LiveFrameResult = { t: number; keypoints?: {x:number;y:number;name:string;score:number}[]; label?: string; confidence?: number }
   // clip result: { scanId, petId, timestamp, scanType: "walk"|"sleep_breathing"|"face"|"general",
   //   metrics: { mobilityScore, gaitAsymmetry, breathingRatePerMin, activityLevel, bodyConditionScore } (each number|null),
   //   flags: {code,label,severity:"green"|"amber"|"red",confidence}[], quality:{ok:boolean, issue:string|null}, modelVersion }
   ```
2. `src/lib/video/provider.ts`: interface `VideoProvider { mode: "server"|"browser"|"mock"; analyzeClip(blob, meta): Promise<ClipResult>; startLive?(video: HTMLVideoElement, onFrame:(r:LiveFrameResult)=>void): () => void }` with a **mock implementation** as default.
3. Selection: `NEXT_PUBLIC_VIDEO_MODE` = `mock` (default) | `server` | `browser`; `ML_API_URL` for server mode. `/api/scan` forwards clips to `${ML_API_URL}/analyze` (multipart: `video`, `petId`, `species`, `scanType`) with a 20s timeout and **falls back to mock** on any error, returning `source: "ml"|"mock"`.
4. `src/components/video/VideoScanPanel.tsx` on the **dashboard** (and linked from the walk): camera preview (`getUserMedia`, rear camera on phones), **live mode** (if the provider supports `startLive`, draw keypoints/labels on a canvas overlay in real time) and **record 15s** mode (countdown ring, playback, analyse), results animate into the dashboard trends and Black Box diagnostics. File upload fallback when camera is denied. Owner-initiated "Send to my vet" and "Attach to a claim" only.
5. Contract tests: `tests/video-contract.test.ts` (or a Playwright spec) checks the mock and any `ML_API_URL` response parse with the schema.
6. Merge to `main`. **Post in the terminal: "V0 merged, ML can branch now."**

## Part L: new landing and species-first onboarding (UI side)

Editorial, photography-led, in the spirit of the best UK pet-care sites (cream page, huge tight headlines, yellow accent, full-bleed photos, small caps section labels, narrative scroll sections). **Our own copy and imagery only: do not copy Doctapet's text, photos or layout pieces.**

1. **Hero:** "Make your pet bills work for you." Sub: "Prevently helps you catch problems early and turns good care into a cheaper premium. Inside your insurer's app. Powered by Doctapet." Primary CTA "Start with your pet ↗", secondary link "How it lowers your bill".
2. **Species picker straight on the landing page** (first decision): four large photo cards: Dog, Cat, Rabbit, Horse (free photos: Dog CEO API for dogs; Unsplash images via `images.unsplash.com` with photographer credit for others, or tasteful illustrations). Tapping one starts onboarding with species preselected.
3. **Narrative scroll below the hero** (story, not features), e.g. "Tuesday, 7:10am. Biscuit is slower on his walk." → "Prevently notices the dip against his own normal." → "A vet looks at it online that evening." → "A £60 consult instead of a £685 claim." → "And Biscuit's owner pays less next year." Each step with a photo or the avatar, revealed on scroll.
4. **Stats band (dark):** £1.23bn claims paid 2024 · £685 average claim · +75% vet prices in 10 years · 69% of Millennials and Gen Z say their pet is family. Sources footnoted.
5. **"How we lower your bill" section:** weekly check-in, walks and Black Box, personal targets, "can only lower your premium" promise, illustrative saving.
6. **Onboarding order:** species (from the landing card) → name → **photo** (the twin call now sends the chosen species; Gemini returns the **top 3 breed suggestions with confidence** as tappable chips plus "Mixed / not sure" and a searchable list) → confirm breed → age, weight, neutered → activity → consent → the walk.
7. **Empty dashboard state:** the current "Meet your pet first." page is too bare. Replace it with a designed empty state: avatar placeholder, the three things you'll get (early warnings, a personalised walk, a cheaper premium), a primary "Start with your pet" CTA and a secondary "See a demo pet" (loads `?demo=biscuit`).

## Then continue doc 12

Part D (partner Black Box tab and hardware economics) → Part E (nav and `?demo=` seeds, landing already done above) → **Part F full QA** including the video checks below. Merge after each part.

## Video QA checks (add to F)

- With `NEXT_PUBLIC_VIDEO_MODE=mock`: the dashboard video panel records, analyses and updates charts; no console errors at 390px and 1440px.
- With `ML_API_URL` set to a dead URL: falls back to mock within 20s, shows "Using demo analysis".
- Camera denied: file upload path works.
- No video ever sent to any endpoint other than `/api/scan` and only after the owner presses Analyse.

---

# Prompt for the ML teammate's Claude Code

Give this to the teammate. They run it **after** the UI side says "V0 merged".

```text
You are integrating my pet video model into our team's Next.js app without breaking main.

Setup:
1. If the repo is not cloned: git clone https://github.com/nickkhymenko/gillmore-hackathon.git && cd gillmore-hackathon
2. git switch main && git pull --ff-only && git switch -c ml/video-model
3. npm ci, copy .env.example to .env.local (ask the team for GEMINI_API_KEY), npm run dev, confirm the dashboard loads.
4. Read AGENTS.md, CONTRIBUTING.md, docs/06-PS1-PLAN.md section 7 and docs/13-VIDEO-INTEGRATION-AND-LANDING.md fully.

Rules (non-negotiable):
- Only create or edit files in ml/** and src/lib/video/provider.ts. Do NOT edit src/lib/video/contract.ts, any page, component, API route or config. If you think the contract must change, stop and tell me what and why.
- Keep NEXT_PUBLIC_VIDEO_MODE defaulting to mock so production never depends on the model until we switch it on.
- Run npm run lint and npm run build before every commit. Commit small, push to ml/video-model.

Work:
A. Inspect my model code (I will point you to it or paste it into ml/). Tell me what it is (framework, inputs, outputs, speed, whether it can run in the browser).
B. Choose the integration mode:
   - "browser" if the model can run client-side (TensorFlow.js, ONNX Runtime Web, MediaPipe): implement startLive (real-time keypoints/labels on the camera feed, throttled to about 10 fps) and analyzeClip in src/lib/video/provider.ts, loading model files from public/models/ via a lazy dynamic import.
   - "server" otherwise: build a small FastAPI service in ml/service/ with POST /analyze (multipart: video, petId, species, scanType) returning JSON that EXACTLY matches the clip result schema in src/lib/video/contract.ts, plus GET /health. Add CORS for localhost:3000 and the Vercel domain. Add ml/service/Dockerfile and ml/README.md with run instructions. For the demo, expose it with `npx cloudflared tunnel --url http://localhost:8000` (or deploy to a free Hugging Face Space with Docker) and give me the public URL for ML_API_URL.
C. Map model outputs to the contract metrics (mobilityScore 0 to 100, gaitAsymmetry 0 to 1, breathingRatePerMin, activityLevel 0 to 1, bodyConditionScore 1 to 9) and flags with severity and confidence. Any metric the model does not measure must be null, never invented. Return quality.ok=false with a reason for unusable footage (too dark, no animal, too short).
D. Test: run the contract test in tests/ against my output; test 3 real videos (normal walk, limping or stiff walk if available, no-animal video) and record results in ml/README.md. Then run the app with NEXT_PUBLIC_VIDEO_MODE set to my mode (and ML_API_URL if server) and confirm the dashboard video panel shows real results and the app still works with the model switched off.
E. Open a PR from ml/video-model into main with gh, describing the mode, how to run it, test results and the env vars to set on Vercel. Do NOT merge it yourself. Tell me when CI and the Vercel preview are green so the team can review and merge.

Never present results as a diagnosis: the app wording is "signs worth a vet's look".
```

## Turning it on in production (after the ML PR is merged)

Set on Vercel (Production + Preview): `NEXT_PUBLIC_VIDEO_MODE=browser` or `server`, and `ML_API_URL=<public URL>` for server mode. Redeploy. If anything misbehaves on stage, set `NEXT_PUBLIC_VIDEO_MODE=mock` and redeploy: the app keeps working.
