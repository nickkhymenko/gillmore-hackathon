import { expect, test, type Page } from "@playwright/test";
import { noHorizontalScroll, seedPet, watch } from "./helpers";

/** Mocks Open-Meteo so weather-dependent copy is testable (no network, fixed temperature). */
async function mockWeather(page: Page, max: number) {
  await page.route("https://api.open-meteo.com/**", (route) => {
    const hours = Array.from({ length: 24 }, (_, h) => `2026-07-14T${String(h).padStart(2, "0")}:00`);
    route.fulfill({
      json: {
        current: { temperature_2m: max - 3 },
        hourly: { time: hours, temperature_2m: hours.map((_, h) => max - Math.abs(15 - h) * 0.8), precipitation_probability: hours.map(() => 5) },
        daily: { sunrise: ["2026-07-14T05:00"], sunset: ["2026-07-14T21:15"], temperature_2m_max: [max] },
      },
    });
  });
}

async function setBreed(page: Page, breed: string, species = "dog", extra: Record<string, unknown> = {}) {
  await page.evaluate(
    ({ breed, species, extra }) => {
      const h = JSON.parse(localStorage.getItem("prevently.household")!);
      Object.assign(h.pets[0].pet, { breed, species, ...extra });
      h.pets[0].profile.species = species;
      localStorage.setItem("prevently.household", JSON.stringify(h));
    },
    { breed, species, extra },
  );
}

test("senior Labrador: Kennel Club target, adjusted for age, split into walks, care first", async ({ page }) => {
  const { errors } = watch(page);
  await mockWeather(page, 12);
  await seedPet(page);
  await page.goto("/walk");
  const card = page.locator("#your-walk");
  await expect(card).toContainText("Given Biscuit's characteristics, here is their walk.");
  await expect(card).toContainText("More than 2 hours a day");
  await expect(card).toContainText("Senior: shorter, more frequent walks");
  await expect(card.locator("ul li", { hasText: "Midday" })).toBeVisible();
  await expect(card).toContainText("Weight: Labradors gain easily");
  await expect(card.getByRole("alert")).toHaveCount(0);
  // Seniors get healthspan before the money chart.
  const ids = await page.locator("section[id]").evaluateAll((s) => s.map((x) => x.id));
  expect(ids.indexOf("healthspan")).toBeLessThan(ids.indexOf("lifetime"));
  await noHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("French Bulldog: the walk tips lead with overheating", async ({ page }) => {
  await mockWeather(page, 24);
  await seedPet(page);
  await setBreed(page, "French Bulldog", "dog", { ageYears: 3, sizeClass: "small", pronoun: "she" });
  await page.goto("/walk");
  const card = page.locator("#your-walk");
  await expect(card).toContainText("here is her walk");
  await expect(card).toContainText("Overheating");
});

test("a cat gets a play plan, not walks", async ({ page }) => {
  await mockWeather(page, 15);
  await seedPet(page, { species: "cat" });
  await page.goto("/walk");
  const card = page.locator("#your-walk");
  await expect(card).toContainText("here is their play plan");
  await expect(card).not.toContainText("Best walk window");
});

test("'Make my insurance cheaper today' leads to the Black Box", async ({ page }) => {
  await mockWeather(page, 12);
  await seedPet(page);
  await page.goto("/walk");
  await expect(page.getByRole("link", { name: /Make my insurance cheaper today/ })).toHaveCount(2);
  await page.getByRole("link", { name: /Make my insurance cheaper today/ }).first().click();
  await page.waitForURL("**/savings");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Save on Biscuit's insurance with every walk.");
  await expect(page.locator("#compare")).toContainText("Your price today");
});

test("the poo moment: scroll to it, Pick it up, land on Savings", async ({ page }) => {
  const { errors } = watch(page);
  await mockWeather(page, 12);
  await seedPet(page);
  await page.goto("/walk");
  const moment = page.locator("#uh-oh");
  await moment.scrollIntoViewIfNeeded();
  await expect(moment).toContainText("You're probably overpaying for Biscuit's insurance.");
  await moment.getByRole("button", { name: "Pick it up" }).click();
  await page.waitForURL("**/savings");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Save on Biscuit's insurance with every walk.");
  await expect(page.getByText("First-time owner? Start lower.")).toBeVisible();
  await noHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("the poo moment resets on refresh: unpicked, then Pick it up lands on Savings", async ({ page }) => {
  const { errors } = watch(page);
  await seedPet(page);
  await page.goto("/walk");
  await page.reload();
  const moment = page.locator("#uh-oh");
  await moment.scrollIntoViewIfNeeded();
  await expect(moment.getByTestId("overpay")).toHaveText(/^Up to £\d+ a year\.$/);
  await expect(moment).toContainText("Your premium ignores the walks and care you already do.");
  await expect(moment.getByText("Picked up")).toHaveCount(0);
  await moment.getByRole("button", { name: "Pick it up" }).click();
  await expect(moment.getByRole("status")).toHaveText("Picked up");
  await page.waitForURL("**/savings");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Save on Biscuit's insurance with every walk.");
  await noHorizontalScroll(page);
  expect(errors).toEqual([]);
});
