# Pivot: Pet Health Dashboard, Care Plan (incl. supplements) and Insurer Savings

**Decision (team, Day 1):** the weekly check-in becomes the core habit (60s quick check-in + optional photo). Video scan stays as an *optional* add-on (`/scan`, ML teammate) and must not block the demo. The headline product is a **Pet Health Dashboard** that turns weekly check-ins into (1) a personalised care plan including supplement recommendations and (2) a lower insurance premium.

Read with `07` and `08`. Where they conflict, **this file wins**. Same rules: lint, build, commit, push after each part. No em or en dashes in UI copy. No Doctapet branding.

## 1. Pet Health Dashboard (`/dashboard`, becomes the main logged-in home)

One screen, editorial style, themed by the Pet Twin palette and avatar:

- **Top band:** avatar, name, breed, age; health score (0 to 100) with a 12-week sparkline vs. own baseline band; streak ("6 weeks in a row").
- **Insurance savings card (hero metric):** "You've saved **£X** on your premium this year" with a progress meter toward the max discount and next milestone ("2 more check-ins to reach 7.5% off"). Small print: "Your check-in data can only lower your premium. Never raise it, never add exclusions."
- **This week:** status (green/amber/red), what changed vs. baseline, next step button (keep going / online vet consult / emergency).
- **Care plan:** 3 to 6 personalised actions from the recommendation engine (section 2), each with an evidence grade badge and a "why this" expander.
- **Trends:** recharts small multiples: weight, appetite, energy, mobility, thirst (from check-in answers mapped to 0 to 100 scales), each with the pet's own baseline band.
- **Ask Prevently** entry point and **Next check-in** countdown with "Add to calendar" (.ics).

## 2. Care Plan and Supplement Recommendation Engine

`src/lib/careplan.ts` (deterministic, testable) + optional Gemini wording polish via `POST /api/careplan`.

- **Inputs:** species, breed, size class, age, weight, neutered, activity level, body condition (from Pet Twin photo or owner), and the last 4 to 12 check-ins (trends, flags).
- **Output:** ranked list of recommendations, types: `habit` (e.g. weekly weigh-in, tooth brushing), `vet` (e.g. book a senior health check, dental check), `diet` (portion guidance, talk to vet about weight plan), `supplement`, `product` (e.g. dental chews).
- **Rules examples (encode as data in `src/data/careRules.ts`):**
  - Large breed or senior dog with stiffness or reduced mobility trend: omega-3 (fish oil) for joint support, **evidence: moderate**; glucosamine/chondroitin, **evidence: limited/mixed**; plus "book a mobility check with your vet", weight management.
  - Itchy skin trend: omega-3 for skin and coat (**evidence: moderate**), parasite control check, vet consult if 3+ weeks.
  - Soft stool or diarrhoea once, no red flags: probiotic for digestive support (**evidence: limited to moderate**), hydration, vet if persists 48h or any blood.
  - Any dog or cat over 2: daily tooth brushing; dental chews, prefer products with a recognised dental efficacy seal (VOHC).
  - Overweight body condition or rising weight: no supplement; portion plan and vet weight clinic first (Kealy et al. 2002 lean-feeding evidence).
  - Cats: most healthy cats on complete diets need no supplements; recommend hydration (water fountains, wet food) and annual checks; urinary support diet only via vet.
  - Increased thirst in older pet: **no supplement**; vet check (could indicate kidney or endocrine disease).
- **Guardrails (non-negotiable, show in UI):**
  - Every supplement card says "Supplements support, they don't treat. Check with your vet first, especially if your pet takes medication." and has a "Discuss with a vet" button.
  - Never recommend supplements when an amber or red flag is active; show the vet step instead.
  - Never mention doses or prescription medicines. Generic ingredient names only in the core plan (e.g. "omega-3 fish oil"); partner products appear only in a clearly labelled **"Partner offers"** strip.
  - Evidence grade badges: `Strong`, `Moderate`, `Limited`, with a short source line. Do not invent studies; where unsure say "limited evidence".
  - **The premium discount is never linked to buying supplements.** Rewards come from check-ins only (fair for owners who can't afford extras; avoids product tying under FCA Consumer Duty).
- **Monetisation shown on partner page:** partner offers earn affiliate commission for the platform; a retailer-funded credits line.

## 3. Insurer and Underwriter Dashboard (`/partner`, rebuild)

Two tabs:

**Insurer tab (portfolio view):**
- KPIs: members, weekly active check-in rate, average streak, amber flags this week, consults booked, **estimated claims avoided (£)**, retention vs. non-members, total discounts paid.
- Chart: claims cost per member, engaged vs. non-engaged cohort (synthetic data, clearly labelled).
- Early-warning queue (synthetic pets) with status and next action.
- **Pricing model switch:** per policy / per engaged member / per claim avoided, recalculating cost to insurer and net benefit live.
- Business case table from `docs/06-PS1-PLAN.md` section 5 with sliders (policies, engagement, claims reduction, average premium, discount level, retention uplift).

**Underwriter tab:**
- Loss ratio impact: baseline vs. with Prevently (sliders feed it).
- **Discount engine explainer:** tiers by check-ins in the policy year, e.g. 26+ check-ins = 5%, 40+ = 7.5%, 48+ = 10% off renewal (editable). Show the cost of discounts vs. claims avoided.
- **Data-use matrix** from `06` section 6: what is shared (engagement per policy, aggregated anonymised trend indices), what is never shared (raw photos/video, individual health answers for pricing), and the fairness rules.

## 4. Seed data and demo

- `?demo=biscuit` (8y Labrador, 12 weeks of check-ins with a stiffness and thirst drift in the last 3 weeks, 5% discount earned, care plan shows omega-3 + mobility check, amber vet step active so supplements are paused) and `?demo=miso` (4y cat, healthy, hydration plan, 7.5% discount).
- Partner page seeded with a 100,000-policy synthetic insurer.

## 5. Navigation

Header: **Dashboard**, **Check-in**, **Care plan**, **Ask**, **For insurers**. The walk (`/twin`) becomes the first-run onboarding experience that ends on the dashboard. `/scan` stays reachable from the check-in page as "Add a video (optional)".

## Order of work (after whatever step is in progress finishes)

1 Dashboard → 2 Care plan engine + UI → 3 Partner rebuild → 4 Seed data → 5 Nav. Commit and push after each. Then continue any remaining items from `08` if time allows, skipping video work unless the ML teammate's endpoint is ready.
