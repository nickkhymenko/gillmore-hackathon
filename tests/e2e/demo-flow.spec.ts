import { expect, test } from "@playwright/test";
import { noHorizontalScroll, seedPet, watch } from "./helpers";

// The demo in one go, at 390px and 1440px (both projects): the poo on the walk, Pick it up, then a walk on Savings.

test("demo flow: refresh /walk, pick up the poo, land on Savings, run the example walk, the saving updates", async ({ page }) => {
  const { errors } = watch(page);
  await page.route("https://tile.openstreetmap.org/**", (r) => r.fulfill({ status: 204, body: "" }));
  await page.route("https://api.open-meteo.com/**", (r) => r.fulfill({ json: { current: { temperature_2m: 10 }, hourly: { time: ["2026-11-14T12:00"], temperature_2m: [10], precipitation_probability: [0] }, daily: { sunrise: ["2026-11-14T07:30"], sunset: ["2026-11-14T16:15"], temperature_2m_max: [11] } } }));
  await seedPet(page);
  await page.goto("/walk");
  await page.reload();

  const moment = page.locator("#uh-oh");
  await moment.scrollIntoViewIfNeeded();
  await expect(moment.getByTestId("poo")).toBeVisible();
  await expect(moment).toContainText("You're probably overpaying for Biscuit's insurance.");
  await expect(moment.getByTestId("overpay")).toHaveText(/^Up to £\d+ a year\.$/);
  await moment.getByRole("button", { name: "Pick it up" }).click();
  await page.waitForURL("**/savings");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Save on Biscuit's insurance with every walk.");
  await noHorizontalScroll(page);

  const before = await page.locator("#your-price").textContent();
  await page.locator("#walk-mode").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Start a walk" }).click();
  // Minutes count toward today's target while the example walk replays.
  await expect(page.getByTestId("live-target")).not.toHaveText(/^0 of/, { timeout: 5_000 });
  await expect(page.getByText("Walk saved")).toBeVisible({ timeout: 25_000 });
  const saving = page.getByTestId("finish-saving");
  await expect(saving).toContainText(/Down from £[\d.]+: \d+(\.\d+)?% off/);
  await expect(page.locator("#your-price")).not.toHaveText(before ?? "");
  await noHorizontalScroll(page);
  expect(errors).toEqual([]);
});
