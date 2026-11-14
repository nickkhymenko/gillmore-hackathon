# UI Extras: make it feel like a real product (apply on top of 07-UI-BUILD-PROMPT.md)

Read this together with `docs/07-UI-BUILD-PROMPT.md`. Where they overlap, **this file wins**. Same rules: lint + build + commit + push after each step, never commit `.env.local`, never use em or en dashes in UI copy, no Doctapet logo, name or copy (our brand is Prevently).

## A. "Not AI-looking" design rules (apply everywhere)

- **No:** purple/blue gradients, glassmorphism, glowing blobs, emoji as icons, generic "AI sparkle" icons, centred-everything layouts, stock 3D illustrations, rounded-2xl cards on every element.
- **Yes:** editorial layouts (asymmetric grid, big type next to small captions), real photography, a subtle film-grain overlay (CSS noise SVG at ~4% opacity), hairline 1px dividers, numbered sections (`01 / Healthspan`), tabular numbers for stats, restrained motion (ease-out, 300 to 600ms).
- **Public style packs to use** (all free, open licences):
  - `shadcn/ui` (Radix primitives) for dialogs, sliders, tabs, toggles, sheets; restyle to our tokens.
  - Icons: `@phosphor-icons/react` (has `PawPrint`, `Heartbeat`, `Bone`, `Cat`, `Dog`, `Rabbit`, `Horse`), fall back to `lucide-react`.
  - Fonts via `next/font/google`: `Inter Tight` (UI and headlines) + `Instrument Serif` italic for a few editorial accent words (e.g. "*healthier* years").
  - Motion: `motion` (`motion/react`). Smooth scrolling: `lenis` (disable on reduced motion).
  - Charts: `recharts`, styled flat (no default colours, no gridline clutter).
  - Optional: one LottieFiles animation of a walking dog for the loading state (free licence), via `lottie-react`. Skip if it looks cheesy.
- **Photography:** use the free Dog CEO API (`https://dog.ceo/api/breed/{breed}/images/random`, no key) for breed photos, and the owner's own uploaded photo wherever possible. Configure `next.config.ts` `images.remotePatterns` for `images.dog.ceo`. For cats, use the owner's photo or a tasteful illustrated fallback.

## B. Public pet data (use it, cite it)

- **TheDogAPI** (`https://api.thedogapi.com/v1/breeds`) and **TheCatAPI** (`https://api.thecatapi.com/v1/breeds`): public breed data (life span range, weight range, temperament, origin). Works without a key for breed lists; add optional `DOG_API_KEY` / `CAT_API_KEY` env vars if rate limited. Fetch server-side, cache with Next's caching, and **merge with our local `src/data/breeds.ts`** so the demo works offline.
- Keep the study-based evidence and citation rules from `07` (Teng et al. 2024 dogs and cats, VetCompass, Kealy et al. 2002, PDSA PAW). Show source footnotes on every number.

## C. Photo-to-Pet-Twin (the wow moment) : do this right after Step 0

The owner uploads or takes a photo early in onboarding (move the photo step to **second**, right after the name). The whole UI then **re-themes around that pet in real time**.

1. **Instant colour theme (client-side, no AI, under 200ms):** draw the photo to a canvas, extract 3 to 5 dominant colours (simple k-means or median cut, write it yourself in `src/lib/palette.ts`, no heavy deps). Derive tokens: page tint (very light version of the coat colour), accent (most saturated colour, adjusted for WCAG AA contrast against text), and a dark shade. Animate the CSS variables changing (`transition` on custom properties via `@property`). The page visibly "takes on" the pet's colours while the user watches.
2. **Pet Twin profile via Gemini vision (`POST /api/twin`):** send the compressed photo + name + species. Gemini returns JSON: `{ species, breedGuess, breedConfidence, sizeClass, coatColours[], coatPattern, earShape: "upright"|"floppy"|"semi", muzzle: "short"|"medium"|"long", bodyCondition: "under"|"ideal"|"over"|"unknown", ageGuess: "puppy"|"adult"|"senior", notes }`. Low thinking, 10s timeout, rules fallback that asks the user to pick instead. Show the guesses as editable chips ("Looks like a **Labrador**, 82% sure. Not right? Change"). Never present it as a diagnosis; body condition shown as "looks lean / ideal / a bit heavy, confirm with your vet".
3. **Generated pet avatar (SVG, no image generation):** build `src/components/PetAvatar.tsx`, a clean flat illustrated portrait assembled from parts: head shape by muzzle type, ears by `earShape`, coat colours and pattern (solid, bicolour, tabby stripes, spots, tuxedo) from the twin profile, size by `sizeClass`. Cats and dogs at minimum, rabbit and horse as simple variants. The avatar appears in the header, the walk, and the dashboard, and gently animates (blink every few seconds, ear twitch on hover). Reduced motion: static.
4. **Everything downstream adapts:** breed risks, healthspan range, starter chat questions, scan instructions, copy tone (puppy vs senior), and illustrations all come from the twin profile + onboarding answers.

## D. The Walk (upgrade Step 2 of 07)

- The paw that follows scroll is **this pet's paw**, tinted with its accent colour, leaving prints along an SVG trail. Cats leave smaller, rounder prints; dogs larger with claw marks; horses hoof prints; rabbits long hind prints.
- The path winds between the numbered stops; at each stop the avatar "sits" next to the section (small offset animation).
- Background subtly shifts like a walk: morning light at the top, a park-green tint mid-page, warm evening tones at the bottom (very subtle, within the pet's palette).
- A sticky mini progress bar of paw prints at the top shows how far along the walk the user is, with stop names on hover.
- Final stop: "Same time next week?" with a big button to schedule the weekly scan reminder (add to calendar `.ics` download) and the streak/discount meter.

## E. Make every page actually work (full working site)

- Routes: `/` (landing + onboarding), `/twin` (the walk), `/scan` (video scan: `getUserMedia` camera preview, 15s record with countdown ring, upload to `POST /api/scan` which returns mock ML JSON until `ML_API_URL` is set; results animate into the twin charts), `/checkin` (existing quick form, restyled), `/ask` (full-page chat, also embedded on the walk), `/vet` (vet view: brief, clip placeholder, trend charts, "accept consult"), `/partner` (insurer and underwriter view), `/pet` (history).
- Empty, loading and error states for every page. No dead buttons: anything not implemented opens a tasteful "Coming in the pilot" sheet.
- Persist everything in browser storage through `src/lib/store.ts` so the demo survives refreshes; a "Reset demo" link in the footer; a hidden `?demo=biscuit` and `?demo=miso` URL that instantly loads a fully populated dog or cat for the pitch.
- Performance: Lighthouse 90+ on mobile for `/` and `/twin`; lazy-load charts and Lottie; `next/image` everywhere.
- Accessibility: keyboard navigable onboarding, focus rings in accent colour, alt text, AA contrast after re-theming (clamp the derived colours).

## Order of work

0 (from 07) → **C** → 1 (from 07, with photo second) → 2 + **D** → 3 (chat) → **E** → 4 (polish + partner) → final summary.
