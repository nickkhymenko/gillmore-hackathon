import { expect, test } from "@playwright/test";
import { noHorizontalScroll, seedPet, watch } from "./helpers";

// The dashboard never shows a saving the pet's own history cannot explain.

test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (r) => r.fulfill({ status: 204, body: "" }));
});

/** A pet that finished onboarding a moment ago: no check-ins, no walks. */
async function seedNewPet(page: Parameters<typeof seedPet>[0]) {
  await seedPet(page);
  await page.evaluate(() => {
    const h = JSON.parse(localStorage.getItem("prevently.household")!);
    h.pets[0].createdAt = new Date().toISOString();
    localStorage.setItem("prevently.household", JSON.stringify(h));
  });
}

test("a new pet with no history sees its potential, never weeks met or a saved amount", async ({ page }) => {
  const { errors } = watch(page);
  await seedNewPet(page);
  await page.goto("/dashboard");
  const card = page.getByTestId("savings-card");
  await expect(card).toHaveAttribute("data-state", "new");
  await expect(card.getByRole("heading")).toHaveText("Your discount starts with your first walk.");
  await expect(card.getByTestId("savings-potential")).toHaveText(/up to £\d+ a year/);
  await expect(page.getByTestId("health-score")).toHaveText("After your first check-in");
  await expect(page.getByTestId("streak")).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText(/saved £|of \d+ weeks|None yet/i);

  // Pairing the Walk Companion syncs six weeks of history, but a pet that joined today has not earned them.
  await page.getByRole("tab", { name: "Walks" }).click();
  await page.getByRole("button", { name: "Pair Petra Walk Companion" }).click();
  await expect(page.getByText("Paired (simulated for the demo)")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("price-saved")).toHaveText("Your saving starts after the first full week.");
  await expect(page.locator("#your-price")).toContainText("Petra Savings discount (0%)");
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(card).toHaveAttribute("data-state", "building");
  await expect(card).toContainText("up to £");
  await expect(card).not.toContainText(/saved £|\d of \d+ weeks/i);
  await noHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("?demo=biscuit: health score, streak, weeks met, discount tier and saved amount all agree", async ({ page }) => {
  const { errors } = watch(page);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/?demo=biscuit");
  await page.waitForURL((u) => u.pathname === "/dashboard" && u.search === "");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Biscuit", { timeout: 15_000 });

  // Twelve weeks of history everywhere: 12 check-ins in a row, 12 weeks counted, 10 with the target met.
  await expect(page.getByTestId("health-score")).toHaveText("74");
  await expect(page.getByTestId("streak")).toHaveText("12");
  const card = page.getByTestId("savings-card");
  await expect(card).toHaveAttribute("data-state", "walks");
  await expect(card.getByTestId("savings-weeks")).toContainText("Target met in 10 of 12 weeks");
  // 10 of 12 weeks is the 7.5% tier, plus 5% for a check-in every week.
  await expect(card.getByTestId("savings-pct")).toHaveText("12.5% off");
  // Saved so far is that tier on Biscuit's example premium for 12 of 52 weeks: £389 x 1.12^3 x 12.5% x 12/52.
  const expected = (389 * 1.12 ** 3 * 0.125 * 12) / 52;
  const saved = await card.getByTestId("savings-saved").textContent();
  expect(saved).toBe(`£${expected.toFixed(2)}`);

  // The Walks tab tells the same story with the same numbers.
  await page.getByRole("tab", { name: "Walks" }).click();
  const price = page.locator("#your-price");
  await expect(price).toContainText("Target met in 10 of 12 weeks (83%): 7.5%");
  await expect(price).toContainText("Weekly check-ins (100% of weeks): +5%");
  await expect(price).toContainText("Petra Savings discount (12.5%)");
  await expect(price.getByTestId("price-saved")).toContainText(saved!);
  await expect(page.getByText(/Target met in 10 of 12 weeks so far/)).toBeVisible();
  // And the amber week shows in both the check-in and the Walk Companion.
  await expect(page.getByText("A change worth a vet's look")).toBeVisible();
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByText("A few changes worth a vet's view for Biscuit")).toBeVisible();
  expect(errors).toEqual([]);
});
