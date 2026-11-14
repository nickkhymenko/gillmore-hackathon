# Ultimate Build Brief (Day 1 afternoon to Day 2 freeze)

This brief is the **top priority**. Precedence: `10` > `09` > `08` > `07`. Keep everything already working (Pet Twin photo theming, `/api/twin`, Gemini fast model, safety rules, check-in API). Rules: lint + build + commit + push after each part; no em or en dashes in UI copy; no Doctapet logo image (plain text "Powered by Doctapet" is fine, this is a concept for their white-label platform).

## 0. Product principle: simple first, reveal as you walk

The first screen is almost empty: one big question at a time. Nothing about insurers, pricing or payments appears up front. Those options **open up as the user scrolls along the walk**, each one appearing only when the paw reaches it. A first-time user should never see more than one decision at a time.

## 1. Onboarding (route `/`, Step 1 of 07 with the 09 changes)

Order, one question per screen, smooth slide transitions, paw-print progress:
1. Pet name.
2. **Photo** (Pet Twin: instant palette re-theme, Gemini breed guess, editable chips, avatar). For black, white and grey pets, take the accent from the photo background.
3. Confirm species and breed (prefilled from the twin).
4. Age (prefilled life stage), weight, neutered.
5. Activity level.
6. Consent (three toggles + "Your data can only lower your premium. Never raise it, never add exclusions.").
Then a clean transition (paw walks off screen) into the walk, which ends on the dashboard.

## 2. The Health Walk page (route `/walk`, also opened by "Scan" / "Start this week's scan")

A single scroll-driven page per pet. The pet's paw follows the scroll along an SVG path, stamping prints (species-specific), background shifting morning to park to evening in the pet's palette. Numbered stops, each animating in when the paw arrives:

1. **Hello, {name}.** Avatar, breed, **age in years and human-equivalent years** (use the published dog ageing approach: for dogs, `16 × ln(dogAge) + 31` from Wang et al. 2020 *Cell Systems*, labelled "approximate"; for cats a standard vet chart, labelled approximate). Line: **"Powered by Doctapet. Here with you."**
2. **This week's check-in.** The 60-second tap check-in inline (reuse `/api/checkin`), result animates in: status, score vs. own baseline, next step.
3. **Optional video** (see section 4).
4. **Your trends.** Graphs **tailored to the species, breed and age** (recharts, flat style, own-baseline band): e.g. Labrador senior: weight, mobility, thirst; cat: thirst, litter habits, appetite, activity; brachycephalic breeds: breathing at rest. Each chart has one plain-English sentence ("Mobility is 12 points below Biscuit's usual. Worth a vet's look.").
5. **Healthspan.** Typical lifespan range for the breed (cited) plus interactive levers (weight, dental, activity, parasite control, annual check, weekly check-ins) growing "healthy years". Label as illustrative.
6. **Care plan, supplements and brands.** From the `09` engine with all its guardrails. Generic ingredient first (e.g. "omega-3 fish oil, joint support, evidence: moderate"), then a clearly labelled **"Partner offers (examples, no affiliation)"** strip showing 2 to 3 example product cards per recommendation (use placeholder partner names, or real UK brands only if clearly labelled "example, not an endorsement"). Paused automatically when an amber or red flag is active.
7. **Your cover** (revealed only now): the insurer choice and plan options as cards (e.g. three illustrative plans: Accident only, Time-limited, Lifetime; synthetic insurer names), each showing the **Prevently discount** the pet is on track for. Clearly labelled "illustrative plans".
8. **How you pay** (revealed only after a plan is picked): monthly vs. annual toggle, the discount applied live, and the savings meter ("2 more check-ins to reach 7.5% off"). No real payment processing: the button opens a "Coming in the pilot" sheet.
9. **Same time next week?** Streak, add-to-calendar (.ics), button to the dashboard.

## 3. Pet health dashboard (route `/dashboard`)

As specified in `09` section 1 (premium savings hero card, this week, care plan, trends, Ask entry, next check-in). Also a small "Share with" panel: vet (on), insurer (engagement only), showing exactly what each one sees.

## 4. Video feature (ML teammate's model)

- Section on the walk and a full page `/scan`: camera preview (`getUserMedia`), 15s record with a countdown ring, preview playback, upload to `POST /api/scan` (mock JSON until `ML_API_URL` is set; when set, forward the video to `${ML_API_URL}/analyze` per the contract in `docs/06-PS1-PLAN.md` section 7).
- Results feed the trend charts.
- **Sharing is always owner-initiated and explicit:** "Send to my vet" (with the vet brief) and "Attach to a claim" (only when the owner opens a claim). Never sent to the insurer automatically; the insurer only ever receives engagement data by default. Show this promise next to the buttons.
- If the camera is unavailable, offer file upload.

## 5. Partner (insurer + underwriter) and seed data

As in `09` sections 3 and 4 (`/partner` tabs, `?demo=biscuit`, `?demo=miso`).

## 6. Design quality bar

- Keep the current warm editorial look in the screenshot (cream page, huge tight headlines, serif italic accent word, palette from the photo, orange accent). It is good: extend it consistently to every page and remove all leftover teal components.
- Simpler by default: generous whitespace, one primary action per screen, secondary actions as underlined links.
- Motion: subtle and purposeful (300 to 600ms ease-out), reduced-motion respected.
- Mobile first: perfect at 390px; no horizontal scroll; tap targets 44px+.
- Every page has loading, empty and error states. No dead buttons.

## 7. Merge so the team sees it on Vercel

Vercel deploys `main` automatically. After each major part (onboarding, walk, dashboard, partner), once lint and build pass:
1. `git push` the working branch.
2. If the GitHub CLI is installed and logged in (`gh auth status`): `gh pr create --base main --head <current-branch> --fill` (or reuse the open PR), then `gh pr merge --merge`.
3. Otherwise: `git fetch origin && git switch main && git pull --ff-only && git merge --no-ff <current-branch> -m "merge: <part>" && git push origin main && git switch <current-branch>`.
4. Never force-push `main`. If a merge conflicts, stop and tell me.
5. Tell me after each merge so I can check the Vercel URL.

## Order

1 Onboarding → merge → 2 Walk → merge → 3 Dashboard (stop and tell me to test) → merge → care plan engine (from 09) → 4 Video → 5 Partner + seed data → merge → 6 polish pass → merge. Print a short summary after each part.
