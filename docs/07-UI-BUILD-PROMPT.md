# Build Prompt for Claude Code (local terminal)

You are building the hackathon UI for **Prevently** (Gillmore Hackathon 2026, Problem Statement 1 "Prevention that pays": a prevention product an insurer offers inside its own app, with value for pet parent, vet, insurer and underwriter). Read `AGENTS.md`, `CONTRIBUTING.md`, `docs/06-PS1-PLAN.md` and the relevant guides in `node_modules/next/dist/docs/` before writing code. This is Next.js 16 with Cache Components enabled.

Work through the steps **in order**. After **each** step: run `npm run lint` and `npm run build`, fix any errors, then `git add -A && git commit -m "<conventional message>" && git push -u origin HEAD`. Never commit `.env.local`. Keep `/checkin`, `/pet`, `/partner` and all `/api/*` routes working. Never use em dashes or en dashes in any UI copy.

---

## Step 0: Fix the Gemini timeout (do this first, 10 minutes max)

The check-in API logs `AI failed, using rules fallback: Error: AI timeout` after about 20s, so the UI sits on "Assessing...". The key is set in `.env.local`.

1. Test the key and latency with curl against `gemini-flash-lite-latest` and `gemini-flash-latest` (`GEMINI_API_KEY` from `.env.local`). Report HTTP status and time.
2. In `src/lib/ai/gemini.ts`: default to the fastest working model (prefer the Flash-Lite alias), minimise thinking for this structured task (check the installed `@google/genai` types for the correct `thinkingConfig` field for the model family; for Gemini 3 models use the lowest thinking level, for 2.5 models a thinking budget of 0), and lower the timeout to 12s. Keep the rules fallback.
3. In the check-in UI, replace the bare "Assessing..." with a skeleton result card plus a short rotating status line ("Reading answers", "Comparing with Biscuit's baseline", "Writing the vet brief").
4. Verify with a real POST to `/api/checkin` that `source` is `"gemini"` and it returns in under 8s. Commit: `fix(ai): fast model, low thinking, 12s timeout, loading skeleton`.

## Design system (applies to every step)

Visual direction: editorial, warm, premium, similar in *feel* to modern UK pet-care tech sites. **Use our own brand, Prevently. Do not use the Doctapet logo, name in the header, photos or copy.** A small footer line "Built for the Gillmore Hackathon 2026" is fine.

- Background warm off-white `#F7F5F0`; text near-black `#141414`; accent yellow `#FFD43B`; muted text `#6B6B6B`; dark band `#121212` with yellow numbers.
- Font: `Inter Tight` via `next/font/google` (600 to 700 for headings, tracking around `-0.04em`, very large: `clamp(3rem, 8vw, 7.5rem)` for heroes). Body 400 to 500.
- Generous whitespace, 12-column grid, max width about 1200px, square-ish buttons (radius 6px), yellow primary buttons with a `↗` arrow icon, underlined text links.
- Section labels in small caps style (e.g. `PREVENTLY / PET TWIN`).
- Mobile first: must look excellent at 390px wide. Respect `prefers-reduced-motion` everywhere.
- Install: `motion` (Framer Motion, import from `motion/react`), `recharts`, `lucide-react`. Nothing else unless essential.
- Theme adapts to the pet: accent tint and illustration per species (dog, cat, rabbit, horse) and per size class (toy, small, medium, large, giant). Put tokens in `src/lib/theme.ts`.

## Step 1: Landing + ultra-simple onboarding (route `/`)

- Hero: huge headline "Catch the question before it becomes a claim." Sub: "Most pet insurance claims start as a question an owner had days or weeks earlier. Prevently answers it early, inside your insurer's app." Primary button "Meet your Pet Twin ↗", secondary link "For insurers ↗" to `/partner`.
- Dark stats band (from the brief): `£1.23bn` claims paid 2024 · `£685` average claim · `1.8m` claims a year · `+75%` vet prices in 10 years.
- Onboarding: one question per screen, big type, keyboard friendly, animated slide transitions: pet name → species (4 big tappable cards) → breed (searchable list from the breed data, with "Mixed / not sure" + size picker) → age → weight → neutered? → activity level → optional photo. A row of paw prints fills in as progress. Save to the existing `src/lib/store.ts` (extend the `Pet` type and zod schema in `src/lib/types.ts` carefully; it is the shared contract).
- Consent screen (last step): three toggles: "Share scans with my vet", "Share engagement (not health data) with my insurer for my discount", "Anonymised research". Big promise line: **"Your scan data can only lower your premium. Never raise it, never add exclusions."**

## Step 2: "The Walk" transition and Pet Twin journey (route `/twin`)

After onboarding, a clean transition: the screen clears, a paw icon appears and the page becomes a **scroll-driven walk**.

- A paw icon follows the user's scroll along a winding SVG path down the page (`useScroll` + `useTransform`, path drawn with `pathLength`). Paw prints are stamped behind it as a trail (alternating left/right, fading). On mobile the path is a gentle S-curve. Reduced motion: static path, no animation.
- Each stop on the walk is a section that animates in when the paw reaches it:
  1. **Hello, {name}.** Personalised hero with species/size theme, age in "human-ish" years, a short line about the breed.
  2. **Healthspan.** A recharts chart: typical lifespan for the breed (from data below) as a range, and a "healthy years" bar the owner can grow. Below it, interactive **levers** (toggles or sliders): healthy weight, dental care, daily activity, vaccinations and parasite control, annual vet check, weekly Prevently scan. Each lever shows its evidence and an *illustrative* effect, and the projected healthy years update live with a smooth number animation. Label clearly: "Illustrative, based on published studies. Not a prediction for your pet."
  3. **Watch for.** 3 to 5 breed or species specific risks with plain-English early signs and what a scan or check would catch (e.g. Labrador: obesity, osteoarthritis, ear disease; French Bulldog: breathing (BOAS), skin folds; Cavalier King Charles: heart (mitral valve) disease; Dachshund: back (IVDD); German Shepherd: hips, gut; Persian cat: kidneys (PKD); any cat: urinary blockage; rabbit: teeth, gut stasis; horse: lameness, laminitis, colic).
  4. **Your weekly scan.** Explains the 15 second video scan (walk + sleeping breathing count). Button to `/checkin` (the ML teammate's video scan will plug in via `POST /api/scan`, see plan section 7). Show a mini version of the Pet Twin trend chart.
  5. **Ask Prevently.** Inline chat (Step 3).
  6. **Prevention pays.** Discount meter (engagement based, e.g. "4 of 4 scans this month: 4.5% off renewal so far"), streak, credits; the four parties strip (pet parent, vet, insurer, underwriter) with one line each.
- Put breed and evidence data in `src/data/breeds.ts` and `src/data/evidence.ts` with a `sources` array rendered as footnotes. About 25 common UK breeds plus fallbacks by species and size.

### Data rules (important for credibility with judges)

Use only figures you are confident come from these public sources, and cite them in footnotes. If unsure of an exact number, use a range and mark it "approximate":
- McMillan et al. (2024), *Scientific Reports*: UK companion dog longevity by breed, about 585,000 dogs; overall median about 12.5 years; small breeds tend to live longer, flat-faced breeds shorter.
- Teng et al. (2022), *Scientific Reports*: UK dog life tables (RVC VetCompass).
- RVC VetCompass studies (O'Neill et al.) on UK dog and cat longevity and common disorders.
- Kealy et al. (2002), *JAVMA*: Labradors kept lean lived a median of about 1.8 years longer than their littermates fed more.
- Teng et al. (2024), *Journal of Feline Medicine and Surgery*: UK cat life expectancy.
- PDSA Animal Wellbeing (PAW) Report for owner behaviour (vaccination, vet visits, weight).
- The Gillmore Hackathon reading guide figures already in `src/lib/economics.ts`.
Never invent study names or precise percentages.

## Step 3: Ask Prevently chat with guardrails (`POST /api/ask` + component)

- Input: question + pet profile + latest scan metrics. Gemini, short answers (under 120 words), plain British English, tailored to the pet.
- Guardrails **before** the LLM: reuse the red-flag patterns in `src/lib/safety.ts` (breathing difficulty, collapse, seizure, toxins, bloat, cat straining to urinate, etc.). If triggered, skip the LLM and return an escalation card: "This needs a vet now" with "Start online consult" and "Find emergency vet" buttons.
- System prompt: no diagnosis, no medicine names or doses, no supplement brand recommendations; when uncertain or symptoms persist, recommend an online vet consult. Return JSON `{ answer, riskLevel: "low"|"medium"|"high", suggestVet: boolean, followUps: string[] }`.
- UI: suggested starter questions per species ("Is it normal that she drinks more in winter?", "How much should a 34kg Labrador eat?"), typing indicator, vet escalation card styled in yellow.
- Log each question (in browser storage for now) as an "early question captured" counter, shown on the partner page as a metric.

## Step 4: Polish and partner page refresh

- Restyle `/checkin`, `/pet` and `/partner` with the new design system (keep their logic).
- `/partner`: add a pricing model switch (per policy / per engaged member / per claim avoided) and the business case table from `docs/06-PS1-PLAN.md` section 5, plus the underwriter data-use matrix from section 6.
- Global header: Prevently wordmark, links "Pet Twin", "Scan", "Ask", "For insurers". Footer with sources and the disclaimer "Triage and monitoring support only, not a diagnosis."
- Check every page at 390px and 1440px. Fix layout shift and hydration warnings.
- Final commit: `feat(ui): pet twin walk, healthspan levers, ask prevently, new design system`.

When finished, print a short summary of what was built, any data you marked approximate, and anything that still needs a human decision.
