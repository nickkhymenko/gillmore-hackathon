# Pitch (6 minutes) and Q&A Bank (3 minutes)

## Slide-by-slide script

| Time | Slide | Speaker | Content |
|---|---|---|---|
| 0:00 to 0:30 | 1. Hook | C | "Meet Biscuit, an 8-year-old Labrador. For three weeks he drank a bit more and was slow getting up. Nobody noticed, because nobody was looking. By the time he saw a vet it was an emergency and a claim. The average UK pet insurance claim is £685." QR code on screen. |
| 0:30 to 1:15 | 2. Problem and insight | C | Vet prices +75% in 10 years, twice inflation. £1.23bn in claims in 2024. **Insight:** prevention is paid for by the owner now; the savings go to the insurer later. Between annual visits, nobody watches the slow drift. |
| 1:15 to 2:00 | 3. Solution | B | "Prevently: prevention that pays." 60-second weekly check-in, compared with the pet's own baseline, routed to the right care, rewarded with credits funded from avoided claims. The 4-step loop graphic. |
| 2:00 to 3:30 | 4. Live demo | A drives, B narrates | (1) Subtle drift scenario: amber, "19 points below Biscuit's own baseline", vet brief. (2) Cat emergency: safety layer forces red even if the AI hesitated. (3) Partner page: drag the engagement slider, show break-even at 6.7%. |
| 3:30 to 4:15 | 5. Business model | C | B2B2C via Doctapet white-label. £1 per engaged pet per month + partner-funded credits. Break-even at a 6.7% claim reduction; 10% gives about 1.5x ROI. Assumptions stated. |
| 4:15 to 5:00 | 6. Market and competition | B | 2x2: telehealth, practice apps, wearables, insurer wellness. All reactive or single-stakeholder. We are preventive and close the financial loop. |
| 5:00 to 5:30 | 7. Feasibility and safety | A | Runs today. AI can escalate, never downgrade. No diagnosis (Veterinary Surgeons Act). Prescribing stays with vets via Doctapet. GDPR consent. Insurer owns the credits under FCA rules. |
| 5:30 to 6:00 | 8. Pilot and ask | C | 12-week pilot: 1 insurer, 5 practices, 2,000 pets. KPIs on screen. "Prevention that pays: for owners, vets and insurers." |

**Rules:** one idea per slide; big numbers; every number has a source footnote; never read slides; hand-offs rehearsed; stop at 5:50.

**Backup:** if the live demo fails, say "here is the recording from this morning" and play the 60-second video without apology.

---

## Q&A bank (each person owns about 5)

### Product and AI (Person A)

**Q: Isn't this just a symptom checker?**
A symptom checker is a one-off, when the owner is already worried. We are longitudinal: each pet is compared with its own baseline every week, so we catch drift *before* the owner is worried. And we attach money to prevention.

**Q: What if the AI is wrong?**
Three layers. Deterministic red-flag rules run first and set a minimum urgency. The AI can escalate but never downgrade. Every amber or red goes to a human vet. We are deliberately biased toward caution, and the pilot measures false positives with vet review.

**Q: How accurate is it?**
We do not claim diagnostic accuracy and do not diagnose. The pilot validates flags against vet outcomes. The value is in *earlier contact with a vet*, which is a measurable behaviour change.

**Q: Why Gemini / can you switch models?**
Multimodal (photo + text), structured JSON output, low cost per call. The AI sits behind one function, so switching provider is a one-file change.

**Q: What does it cost to run?**
A check-in is one short AI call: pennies or less. That is tiny against a £1 per pet per month fee.

### Business (Person C)

**Q: Why would an insurer pay?**
Break-even needs only a 6.7% reduction in claim cost among engaged pets (from the reading guide's £685 average claim and claim frequency). Plus a weekly touchpoint improves retention, which insurers value independently.

**Q: Where does the 10% reduction come from?**
It is an assumption, clearly labelled, and the slider shows sensitivity. The pilot is designed to measure it against a matched control group.

**Q: Who is your first customer?**
An insurer already partnering with Doctapet, targeting owners of senior dogs and cats, where chronic conditions (kidney, joint, endocrine) drive claims and early signs are detectable.

**Q: Why will owners keep doing it weekly?**
60 seconds, credits with real value, streak bonuses, and a trend chart of their pet's health. Design pilot target: 50% 4-week retention.

**Q: How do you make money if the insurer builds it themselves?**
They would need triage, vet network, prescribing and an app: that is Doctapet's platform. We ride on rails that already exist.

### Regulation and ethics (Person A or C)

**Q: Is this legal under vet regulation?**
Yes, because we do not diagnose or prescribe. Only vets do that, through Doctapet's existing regulated consult and prescribing flows.

**Q: Isn't paying people for check-ins an inducement?**
Credits are the insurer's own wellness benefit, small and capped, reviewed under Consumer Duty fair-value rules. Many insurers already offer wellness benefits.

**Q: Data privacy?**
Pet data plus minimal owner data, explicit consent for photos and partner sharing, UK/EU hosting, DPIA before pilot.

**Q: Could owners game it?**
Credits are small and capped; photo evidence for bonuses; inconsistent answer patterns are flagged. Gaming a weekly check-in still produces a more engaged owner.

### Market and Doctapet fit (Person B or C)

**Q: How is this different from Joii / FirstVet?**
They are excellent at the consult, which is reactive. We are the layer before the consult that decides *who* needs one and *when*, and we feed them better-briefed cases.

**Q: Why Doctapet?**
They already have AI triage, online consults, digital prescribing and white-label integration with insurers and practices. Prevently is the prevention front door to that funnel.

**Q: What about wearables?**
Wearables need hardware most owners don't buy. We work with a phone. In the roadmap, wearable data enriches the baseline when available.
