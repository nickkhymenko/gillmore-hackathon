# Game Plan: Gillmore Hackathon 2026 (14 to 15 Nov, WBS)

> Goal: win on all six judging criteria with a **working, live-demoable product** plus a **business case judges can poke at**.
> Our core concept is **Prevently** ("prevention that pays"). It is deliberately modular so we can reframe it to whichever problem statement is released at 10:00.

---

## 1. How we win (the thesis)

Most teams will show either (a) a slide-only business idea or (b) a chatbot. We show **both a working AI product and a financial mechanism**:

1. **A live product** a judge can use on their own phone (QR code on the slide).
2. **A non-obvious insight**: the pet-care system is *reactive* because the person who pays for prevention (the owner, today) is not the one who benefits most (the insurer and vet group, later). Prevently **moves the money** so prevention pays for itself.
3. **Numbers judges can play with**: live partner ROI sliders built on figures from the official reading guide.
4. **Safety and regulation answered before they ask**: deterministic safety layer, vet-in-the-loop, no diagnosis.
5. **Fits Doctapet's rails**: plugs into their AI triage, online consults and white-label platform, so Ram Kumar (Doctapet founder, judge) sees an obvious next product for them.

---

## 2. Team roles (3 people)

| Role | Owner | Owns in repo | Owns in pitch |
|---|---|---|---|
| **Builder** (tech lead) | Person A | `src/app/api/`, `src/lib/`, deploys, env vars, CI | Live demo driver, technical Q&A |
| **Product and Demo** (UX) | Person B | `src/app/*/page.tsx`, `src/components/`, demo scenarios | Slides design, diagrams, demo script |
| **Business and Pitch** (strategy) | Person C | `docs/`, `pitch/`, research, Lean Canvas, numbers | Lead presenter, market, model, Q&A on business |

Everyone presents part of the pitch. Everyone can answer "what is it and why now" in 15 seconds.

---

## 3. Timeline mapped to the official schedule

### Day 1 (Sat 14 Nov)

| Time | All / A / B / C |
|---|---|
| 10:00 to 10:30 | **Kickoff.** C writes every problem statement verbatim into `docs/problem-statements.md`. A and B listen for constraints (data available? target users? must-use tech?). |
| 10:30 to 11:00 | **Choose the statement** using the scoring matrix (section 5). Then apply the pivot map (section 6). Decision by 11:00, no later. |
| 11:00 to 11:15 | C: paste the research prompt (`docs/04-RESEARCH-PROMPT.md`) into a second AI chat **with the chosen statement filled in**. A: deploy to Vercel, set `GEMINI_API_KEY`, confirm `/api/health` says `gemini`. B: re-skin copy for the chosen statement. |
| 11:15 to 11:30 | Break. Quick sync: 3 bullet stand-up. |
| 11:30 to 12:30 | **Sprint 1.** A: adapt the AI prompt and schema to the statement. B: adapt the check-in flow. C: problem and insight slides with sources. |
| 12:30 to 13:00 | **Lean Business Model Canvas** session: C and B attend and fill `docs/lean-canvas.md` live. A keeps building. |
| 13:00 to 14:00 | Lunch. Merge all open PRs. Tag `v0.5-day1-lunch`. |
| 14:00 to 16:15 | **Mentor rounds** (section 7). Max 15 minutes each, 3 prepared questions each. Rotate: one person meets the mentor, two keep building. |
| 16:30 to 18:00 | **Sprint 2.** Lock the demo flow. Deck v1 (all slides exist, even if ugly). Record a rough 60-second demo video as backup. |
| 18:00 | Merge, tag `v0.9-day1`. Write tomorrow's 3 priorities in `docs/standup.md`. Sleep. |

### Day 2 (Sun 15 Nov)

| Time | Focus |
|---|---|
| 9:00 to 10:00 | Bugs and polish only. Deck v2. First timed run-through (stopwatch, 6:00 hard stop). |
| 10:00 to 11:00 | **Dry-run the pitch to a mentor** (Chris Wilkinson or Rajni Kant ideal). Capture every question they ask into the Q&A bank. |
| 11:00 to 11:30 | Pitching techniques session. Apply at least one change immediately. |
| 11:45 | **CODE FREEZE 12:00.** Tag `v1.0-pitch`. Only hotfixes via the freeze rule in `CONTRIBUTING.md`. |
| 12:00 to 13:00 | 3 full rehearsals. Record final backup demo video. Export deck to PDF. Charge laptops and phones. Test the venue Wi-Fi and phone hotspot. |
| 14:00 to 16:30 | **Present.** 6 min pitch + 3 min Q&A. |

---

## 4. Judging criteria: what we show for each

| Criterion | What judges must see | Where |
|---|---|---|
| **Innovation and Creativity** | Pet vs. *its own* baseline (not population), 60-second multimodal check-in, and a shared-savings credit mechanism that realigns who pays for prevention | Slides 3 to 4, demo |
| **Relevance** | Direct hit on the reading guide themes: prevention over treatment, cost of care (+75%), insurance (£1.23bn claims), AI triage, white-label platforms | Problem slide, every number sourced |
| **Value Proposition** | One clear benefit per stakeholder: owner (early warning, credits), vet (pre-triaged brief, retention), insurer (lower claim cost, engagement), Doctapet (new B2B2C product on existing rails) | Value slide |
| **Feasibility and Realism** | It runs today. Safety layer, vet-in-the-loop, no diagnosis, UK GDPR, FCA handled by insurer partner. Pilot plan with measurable KPIs | Demo + feasibility slide |
| **Market and Competitive Awareness** | Competitor map (telehealth, wearables, insurer wellness, practice apps) and our gap: the only one closing the financial loop | Market slide |
| **Presentation and Defence** | Tight story, live demo, rehearsed Q&A bank, every member speaks | Whole pitch, `docs/03-PITCH-AND-QA.md` |

---

## 5. Problem statement scoring matrix (use at 10:30)

Score each statement 1 to 5 on each row, multiply by weight, pick the highest. Time-box: 20 minutes.

| Factor | Weight |
|---|---|
| Fit with Prevently core (check-in, baseline, safety, credits) | 3 |
| Can we demo something real by Day 2 noon? | 3 |
| Room for an original angle (few teams will do it the same way) | 2 |
| Strong numbers available (reading guide + research) | 2 |
| Resonates with these judges (Doctapet, investor, enterprise, design) | 2 |

Tie-break: pick the statement with the clearest **paying customer**.

---

## 6. Pivot map: reframing Prevently to the statement

| If the statement is about... | Lead with | Emphasise in demo | Add if time |
|---|---|---|---|
| **Cost of care / affordability** | "Catch it at £50, not £685" | Amber routes to online consult first; credits wallet | Annual cost forecast by breed and age |
| **Insurance / claims** | Shared savings for insurers | Partner ROI sliders, early-warning queue | Claims-linked outcome tracking, anti-gaming checks |
| **Vet practice efficiency / workforce** | Vet brief saves consult minutes | Vet brief, triage queue | Practice dashboard with appointment slotting |
| **Prevention / owner engagement** | Weekly habit + streaks | Check-in flow, trend chart | Reminders, seasonal risk nudges (ticks, heat, fireworks) |
| **AI triage trust and safety** | "AI can escalate, never downgrade" | Safety override on the cat emergency scenario | Audit log, confidence and human review queue |
| **Retailers / labs / pet brands** | Triggered, relevant offers | Credits redeemed for test kits | At-home lab kit triggered by amber flags (e.g. urine test) |
| **Independent vs. group practices** | White-label so independents compete | Branded app shell | Multi-tenant theming |
| **Something else entirely** | Keep the architecture (AI + safety rules + partner economics), swap the domain module | Same flow, new content | |

---

## 7. Mentor strategy (Day 1, 14:00 to 16:15)

Go to each mentor with **three specific questions**, not "what do you think?". Log answers in `docs/mentor-notes.md`.

| Mentor | Why them | Ask |
|---|---|---|
| **Ram N Kumar** (Founder, Doctapet; Honorary Research Fellow, WBS) | Domain owner, judge | Where does triage lose users today? Would insurers pay per engaged pet? What data could a pilot realistically access? |
| **Aradhna Rai** (Director of Design, Doctapet) | UX of the check-in | Is 9 questions + photo really 60 seconds? What makes owners come back weekly? How should red alerts look? |
| **Chris Wilkinson** (Warwick Enterprise) | Lean canvas and pitch | Is our riskiest assumption the right one? Does the story land in 30 seconds? |
| **Rajni Kant** (Founder and Investor) | Investor lens | Is shared-savings pricing credible? What would you need to see in a pilot? Who buys first? |
| **Ashish Tulsian** (Founder, Restroworks) | B2B SaaS operator | How do we sell into large groups vs. independents? What breaks at scale? |
| **Łukasz Rzeczkowski** (Founder, LinkGevity) | Judge only (no mentor slot) | Prepare for health-tech and longevity questions: evidence, validation, data quality |

---

## 8. Definition of done (Day 2, 12:00)

- [ ] Public URL works on a judge's phone; QR code on the title and demo slides
- [ ] `/api/health` reports `gemini` (live AI) on the production URL
- [ ] 3 demo scenarios work end to end in under 90 seconds total
- [ ] Partner ROI page loads with defaults that tell the story
- [ ] Deck exported to PDF in `pitch/` and on 2 laptops + 1 USB
- [ ] 60-second backup demo video recorded (in case Wi-Fi dies)
- [ ] Q&A bank rehearsed, each person owns 5 questions
- [ ] `v1.0-pitch` tag on `main`

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Wi-Fi fails during demo | Rules-engine demo mode runs without AI; phone hotspot; backup video |
| AI returns odd output on stage | Use the 3 rehearsed scenarios only; safety floor; temperature 0.2; structured JSON schema |
| Merge conflicts late on Day 2 | Ownership zones, small PRs, code freeze 12:00 |
| Scope creep | Section 6 "Add if time" column only after definition of done is green |
| Over-claiming medical accuracy | Language: "triage and monitoring support", never "diagnosis" |
