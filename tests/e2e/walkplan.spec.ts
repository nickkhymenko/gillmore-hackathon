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
  await expect(card).toContainText("Best walk window today");
  await expect(card.getByRole("alert")).toHaveCount(0);
  // Seniors get the care plan before the charts.
  const ids = await page.locator("section[id]").evaluateAll((s) => s.map((x) => x.id));
  expect(ids.indexOf("care-plan")).toBeLessThan(ids.indexOf("trends"));
  await noHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("French Bulldog at 24°C gets a heat warning", async ({ page }) => {
  await mockWeather(page, 24);
  await seedPet(page);
  await setBreed(page, "French Bulldog", "dog", { ageYears: 3, sizeClass: "small", pronoun: "she" });
  await page.goto("/walk");
  const card = page.locator("#your-walk");
  await expect(card).toContainText("here is her walk");
  await expect(card.getByRole("alert")).toContainText("Heat warning");
  await expect(card.getByRole("alert")).toContainText("more at risk in heat");
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
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Make your pet bills");
  await expect(page.getByText(/Up to £\d+ a year off Biscuit's cover/)).toBeVisible();
});
