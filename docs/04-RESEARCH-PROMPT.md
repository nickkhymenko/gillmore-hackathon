# Research Prompt (paste into a separate AI chat with web search / deep research on)

Fill in the `[PROBLEM STATEMENT]` line once statements are revealed at 10:00. If you run it before, leave it as "not yet known".

---

```text
You are a senior strategy consultant and technology analyst preparing a briefing pack for a
3-person student team competing in the Gillmore Hackathon 2026 at Warwick Business School
(14 to 15 November 2026, theme: "Pet Healthcare in the AI Era"). The hackathon is supported by
Doctapet (doctapet.ai), a UK company that builds and operates digital solutions for the veterinary
and wider pet-care industry: AI veterinary triage, online consultations, digital prescribing,
digital marketing and white-label integrated platforms for vet practices, insurers, pet brands,
retailers and laboratories (iOS and Android).

Our chosen problem statement: [PROBLEM STATEMENT, or "not yet known"]
Our working concept: "Prevently", a 60-second weekly AI pet health check-in that compares each
pet with its own baseline, routes early warnings into the right level of vet care (monitor /
online consult / emergency), produces a vet-ready brief, and rewards owners with "Prevention
Credits" funded by insurers and vet groups from the claims prevention avoids.

Judging criteria (equal weight unless stated): Innovation and Creativity; Relevance to theme and
problem statement; Value Proposition for business, partners and customers; Feasibility and Realism
(technical and regulatory); Market and Competitive Awareness; Presentation and Defence.
Format: 6-minute pitch + 3-minute Q&A. Judges include Doctapet's founder, a founder/investor,
a restaurant-tech SaaS founder, a health/longevity-tech founder and Warwick Enterprise.

RULES
- Use current, verifiable sources. Cite every factual claim with a link and the publication date.
- Prefer primary sources: Companies House filings, company websites and press releases, regulator
  publications (CMA, RCVS, VMD, FCA, ICO), ABI, PFMA / UK Pet Food, PDSA PAW Report, BVA, peer-
  reviewed papers, reputable market reports.
- Clearly separate FACT (sourced) from ESTIMATE (your reasoning) from UNKNOWN. Never invent numbers,
  customers, funding rounds or quotes. If you cannot find something, say so.
- UK focus first, then global context.
- Be concise: tables and bullets over prose.

PART 1: DOCTAPET DEEP DIVE
1. Company basics: legal entity, Companies House number, incorporation date, registered office,
   directors and founders (Ram N Kumar and others), headcount estimate, offices.
2. Financials: every filed set of accounts available (type of accounts, net assets, cash, any
   revenue/turnover disclosed), charges, share allotments, funding rounds, investors, grants.
3. Products: describe each (AI triage, online consults, digital prescribing, digital marketing,
   white-label platform). How does the triage work? Who uses it? Pricing model if public.
4. Customers and partners: named insurers, vet groups, retailers, labs, pet brands. Case studies,
   press releases, app store listings (ratings, review themes, download estimates).
5. Strategy signals: recent hires, job ads, blog posts, conference talks, patents, research
   collaborations (e.g. with Warwick Business School).
6. Likely strategic priorities and pain points for Doctapet in 2026, with reasoning.

PART 2: UK MARKET
1. Pet population (dogs, cats, other) and ownership trends 2019 to 2026.
2. Veterinary market size, number of practices (~5,000), consolidation (almost 60% in groups vs.
   10% in 2013): the major groups (IVC Evidensia, CVS Group, Medivet, Linnaeus/Mars, Pets at Home
   Vet Group, Independent Vetcare etc.), market shares, recent deals.
3. The CMA market investigation into veterinary services: timeline, findings, final decision status
   as of November 2026, remedies (price transparency, prescription fees, comparison tools) and what
   they mean for tech providers.
4. Vet workforce shortages and their effect on access and prices.
5. Pet insurance: market size, premiums, claims (£1.23bn paid 2024, average claim £685, ~1.8m
   claims/yr, ~4.6m policies), claim inflation, top insurers and shares, underinsurance rate, main
   claim conditions by species and age, insurer wellness/telehealth add-ons.
6. Owner spending (£1,900+ per pet per year): breakdown, affordability pressures, use of vet health
   plans (subscription preventive care plans) and their uptake.
7. Global pet industry (~$165.6bn projected 2026) and pet-tech / vet-tech market size and growth.

PART 3: COMPETITOR AND ANALOGUE MAP
Build a table (name, country, category, what they do, business model, funding, traction, strengths,
weaknesses, overlap with our concept) covering at least:
- Vet telehealth and triage: Joii, FirstVet, Vetster, Pawp, Airvet, Vet-AI and others.
- Practice client apps / PMS-adjacent: PetsApp, Vet practice portals, VetPartners tools, etc.
- Wearables and smart devices: Tractive, Whistle, FitBark, smart feeders and litter trays (e.g.
  Petivity, Litter-Robot), Petcube.
- AI pet health tools: pain/grimace detection from photos (e.g. Sylvester.ai), symptom checkers,
  AI scribes for vets, AI diagnostics in imaging and labs (IDEXX, Antech, Zoetis etc.).
- Insurers with prevention/wellness features (UK and international).
- Human-health analogues: Vitality (shared-value insurance), remote patient monitoring, digital
  front doors in NHS/private health. What worked and what failed, with evidence.
Then: a 2x2 positioning map (reactive vs. preventive, single-stakeholder vs. multi-stakeholder
financial loop) and where white space exists.

PART 4: REGULATION AND RISK (UK)
- Veterinary Surgeons Act 1966: what counts as diagnosis/treatment; where AI triage sits.
- RCVS Code of Professional Conduct, "under care" and remote prescribing guidance (2024 changes).
- Veterinary Medicines Directorate rules on prescribing and online sale of medicines.
- FCA rules relevant to insurer-funded wellness rewards, inducements, Consumer Duty, introducer /
  appointed representative models.
- UK GDPR / ICO guidance for pet + owner data, photos, AI, data sharing with insurers.
- UK AI regulation approach and any proposed Veterinary Surgeons Act reform (status in 2026).
- Liability and clinical governance models used by vet telehealth companies.

PART 5: EVIDENCE FOR PREVENTION
- Peer-reviewed or industry evidence that early detection/preventive care reduces cost or improves
  outcomes in dogs and cats (e.g. chronic kidney disease, diabetes, osteoarthritis, dental disease,
  obesity, urinary obstruction in male cats). Quantify where possible.
- Evidence on owner engagement with app-based health tracking (retention benchmarks).
- Evidence on behavioural incentives in insurance (Vitality-style) and their effect on claims.

PART 6: TECHNOLOGY LANDSCAPE (what to build with, Nov 2026)
- Best current multimodal LLMs and APIs for image + text triage (cost per call, latency, structured
  output support, free tiers for students): Google Gemini, Anthropic Claude, OpenAI, open models.
- Computer vision for pet health: body condition scoring from photos, gait/lameness from video,
  facial pain scales (Feline Grimace Scale, Canine pain scales), skin/eye conditions.
- On-device AI, speech-to-text for owner notes, wearables data APIs, vet PMS integration standards
  (e.g. common UK practice management systems and their APIs), FHIR-like vet data standards.
- Responsible AI patterns: safety rules layers, human-in-the-loop, evaluation of triage systems.
- Recommend a hackathon stack (fast to build, free tiers, easy to deploy and share) and justify it.

PART 7: IDEAS AND ANGLES
1. Give 10 original solution ideas (not existing products) relevant to the problem statement and
   Doctapet's capabilities. Score each 1 to 5 on the six judging criteria and buildability in 1.5
   days. Rank them.
2. Critique our "Prevently" concept like a sceptical judge: top 10 hard questions with strong answers,
   the weakest assumptions, and how to de-risk each.
3. Suggest 3 killer statistics and 1 human story for the opening 30 seconds (sourced).
4. Suggest pilot design and KPIs that an insurer and Doctapet would accept.

PART 8: JUDGES AND MENTORS (public professional information only)
For each, 2 to 3 lines on professional background and what they will likely care about in a pitch:
Ram N Kumar (Founder, Doctapet; Honorary Research Fellow, WBS), Aradhna Rai (Director of Design,
Doctapet), Ashish Tulsian (Founder, Restroworks), Chris Wilkinson (Warwick Enterprise), Lukasz
Rzeczkowski (Founder, LinkGevity), Rajni Kant (Founder and Investor).

OUTPUT FORMAT
1. Executive summary (10 bullets max) with the 5 facts we must say in the pitch.
2. Parts 1 to 8 as above, tables wherever possible.
3. Source list with dates.
4. "Gaps and uncertainties" section.
```
