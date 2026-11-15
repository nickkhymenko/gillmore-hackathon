# Petra: market deep dive (Day 2 research brief)

Labels: **Fact** = sourced. **Estimate** = our reasoning from sourced numbers. **Assumption** = pilot-tested lever. Say these words on stage when asked.

---

## 1. Market size

| | Figure | Source |
|---|---|---|
| UK pets | **36.5m**, in **62%** of households (about 18m homes) | UK Pet Food 2026 (Kantar, 8,951 interviews, Jan 2026) |
| Dogs / cats | **15.5m dogs** (up from 12.5m in 2021), **13.1m cats** | UK Pet Food 2026 |
| Dog households | **41%** of households (33% in 2021) | UK Pet Food 2026 |
| Insured policies | **4.6m** (record), about a third more than 2019 | ABI 2024 |
| Claims | **£1.23bn** paid, **1.8m** claims, **£685** average | ABI 2024 |
| Average premium | **£389** per pet per year (about £32 a month) | ABI 2024 |
| Market GWP | about **£2bn** a year | IBISWorld 2025 estimate / trade press |
| Insured share | about **61% of dogs, 46% of cats** | 2025, secondary source citing PDSA |
| Owner spend | **£1,900+** per pet per year; a medium dog roughly £1,000 to £2,500 a year | Hackathon reading guide; commercial estimates |

## 2. Our audience: younger owners

- **Fact:** younger adults now lead dog ownership. **58% of 25 to 34 year olds and 53% of 16 to 24 year olds** own a dog (up from 41% for both), vs 41% of households overall (UK Pet Food 2026).
- **Fact:** **69% of Millennials and Gen Z** see their pet as family (reading guide).
- **Fact (US, vendor-linked):** about half of Gen Z pet owners have insurance vs about 1 in 10 Baby Boomers (Healthy Paws, 2026). Other US surveys put Gen Z at 33% to 42%. **UK data by age is not public**: say so if asked, and that the pilot will measure it.
- **Estimate:** if about a third of the UK's 15.5m dogs live with owners under 35, that's about **5m dogs**. With dogs about 61% insured, about **3m insured dogs** sit with our core audience. (Assumption: the one-third share; validate with the paid UK Pet Food data report.)
- **Why them:** heaviest adopters of apps and wearables, most price-sensitive, most likely to switch at renewal, and the fastest-growing owner group. The car insurance analogy: black boxes were built for young drivers.

## 3. Affordability: why people struggle (and why some don't get pets)

- **Fact:** 2 in 5 owners say owning a pet is more expensive than expected; 51% worry about vet costs (PDSA PAW 2025).
- **Fact:** 52% are increasingly worried about affording vet bills and 33% about pet insurance (YouGov, Mar to Apr 2025, 6,272 adults).
- **Fact:** 20% of owners avoid the vet because of cost; 19% of uninsured owners think they don't need cover (Co-op Insurance, Sept 2025).
- **Fact:** 17% have considered giving up their pet due to financial strain (2025 survey).
- **Fact:** 62% of insured Which? members saw premiums rise last year; 53% of those called it unreasonable (Oct 2025).
- **Caveat:** no recent UK survey directly asks *non-owners* why they don't get a pet. Charities warn cost is a growing barrier (Vet Times). Say: "Cost is the top worry for owners, and charities warn it's now stopping people becoming owners."

## 4. Rising prices and the regulatory picture

**Prices**
- Vet prices **+75% in 10 years** (twice inflation), **+7.1% in 2025** (reading guide).
- Premiums rose about 21% between Feb 2023 and Mar 2024 (Insurance Times); premiums for pets over 6 rose **26%** in a year (Pearson Ham).
- In 2026 premiums have been **falling** on price competition (Defaqto: lifetime premiums down 4.7% in Q1 2026) while **claim costs keep rising** (reported about 20% higher). **Insurer margins are squeezed: they need fewer claims and better retention.**

**Regulation to know**

| Rule / body | What it means for Petra |
|---|---|
| **CMA vets market final report** (24 March 2026) | Forces price, treatment and prescription transparency; urges reform of the Veterinary Surgeons Act. Petra's earlier, cheaper routes (online consults) fit the direction. |
| **FCA 2026 insurance priorities** | Pet insurance is on the FCA's **watchlist for potential action**, citing price rises and weak consumer understanding. A discount-only, transparent product is on the right side of this. |
| **Consumer Duty** (fair value, clear communications, avoid foreseeable harm) | Our discount must be clearly explained and good value; no hidden penalties. |
| **GI pricing practices (price-walking ban)** | Applies to home and motor; **pet insurance is excluded** from the related renewal rules. So pet renewal prices can climb, which is exactly why owners feel overcharged and why a transparent, earned discount matters. |
| **FCA vulnerable customers guidance (FG21/1)** + **Equality Act 2010** (FCA has an MoU with the EHRC) | Product design and pricing must not disadvantage vulnerable or disabled customers. See section 9. |
| **UK GDPR / ICO** | Location is personal data: keep routes on the phone; granular consent; right to erasure. |
| **Veterinary Surgeons Act 1966**, RCVS | Only vets diagnose and prescribe; Petra flags "signs worth a vet's look". |

## 5. How UK underwriters price pet insurance (and where Petra fits)

- **Rating factors:** species, **breed** (pedigrees cost about 66% more than crossbreeds; some breeds over 3x others), **age** (often step-ups at age bands around 4 to 5 and 7 to 8; co-payments often start around age 8 for dogs), **postcode** (vet fees vary by area), cover type and limit, excess, pre-existing conditions and claims history.
- **Method:** group policies into cohorts (breed, age band, postcode, cover) and price each against its claims experience.
- **Where Petra fits:** a **behavioural discount layer on top** of the risk price, like a telematics discount on a car policy. It never replaces or raises the risk price. Over time, anonymised cohort data (activity vs claims) helps underwriters understand risk better, with the limits in section 9.

## 6. The wearable: sourcing, tracking and cost

**Sourcing plan**
1. **Pilot: phone first, no hardware.** The owner's phone records the walk (GPS) during a "walk session"; the app counts minutes. Zero cost, zero friction.
2. **Walk Companion v1: a BLE collar tag** (Bluetooth Low Energy chip, motion sensor, battery, waterproof case) that syncs through the phone. **White-label from an established pet-tracker manufacturer (ODM)** rather than building from scratch.
3. **Walk Companion v2: GPS + cellular (LTE-M)** for lost-pet tracking, like Tractive. Higher cost and a data plan.

**Tracking walks accurately**
- **Fact:** collar accelerometers are accurate off-lead (correlation with video-counted steps r = 0.80 for the FitBark) but **weaker on-lead** (r = 0.50) (Colpoys and DeCock, 2021). Whistle has validated behaviour classification on 2,500+ dogs (industry study).
- **So we don't rely on step counts alone.** A "walk" = phone GPS session (distance, duration) **+** collar motion confirming the dog was moving (active minutes, intensity) **+** a classifier trained on labelled walks. The Pet Scanner gait model checks movement quality separately.
- **Pilot validation:** compare against video and GPS ground truth; publish accuracy before any discount relies on it.

**Cost (estimates, need supplier quotes)**

| | BLE tag (v1) | GPS + LTE-M (v2) |
|---|---|---|
| Bill of materials | **about £8 to £15** (estimate) | **about £25 to £40** (cellular module alone $10 to $25, plus GNSS, antenna, power: vendor data) |
| Data cost | none (syncs via phone) | about £1 to £2 a month (estimate) |
| Market benchmark | | Tractive: tracker about £20 to £50; subscription **£4.50 to £7 a month** |

## 7. Who pays, and how much

**Recommendation: the insurer pays for the device; the owner pays nothing extra for the core product.** Same as telematics: black boxes are usually fitted free because the insurer gains from lower claims and better retention.

| Item | Who pays | Price (proposal) |
|---|---|---|
| Phone-first Petra (check-ins, walks, AI, scanner) | Insurer, via platform fee | **£1 per engaged member per month** |
| Walk Companion BLE tag | Insurer (free with a 2-year policy) | Sold to insurer at about **£20** (BLE) or **£40** (GPS) |
| Lost-pet GPS tracking | Owner (optional add-on) | **£2.99 a month** (undercuts Tractive's £4.50 to £7) |
| Outcome share | Insurer / underwriter | **15%** of measured claims savings vs a control group |

## 8. Value for each party (base case, 100,000 policies, 30% engaged)

| Party | Gains | Numbers |
|---|---|---|
| **Pet parent** | Lower premium, earlier care, lost-pet safety, partner offers | Average about **4% (£16 a year)**, up to **15% (£58 on £389)**; for Biscuit up to £52 a year |
| **Insurer** | Retention, acquisition of young owners, weekly touchpoint | Retention value about **£237k**; net benefit **£230k** a year |
| **Underwriter** | Lower claims cost and severity, less fraud, better risk insight | Claims avoided about **£965k** a year; break-even at about **8.6%** fewer claims |
| **Vets** | Earlier, pre-triaged cases; more consults and follow-ups | **Estimate:** if 10% of 30,000 engaged pets get one flag a year that leads to an online consult at about £35, that's about **£105k** of consult revenue, plus in-clinic follow-ups (assumption) |
| **Petra / Doctapet** | Fees, outcome share, devices, add-ons, partners | **£11.6m revenue, £3.2m EBITDA by 2031** (base case); break-even in year 3 |

## 9. Fairness limits and what to say

**The hard question: "Isn't this unfair to owners with limited mobility, older or disabled pets, or people who can't walk their dog much?"**

**Answer (say this):**
"We designed for that from day one. **First, it can only lower your premium, never raise it,** and nothing the app sees is ever used to add an exclusion. **Second, targets are personal,** set to the dog's breed, age and health, not a fixed step count, so a senior Pug and a young Collie can both earn the full discount. **Third, walking isn't the only way to earn it:** weekly check-ins alone earn part of the discount, and garden play, indoor enrichment, hydrotherapy, a dog walker or a family member's walks all count. **Fourth, Rest mode:** if a vet advises rest, targets pause and the discount is protected. And it's opt-in. That's how we meet the FCA's Consumer Duty and its vulnerable-customer guidance, and the Equality Act."

**Fairness rules (on the For insurers page):**
1. Discount-only: never a surcharge, never a cancellation, never a new exclusion.
2. Personal targets by breed, age and health.
3. Multiple ways to earn: check-ins, walks by anyone, alternative activity.
4. Rest mode protects the discount during illness or injury.
5. Location stays on the phone; the insurer sees only "target met: yes or no" and the tier.
6. Opt-in, with granular consent and a "Delete all my data" button.
7. Regular fairness audits: compare discount rates across age, breed and owner groups.

**Other tough questions**
- *"Couldn't owners game it?"* Discounts are small, capped and based on consistent patterns over weeks; the collar corroborates phone sessions; and gaming still means more walking.
- *"Will the data be used to price people up later?"* No. Our contract with the insurer limits use to the discount and anonymised research.
- *"What about cats?"* Cats get a play and enrichment plan, with check-ins and an indoor activity tag. The discount works the same way.

## 10. Making it a habit

- **Fact:** about **30% of wearables are abandoned within 6 months** (Endeavour Partners, widely cited); estimates range from 28% to 42%.
- **Fact:** linking rewards to a wearable raised activity by **34%** (RAND Europe, Vitality and Apple Watch).
- **Design for habit:**
  1. **Piggyback on an existing habit:** dog walks already happen daily. The tag tracks them passively, with zero extra effort.
  2. **Visible reward:** a live discount meter and "you saved £X" every month.
  3. **60-second weekly check-in**, a streak, and gentle reminders.
  4. **Personal content:** Pet Twin, walk tips and seasonal nudges (heat, fireworks, ticks).
  5. **Social and shared:** family and dog walkers on the same pet.
  6. **Rest mode** so illness doesn't break the streak or the discount.
- **Pilot KPI:** 4-week retention above 50%; weekly active above 30%.

## Sources

- UK Pet Food 2026: https://www.ukpetfood.org/resource/britain-s-dog-ownership-boom-as-15-5-million-dogs-now-live-in-uk-homes.html
- Pet Business World on dog ownership by age: https://www.petbusinessworld.co.uk/trade-news/manufacturers/uk-dog-ownership-rises-to-new-high.html
- ABI 2024: https://www.abi.org.uk/media-hub/news-post/insurance-payouts-for-pawly-pets-top-1-billion-for-third-year-in-a-row
- PDSA PAW mini report 2025: https://www.pdsa.org.uk/media/15783/pdsa-paw-mini-report-2025.pdf
- Global Pet Industry (YouGov, insurance shares): https://globalpetindustry.com/news/uk-pet-parents-face-rising-unexpected-costs-but-stay-committed-to-care-study-finds/
- Co-op Insurance: https://www.co-operative.coop/media/news-releases/the-pinch-of-pets-over-9-4-million-pet-owners-avoid-the-vet
- Vet Times (affordability concern): https://www.vettimes.com/news/vets/small-animal-vets/charity-voices-masked-affordability-concern-despite-fall-in-cost-worries
- Which? (rising costs): https://www.which.co.uk/news/article/uk-pet-owners-hit-hardest-by-rising-insurance-costs-how-to-save-on-cover-a4uxm1E5bm5y
- Which? (breed and postcode): https://www.which.co.uk/news/article/pet-insurance-prices-drop-but-breed-and-postcode-make-a-big-difference-ays3a8H4zbyD
- GoCompare (breed and postcode): https://press.gocompare.com/news/pet-insurance-costs-fall-but-breed-and-postcode-could-triple-what-you-pay
- Pearson Ham via Post (older pets +26%): https://www.postonline.co.uk/personal/7955062/insurance-premiums-for-older-pets-surge-by-over-a-quarter
- Defaqto via Insurance Business: https://www.insurancebusinessmag.com/uk/news/breaking-news/uk-pet-insurance-rates-fall-again-as-cost-pressures-mount--defaqto-574329.aspx
- Claim costs 20% higher: https://www.insurancebusinessmag.com/uk/news/claims/pet-insurance-clients-face-20-higher-claim-costs-despite-premium-falls-585137.aspx
- FCA 2026 insurance priorities: https://www.fca.org.uk/publication/regulatory-priorities/insurance-report.pdf
- Commentary on FCA and pet pricing: https://burning-cost.github.io/2026/03/25/pet-insurance-pricing-fca-watching
- FCA GI pricing practices (PS21/5) commentary: https://www.hsfkramer.com/en_US/notes/insurance/2021-06/fca-final-rules-on-general-insurance-pricing-practices-at-a-glance-guide
- FCA vulnerable customers guidance: https://www.fca.org.uk/news/press-releases/fca-launches-guidance-firms-fair-treatment-vulnerable-customers
- CMA final report (VBB): https://vbb.com/articles/uk-cma-concludes-veterinary-sector-market-investigation-and-announces-major-reforms/
- FitBark validation (Colpoys and DeCock 2021): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7999242/
- Tractive UK plans: https://tractive.com/en/c/plans?shopCountry=GB
- Cellular IoT module costs: https://community.hubble.com/comparisons/the-true-cost-of-cellular-iot
- Wearable abandonment: https://www.phonearena.com/news/One-third-of-wearable-buyers-abandon-their-device-within-six-months_id54699
- Healthy Paws generational insurance (US): https://www.healthypawspetinsurance.com/blog/pet-insurance-101/generational-differences-pet-care-insurance.html
- Vitality and RAND Europe: https://www.weforum.org/stories/2018/11/science-incentivize-behaviour-change-vitality-physical-exercise/
