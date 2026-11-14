# Stack, Working API and How to Share It

## The stack (and why)

| Layer | Choice | Why it wins a hackathon |
|---|---|---|
| App framework | **Next.js 16 (App Router) + TypeScript** | Frontend and API in one repo, one deploy. Route Handlers give us a real REST API |
| Styling | **Tailwind CSS 4** | Fast, consistent, mobile-first UI without a designer bottleneck |
| AI | **Google Gemini via `@google/genai`** | Multimodal (photo + text), enforced JSON schema output, free tier for students, fast Flash models |
| Validation | **zod** | Every API input and AI output is validated: no malformed data reaches the UI |
| Safety | **Deterministic rules engine** (`src/lib/safety.ts`) | Explainable, testable, defensible in Q&A |
| Hosting | **Vercel (Hobby, free)** | Auto deploy from GitHub; **preview URL for every PR**; production on `main`; HTTPS by default |
| Version control | **GitHub** + branch protection + **GitHub Actions CI** | Three people, no broken `main`, see `CONTRIBUTING.md` |
| Persistence (demo) | Browser storage | Zero setup, works offline in the demo |
| Persistence (upgrade) | **Supabase** (Postgres + Storage + Auth) | Only if the statement needs multi-user data; schema in `docs/02-SOLUTION.md` section 10 |
| Diagrams | **Mermaid** in Markdown | Renders on GitHub, version-controlled, editable by all |
| Slides | Google Slides or Canva (shared), PDF export to `pitch/` at freeze | Real-time co-editing; PDF is the fallback |

## Run locally

```bash
git clone https://github.com/nickkhymenko/gillmore-hackathon.git
```

```bash
cd gillmore-hackathon && npm ci
```

```bash
cp .env.example .env.local
```

Get a free key at https://aistudio.google.com/apikey and paste it into `.env.local` as `GEMINI_API_KEY=...`. Without a key the app runs in **demo mode** (rules engine), which is fine for UI work.

```bash
npm run dev
```

Open http://localhost:3000 and check http://localhost:3000/api/health (`"aiMode": "gemini"` means live AI).

## The API

### `POST /api/checkin`

```bash
curl -s -X POST http://localhost:3000/api/checkin \
  -H "Content-Type: application/json" \
  -d '{"pet":{"name":"Biscuit","species":"dog","breed":"Labrador","ageYears":8,"weightKg":34},
       "answers":{"appetite":"normal","energy":"lower","water":"more","stool":"normal","vomiting":"none",
                  "mobility":"stiff","skin":"normal","breathing":"normal","urination":"normal"},
       "notes":"Drinking more and slow getting up for a week",
       "history":[92,94,90,93]}'
```

Optional `photo: { "mimeType": "image/jpeg", "dataBase64": "..." }`, `streakWeeks: 4`.
Returns: `status` (green/amber/red), `healthScore`, `headline`, `ownerMessage`, `flags[]`, `nextStep`, `preventionTips[]`, `vetBrief`, `photoObservations`, `trend` (vs. own baseline), `creditsEarned`, `source` (`gemini` or `rules`), `safetyOverride`, `safetyReasons[]`.

### `GET /api/economics`

```bash
curl -s "http://localhost:3000/api/economics?policies=250000&engagementRate=0.4&claimCostReduction=0.08"
```

Params (all optional): `policies`, `engagementRate`, `feePerPetMonth`, `claimCostReduction`, `creditsPerPetYear`.

### `GET /api/health`

Shows `aiMode` and model. Check this on the production URL before the pitch.

## Deploy and share (10 minutes, Person A)

1. Merge the starter branch into `main` (see `CONTRIBUTING.md`).
2. Go to https://vercel.com/new, sign in with GitHub, import `nickkhymenko/gillmore-hackathon`. Framework is auto-detected as Next.js. Leave defaults.
3. **Settings, Environment Variables:** add `GEMINI_API_KEY` (Production + Preview). Optional `GEMINI_MODEL`.
4. Deploy. You get `https://<project>.vercel.app`. Add teammates under the Vercel team, or each person just uses the preview links posted on PRs.
5. Every PR now gets its own **preview URL** in a comment: review the change on your phone before merging.
6. Generate a **QR code** of the production URL (any QR generator, or Chrome's "Create QR code" share option) and put it on slides 1 and 4.
7. Before the pitch: open `/api/health` on the production URL and confirm `gemini`.

**Never** commit the API key. It lives only in `.env.local` (git-ignored) and in Vercel's settings.

## Swapping or adding an AI provider

All AI logic sits in `src/lib/ai/gemini.ts` behind one function returning the shared `Assessment` type. To use another provider, add `src/lib/ai/<provider>.ts` with the same signature and switch the import in `src/app/api/checkin/route.ts`. The safety floor and rules fallback keep working unchanged.

## Adapting to the problem statement (fast path)

| Change | File |
|---|---|
| Questions in the check-in | `src/app/checkin/page.tsx` (`QUESTIONS`) + `src/lib/types.ts` (`AnswersSchema`) |
| Red-flag rules | `src/lib/safety.ts` |
| AI behaviour and output fields | `src/lib/ai/gemini.ts` (`SYSTEM`, `responseSchema`) + `AssessmentSchema` |
| Business model numbers | `src/lib/economics.ts` |
| Copy and story | `src/app/page.tsx` |
| Demo scenarios | `SCENARIOS` in `src/app/checkin/page.tsx` |
