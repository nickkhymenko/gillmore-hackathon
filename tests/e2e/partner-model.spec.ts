import { expect, test } from "@playwright/test";
import { DEFAULT_BLACKBOX, DEFAULT_BUSINESS, blackBoxCase, businessCase } from "../../src/lib/partnerModel";

// The partner model must reproduce the business case in docs/06-PS1-PLAN.md section 5.
test("defaults reproduce the docs/06 business case table", () => {
  const b = businessCase(DEFAULT_BUSINESS);
  expect(b.engaged).toBe(30_000);
  expect(Math.round(b.engagedClaims / 10_000) * 10_000).toBe(8_040_000);
  expect(Math.round(b.claimsAvoided / 1000)).toBe(804);
  expect(Math.round(b.retentionValue / 1000)).toBe(270);
  expect(Math.round(b.fee / 1000)).toBe(450);
  expect(Math.round(b.discounts / 1000)).toBe(270);
  expect(Math.round(b.net / 1000)).toBe(354);
  expect((b.breakEven * 100).toFixed(1)).toBe("9.0");
  expect((b.breakEvenWithRetention * 100).toFixed(1)).toBe("5.6");
});

test("pricing models change cost and net benefit, never the claims avoided", () => {
  const nets = (["perPolicy", "perMember", "perClaimAvoided", "hybrid"] as const).map((pricing) => businessCase({ ...DEFAULT_BUSINESS, pricing }));
  expect(new Set(nets.map((n) => Math.round(n.claimsAvoided))).size).toBe(1);
  expect(new Set(nets.map((n) => Math.round(n.fee))).size).toBe(4);
});

test("Black Box: bundled collar pays back in 10 months at £50; free collar cost is spread over 2 years", () => {
  const bundled = blackBoxCase({ ...DEFAULT_BLACKBOX, offer: "bundled" });
  expect(bundled.paybackMonths).toBe(10);
  const free = blackBoxCase(DEFAULT_BLACKBOX);
  expect(free.hardwareYear).toBe((free.members * 50) / 2);
  expect(free.members).toBe(15_000);
});
