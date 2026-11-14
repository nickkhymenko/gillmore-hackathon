import { expect, test } from "@playwright/test";
import { noHorizontalScroll, seedPet, watch } from "./helpers";

// The demo in one go, at 390px and 1440px (both projects): the poo on the walk, Pick it up, an example walk,
// Try it today, the Premium badge, then the member area on the dashboard.

test("demo flow: /walk poo, Pick it up, /savings walk, Try it today, Premium badge, dashboard Savings tab", async ({ page }) => {
  const { errors } = watch(page);
  await page.route("https://tile.openstreetmap.org/**", (r) => r.fulfill({ status: 204, body: "" }));
  await page.route("https://api.open-meteo.com/**", (r) => r.fulfill({ json: { current: { temperature_2m: 10 }, hourly: { time: ["2026-11-14T12:00"], temperature_2m: [10], precipitation_probability: [0] }, daily: { sunrise: ["2026-11-14T07:30"], sunset: ["2026-11-14T16:15"], temperature_2m_max: [11] } } }));
  await seedPet(page);
  await page.goto("/walk");
  await page.reload();
  await expect(page.getByTestId("premium-badge")).toHaveCount(0);

  await page.getByTestId("insurance-teaser").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("insurance-teaser")).toHaveText("Now, about Biscuit's insurance…");
  const moment = page.locator("#uh-oh");
  await moment.scrollIntoViewIfNeeded();
  await expect(moment.getByTestId("poo")).toBeVisible();
  await expect(moment.getByTestId("overpay")).toHaveText(/^You and owners like you could save up to £\d+ a year\.$/);
  await moment.getByRole("button", { name: "Pick it up" }).click();
  await page.waitForURL("**/savings");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Save on Biscuit's insurance with every walk.");
  await noHorizontalScroll(page);

  await page.locator("#walk-mode").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Start a walk" }).click();
  await expect(page.getByTestId("live-target")).not.toHaveText(/^0 of/, { timeout: 5_000 });
  await expect(page.getByText("Walk saved")).toBeVisible({ timeout: 25_000 });
  await expect(page.getByTestId("finish-saving")).toContainText(/Down from £[\d.]+: \d+(\.\d+)?% off/);

  await page.getByRole("button", { name: "Try it today" }).click();
  await expect(page.locator("#join")).toContainText("Welcome to Petra Premium. Biscuit is covered for every walk.");
  await expect(page.getByTestId("premium-badge")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("prevently.premium") ?? "null")?.petId)).toBe("p1");
  await noHorizontalScroll(page);

  await page.getByRole("link", { name: "Go to your dashboard" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByTestId("premium-status")).toContainText("Petra Premium member");
  await page.getByRole("tab", { name: "Savings" }).click();
  await expect(page.getByRole("heading", { name: "Your pet deserves the best life." })).toBeVisible();
  await expect(page.getByTestId("featured-offer")).toContainText("Doctapet Nutrition (coming to the UK)");
  await expect(page.getByTestId("featured-offer")).toContainText("Planned");
  await expect(page.getByTestId("avg-saving")).toContainText(/Members save about £\d+ a year/);
  await expect(page.locator("#savings")).toContainText("Example partners.");
  await noHorizontalScroll(page);

  // Delete all my data clears the membership too.
  await page.getByRole("button", { name: "Delete all my data" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByTestId("premium-badge")).toHaveCount(0);
  expect(errors).toEqual([]);
});
