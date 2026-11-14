# Petra: the 90-second demo

Live site: https://gillmore-hackathon.vercel.app

This is the path the golden-path test walks (`tests/e2e/golden-path.spec.ts`, at 390px and 1440px). If you follow it click by click, you are on tested ground.

## Before you go on stage

1. Open the live site in Chrome and tap **Reset demo** in the footer. You land on the landing page with nothing stored.
2. Have a photo of a dog ready on the device (a golden or brown dog re-themes the page most visibly).
3. Open a second tab at `/?demo=biscuit` and leave it. That is your safety net (see "If something goes wrong").
4. Check `/api/health` says `"aiMode":"gemini"`.

## The path (about 90 seconds)

| Time | Where | Click | Say |
|---|---|---|---|
| 0:00 | `/` | Tap the **Dog** card. Type a name, press Enter. | "One question at a time." |
| 0:08 | Photo step | Tap the photo box, choose the photo. The page takes on the dog's colours. Tap **Looks right, continue**. | "One photo and the whole app becomes theirs." |
| 0:20 | Breed, age, weight | The breed from the photo is already picked: tap **Continue** three times. | |
| 0:26 | Activity, consent | Tap **Moderate**. Turn on **Share engagement with my insurer**. Tap **Start the walk**. | "Sharing is off until you turn it on." |
| 0:32 | `/walk` | Scroll down: hello, their walk, the check-in, the lifetime chart, the healthy dog. Keep scrolling to "Now, about {name}'s insurance…". The poo, the number and the button are on one screen. Tap **Pick it up**. | "Owners like you could save up to £X a year. Your premium ignores the care you already do." |
| 0:47 | `/savings` | The Walk Companion. Scroll to "Take {name} for a walk" and tap **Start a walk**. 35 minutes replay in about 15 seconds: the map draws the route, the minutes count up, the price ticks down. | "It shares walking minutes, never location. It can only lower the premium." |
| 1:05 | `/savings` | Tap **Continue**, then **Try it today**, then **Join Petra Plus**. The tick lands, the **Plus** badge appears in the header. Tap **Go to your dashboard**. | "One step to join." |
| 1:12 | Dashboard | Tap the **Walks** tab and scroll to **Pet Scanner**. Tap the clip **Healthy dog on a city walk**. The scan line sweeps, the 21 body points appear and join up, the counters and the head and hip traces run. Tap **Analyse**. | "A pose model finds 21 body points and compares every step. Signs worth a vet's look, never a diagnosis." |
| 1:25 | Dashboard | Tap the **Savings** tab: the member offers. | "Example partners. The discount never depends on buying anything." |

Short on time? Skip onboarding: start at `/?demo=biscuit`, then go to `/walk?replay=1` and carry on from 0:32.

The "wow" variant for the Pet Scanner: tap **All clips**, then the **Worth watching** black cat. Analyse gives the model's own amber result with the leg to watch (hind left).

## Reset links

| Link | What it does |
|---|---|
| `/?demo=biscuit` | Loads Biscuit, a Labrador with 12 weeks of history, and opens his dashboard. Every number agrees: health score 74, a 12-week streak, target met in 10 of 12 weeks, 12.5% off, about £15.76 saved. It also clears Biscuit's earlier scans and membership, so it is a clean start every time. Your own pets are untouched. |
| `/walk?replay=1` | Jumps straight to a fresh poo moment on the walk. The poo also resets on every refresh. |
| `/dashboard#pet-scanner` | Opens the dashboard on the Walks tab, scrolled to the Pet Scanner. |
| **Reset demo** (footer, every page) | Clears everything Petra keeps in this browser: pets, photos, check-ins, walks, scans and the Petra Plus membership. Goes back to the landing page. The toast offers Undo for a few seconds. |
| **Delete all my data** (footer) | The same clear-out, with a confirmation first. This is the owner-facing one. |

## If something goes wrong

- **The photo reader is slow or down.** The page still re-themes from the photo, because the colours are read on the device. Tap **Looks right, continue** and pick the breed by hand. Nothing else in the path needs the AI.
- **You are lost mid-demo.** Switch to the tab with `/?demo=biscuit`, or load it again. Then `/walk?replay=1` for the poo, or `/dashboard#pet-scanner` for the scanner.
- **A page looks stuck.** Refresh. State is kept in the browser, so you carry on where you were.

## If the Wi-Fi fails

Everything except the photo reader, the weekly check-in's AI wording, Ask Petra and the map tiles runs in the browser from static files, so a local copy does the whole path without the internet.

**Not rehearsed yet:** the golden path was tested on a local build with the internet on. Run it once with Wi-Fi off before the event, so the list below is confirmed on the demo laptop.

1. **Before the event**, on the demo laptop, from a clean clone:
   ```
   git clone https://github.com/nickkhymenko/gillmore-hackathon && cd gillmore-hackathon
   npm ci && npm run build && npx next start -p 3000
   ```
   Leave it running and open `http://localhost:3000/?demo=biscuit` once, so the pages and the two example clips are cached.
2. **First choice if Wi-Fi drops:** tether to a phone hotspot and keep using the live site.
3. **No signal at all:** use `http://localhost:3000`. What changes offline:
   - Photo step: the colours still come from the photo. The breed guess does not arrive (after a wait of up to 10 seconds you see "We could not reach the photo reader"), so pick the breed by hand, or start from `/?demo=biscuit` and skip onboarding.
   - Example walk: the route, minutes and price all work. The map background is blank because the map tiles cannot load.
   - Weekly check-in: answers come from the built-in safety rules instead of the AI. Red flags still escalate.
   - Pet Scanner, the poo moment, sign-up, the dashboard and the offers: unchanged.
4. **Last resort:** a screen recording of this path. Record one from the live site the evening before and keep it on the laptop.

## What is real and what is illustrative

- Real: the photo palette and re-theming, the Gemini photo reader and check-in, the safety rules, the pose-model keypoints on the two example clips (DeepLabCut SuperAnimal-Quadruped, run offline) and the gait numbers computed from them.
- Illustrative, and labelled so on screen: premiums, discounts and savings, the example walk, the Walk Companion data, the partner offers and the Petra Plus sign-up (nothing is charged, no details are taken).
- Honest limit: the owner's own uploads show "Live analysis of your own videos is coming in the pilot."
