import { expect, test } from "@playwright/test";
import { DEFAULT_BUSINESS, businessCase } from "../../src/lib/partnerModel";

// The partner model must reproduce the Insurer Case sheet of finance/petra-financial-model.xlsx (Base scenario),
// as quoted in docs/15-MARKET-FINANCIALS-PITCH.md section 5.
test("defaults reproduce the financial model's insurer case", () => {
  const b = businessCase(DEFAULT_BUSINESS);
  expect(DEFAULT_BUSINESS.pricing).toBe("hybrid");
  expect(b.engaged).toBe(30_000);
  expect(Math.round(b.claimsAvoided / 1000)).toBe(965);
  expect(Math.round(b.retentionValue / 100) * 100).toBe(236_700);
  expect(b.fixedFee).toBe(360_000);
  expect(Math.round(b.outcomeFee / 1000)).toBe(145);
  expect(Math.round(b.discounts)).toBe(466_800);
  expect(Math.round(b.net / 1000)).toBe(230);
  expect(b.returnOnCost.toFixed(2)).toBe("1.24");
  expect((b.breakEven * 100).toFixed(1)).toBe("8.6");
  expect(b.memberSaving.toFixed(2)).toBe("15.56");
});

test("pricing models change Petra's fee and the net benefit, never the claims avoided", () => {
  const cases = (["perPolicy", "perMember", "perClaimAvoided", "hybrid"] as const).map((pricing) => businessCase({ ...DEFAULT_BUSINESS, pricing }));
  expect(new Set(cases.map((c) => Math.round(c.claimsAvoided))).size).toBe(1);
  const [perPolicy, perMember, perClaim, hybrid] = cases;
  expect(hybrid.fees).toBeGreaterThan(perMember.fees);
  expect(perMember.fees).toBe(360_000); // £1 per engaged member a month
  expect(perPolicy.fees).toBe(360_000); // £0.30 a policy a month on 100,000 policies
  expect(Math.round(perClaim.fees / 1000)).toBe(145); // 15% of measured savings
  // Per policy pays for everyone, so it only matches per member at 30% engagement.
  const busier = { ...DEFAULT_BUSINESS, engagement: 0.5 };
  expect(businessCase({ ...busier, pricing: "perPolicy" }).fees).toBeLessThan(businessCase({ ...busier, pricing: "perMember" }).fees);
});

test("break-even is the claims reduction where the net benefit is zero", () => {
  const b = businessCase(DEFAULT_BUSINESS);
  const atBreakEven = businessCase({ ...DEFAULT_BUSINESS, claimsReduction: b.breakEven });
  expect(Math.abs(atBreakEven.net)).toBeLessThan(1);
  expect(businessCase({ ...DEFAULT_BUSINESS, claimsReduction: 0.05 }).net).toBeLessThan(0); // the downside is negative
});
