# Prevently Black Box: telematics for pet insurance

Top priority from now. Precedence: `12` > `10` > `09` > `08` > `07`. Same rules: lint, build, commit, push after each part; merge to `main` via `gh` after each part when green; no em or en dashes in UI copy; plain-text "Powered by Doctapet" only, no logo.

**The idea in one line:** car black boxes made insurance affordable for young drivers; Prevently Black Box does the same for pet owners. A collar (or the phone, until you have one) tracks walks, activity and simple vitals against **your pet's own personalised target**, and doing the right thing for your pet lowers your premium. **"Make your pet bills work for you."**

---

## Part A: Validate and clean up what exists (do first, 30 min max)

1. Run sections 1, 2 and 3 of `docs/11-QA-VERIFY.md` against what is built now (build health, API contracts, AI guardrail red team for check-in notes and twin). Write results to `docs/qa-report.md`. Fix anything critical.
2. **Kill the old UI:** `/checkin` still shows the old teal form. Either restyle it fully in the new design system or make `/checkin` redirect to the inline check-in on the walk (`/walk#checkin`). Remove every remaining teal class and old component. `/` must open onboarding for new users and the dashboard for returning users, never the old form.
3. Correct the lifespan citation everywhere: the ~585,000-dog UK breed longevity study is **McMillan et al. (2024), *Scientific Reports***. UK life tables: Teng et al. (2022), *Scientific Reports* (dogs) and Teng et al. (2024), *Journal of Feline Medicine and Surgery* (cats).
4. Merge PR #5 (dashboard) once green. Tell me.

## Part B: A more personalised walk

Make `/walk` feel written for this one pet:

- **"Given {name}'s characteristics, here is {his/her/their} walk"** card near the top:
  - **Daily exercise target** from the breed's exercise category (use The Kennel Club breed exercise guidance categories: up to 30 min, up to 1 hour, up to 2 hours, more than 2 hours), adjusted for age (puppy: the common "5 minutes per month of age, up to twice a day" rule of thumb, labelled as guidance; senior: shorter, more frequent walks), weight and body condition (overweight: gradual increase), and any active flag (stiffness: gentle walks, swimming suggestion; amber/red: rest and vet first).
  - **Split into walks** (e.g. "2 walks: 40 min morning, 30 min evening"), pace and terrain suggestions, enrichment ideas (sniff walks, fetch, swimming for joints).
  - **Today's conditions:** use the free **Open-Meteo** API (no key) with the browser's location (fallback: Coventry, CV4 7AL) for temperature, rain and sunset. Show "best walk window today". **Heat safety:** warn above about 20°C, stronger for flat-faced breeds, overweight and senior dogs; suggest early or late walks and shorter routes. Cats get a play and enrichment plan instead of walks; rabbits a free-roam plan.
  - Breed-specific "watch for on walks" (e.g. Labrador: weight, joints, water; French Bulldog: overheating, breathing; Dachshund: jumping, stairs; Border Collie: needs mental work too).
- More personalisation through the whole walk: copy uses the pet's name and pronouns, life-stage tone (puppy, adult, senior), stops reorder by what matters most for this pet (e.g. senior Labrador: joints and weight first).
- **Big CTA at the end of the personalised walk card and again at the end of the walk:** **"Make my insurance cheaper today"** leading to `/blackbox`.

## Part C: `/blackbox`, the Black Box experience

Same editorial design, walk metaphor continues (the paw trail leads into this page).

1. **Hero:** "Make your pet bills work for you." Sub: "UK vet prices rose about 75% in ten years. The average pet insurance claim is £685. Prevently Black Box turns good care into a lower premium." Show the pet's avatar wearing a small collar.
2. **How it works (3 steps):** Wear it (collar, or your phone until it arrives) → Walk and care as normal → Your premium drops as you hit {name}'s personal target.
3. **Your potential saving:** live estimate from the pet's quote (illustrative premium by species, breed, age) and the discount tiers, e.g. "Up to £{x} a year off {name}'s cover".
4. **Connect:**
   - **"Use my phone for now"** (default): Walk mode below.
   - **"Pair Prevently Collar"**: a pairing animation and a **simulated collar** (no hardware needed for the demo).
   - **Optional real hardware demo:** "Connect any Bluetooth heart rate sensor" using **Web Bluetooth** and the standard Heart Rate Service (`0x180D`, characteristic `0x2A37`), Chrome only, hidden if unsupported. A human chest strap or watch can stand in for the collar on stage.
5. **Walk mode (Strava for dog walks):**
   - Start / pause / finish; live timer, distance, pace, using `navigator.geolocation.watchPosition`; route drawn on a **Leaflet + OpenStreetMap** map (with attribution), shown **only to the owner**.
   - **"Simulate a walk" button** for the demo (indoors GPS fails): replays a realistic 35-minute loop at 10x speed with a moving paw marker.
   - Collar extras when paired or simulated: steps, active minutes, resting heart rate, resting breathing rate, sleep quality, restlessness at night, scratching or shaking events, temperature alert.
   - **Finish screen:** walk summary card (distance, time, map thumbnail, "target 40 of 70 minutes today"), streak, "+ credits", and how it moved the premium meter.
6. **Black Box diagnostics (not diagnosis):** weekly trend cards vs. own baseline: activity, rest, resting heart and breathing rate, night restlessness. A sustained change (e.g. activity down 25% over 10 days, resting breathing rate up) raises an amber flag that offers an online vet consult with the Black Box summary attached. Wording: "a change worth a vet's look", never a diagnosis.
7. **Data flows into the rest of the site:** walks and collar data update the dashboard trends, health score, care plan (e.g. low activity: enrichment ideas; heat: shorter walks) and the **premium savings hero card**, live.
8. **Your price, live:** a quote card that recalculates as targets are hit: base premium, Black Box discount, new monthly price, "you've saved £X so far". Discount tiers based on **weeks where the personal target was met + weekly check-ins** (e.g. 60% of weeks: 5%, 75%: 7.5%, 90%: 10%, plus up to 5% extra for check-ins; cap 15%). Illustrative, editable on the partner page.
9. **Your data, your rules** panel (always visible on this page):
   - Routes and locations **stay on your device**. Never shared.
   - Your insurer sees only: "target met this week: yes/no" and your discount tier.
   - Your vet sees the health trends only if you share them.
   - Underwriters see anonymised group trends only.
   - **It can only lower your premium. Never raise it, never add exclusions.**
   - **Fair by design:** targets are personal to breed, age and health, so a senior Pug and a young Collie can both earn the full discount. **Rest mode:** if a vet advises rest (injury, surgery), targets pause and the discount is protected.

## Part D: Insurer and underwriter view updates (`/partner`)

- New **Black Box** tab: adoption rate slider, % of members hitting targets, early-warning flags from activity changes, consults triggered, estimated claims avoided, discounts paid, net benefit, retention uplift.
- **Hardware economics:** collar cost (illustrative £40 to £60 to make), options: free with a 2-year policy, or £5/month bundled; payback period for the insurer.
- **Why younger owners:** telematics analogy, pets as family (69% of Millennials and Gen Z, reading guide), price sensitivity; acquisition channel for insurers.
- Underwriter tab: activity data as a **discount-only** pricing input, fairness rules (breed and age-normalised targets, rest mode, no surcharges, no exclusions), data minimisation (no location data), and the regulatory notes (UK GDPR for location and owner data, FCA Consumer Duty fair value, explainable discount rules).

## Part E: Landing page and navigation

- Landing hero gets the Black Box line as the second message: "Make your pet bills work for you" with "Make my insurance cheaper today" CTA.
- Nav: **Walk**, **Black Box**, **Dashboard**, **For insurers**. Check-in lives inside the walk and dashboard.
- Seed demo: `?demo=biscuit` includes 6 weeks of simulated collar data, 14 walks, a mild activity decline in the last 10 days (amber) and a 7.5% discount earned; `?demo=miso` (cat) shows the play and enrichment version with an indoor activity tracker.

## Part F: Validate again

Run `docs/11-QA-VERIFY.md` sections 1 to 4 on everything, add Black Box checks: simulated walk end to end, finish screen updates dashboard and price, Web Bluetooth button hidden when unsupported, no location data in any request to `/api/*` except the owner's own weather lookup, heat warning appears for a French Bulldog at 24°C (mock the weather), rest mode protects the discount. Update `docs/qa-report.md`. Merge when green and tell me the production URL to check.

## Order

A → merge → B → merge → C → merge → D → E → merge → F → merge. Stop and tell me after C so I can test the Black Box flow on my phone.
