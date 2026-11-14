import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";
import { noHorizontalScroll, watch } from "./helpers";

/**
 * The golden path: the whole 90-second demo (docs/DEMO.md) in one go, at 390px and 1440px.
 * Runs against BASE_URL, so the same test checks production. Against production the photo reader is the
 * live one (set LIVE_AI=1); locally it is mocked so the run does not depend on the model being reachable.
 */
const LIVE_AI = Boolean(process.env.LIVE_AI);
const cssVar = (page: Page, v: string) => page.evaluate((v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim(), v);

test("golden path: demo pet, photo re-theme, walk and poo, sign-up, Movement check, member offers", async ({ page }) => {
  test.setTimeout(240_000);
  const { errors } = watch(page);
  await page.route("https://tile.openstreetmap.org/**", (r) => r.fulfill({ status: 204, body: "" }));
  await page.route("https://api.open-meteo.com/**", (r) => r.fulfill({ json: { current: { temperature_2m: 10 }, hourly: { time: ["2026-11-14T12:00"], temperature_2m: [10], precipitation_probability: [0] }, daily: { sunrise: ["2026-11-14T07:30"], sunset: ["2026-11-14T16:15"], temperature_2m_max: [11] } } }));
  if (!LIVE_AI)
    await page.route("**/api/twin", (r) =>
      r.fulfill({
        json: {
          source: "gemini",
          petVisible: true,
          profile: { species: "dog", breedGuess: "Labrador Retriever", breedConfidence: 0.7, sizeClass: "large", coatColours: ["#E3D1A9"], coatPattern: "solid", earShape: "floppy", muzzle: "medium", bodyCondition: "ideal", ageGuess: "adult", notes: "", breedSuggestions: [{ breed: "Labrador Retriever", confidence: 0.7 }] },
        },
      }),
    );

  // 1. /?demo=biscuit loads a fully populated, consistent pet.
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/?demo=biscuit");
  await page.waitForURL((u) => u.pathname === "/dashboard" && u.search === "");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Biscuit", { timeout: 15_000 });
  await expect(page.getByTestId("savings-card")).toHaveAttribute("data-state", "walks");
  await expect(page.getByTestId("savings-weeks")).toContainText("10 of 12");
  await expect(page.getByTestId("streak")).toHaveText("12");
  await expect(page.getByTestId("premium-badge")).toHaveCount(0);
  await noHorizontalScroll(page);

  // 2. Onboarding photo step: the page re-themes from the photo.
  await page.goto("/add");
  await page.getByRole("radio", { name: "Dog" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What's your dog called?");
  await page.getByPlaceholder("Biscuit").fill("Luna");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Add a photo of Luna.");
  const before = { bg: await cssVar(page, "--bg"), accent: await cssVar(page, "--accent") };
  await page.locator('input[type="file"]').first().setInputFiles(join(__dirname, "../fixtures/dog-golden.jpg"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Meet Luna's twin.", { timeout: 20_000 });
  await expect.poll(() => cssVar(page, "--bg"), { timeout: 10_000 }).not.toBe(before.bg);
  await expect(page.getByRole("button", { name: "Looks right, continue" })).toBeEnabled({ timeout: 25_000 });
  await noHorizontalScroll(page);
  await page.getByRole("button", { name: "Looks right, continue" }).click();
  // Breed, age, weight, activity, consent: the steps as they were.
  await page.getByPlaceholder("Search dogs").fill("labrador");
  await page.getByRole("radiogroup", { name: "Breeds" }).getByRole("radio", { name: "Labrador Retriever" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How old is Luna?");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How much does Luna weigh?");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Roughly how active is Luna?");
  await page.getByRole("radio", { name: /moderate/i }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What can we share?");
  await page.getByRole("switch", { name: /Share engagement/ }).click();
  await page.getByRole("button", { name: "Start the walk" }).click();

  // 3. /walk: the healthy dog, then the poo. Right after the teaser, the headline, the number and
  //    "Pick it up" are all in one viewport, with no extra scrolling.
  await page.waitForURL("**/walk", { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello, Luna.");
  await page.locator("#healthspan").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("healthy-years")).toHaveText(/^Luna could have about [\d.]+ more healthy years\.$/);
  await expect(page.getByRole("img", { name: "Luna, healthy and happy, mid-stride" })).toBeVisible();
  const teaser = page.getByTestId("insurance-teaser");
  await teaser.scrollIntoViewIfNeeded();
  // Put the teaser at the top of the page, just under the sticky header and progress bar.
  await teaser.evaluate((el) => {
    const bars = document.querySelector('nav[aria-label="Walk progress"]')!.getBoundingClientRect().bottom;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - bars - 12, behavior: "instant" });
  });
  await expect(teaser).toHaveText("Now, about Luna's insurance…");
  await expect(teaser).toBeInViewport({ ratio: 1 });
  const moment = page.locator("#uh-oh");
  const pickUp = moment.getByRole("button", { name: "Pick it up" });
  await expect(moment.getByTestId("poo")).toBeInViewport({ ratio: 1 });
  await expect(moment.getByTestId("overpay")).toHaveText(/^Owners like you could save up to £\d+ a year\.$/);
  await expect(moment.getByTestId("overpay")).toBeInViewport({ ratio: 1 });
  await expect(pickUp).toBeInViewport({ ratio: 1 });
  await noHorizontalScroll(page);
  await pickUp.click();

  // 4. /savings: the example walk, Try it today, Join Petra Plus, and the Plus badge.
  await page.waitForURL("**/savings");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Keep Luna safe. Save on every walk.");
  await expect(page.getByRole("img", { name: /Petra Walk Companion/ })).toBeVisible();
  await noHorizontalScroll(page);
  await page.locator("#walk-mode").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Start a walk" }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.getByTestId("live-target")).not.toHaveText(/^0 of/, { timeout: 8_000 }); // minutes count up
  await expect(page.getByText("Walk saved")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/35 min/)).toBeVisible();
  await expect(page.getByTestId("finish-saving")).toContainText(/Down from £[\d.]+: \d+(\.\d+)?% off/); // the price ticks down
  await page.getByRole("button", { name: "Try it today" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("img", { name: "Luna's avatar" })).toBeVisible();
  await expect(sheet.getByTestId("join-summary")).toHaveText(/^Walk Companion · up to £\d+ a year off · cancel anytime$/);
  await sheet.getByRole("button", { name: "Join Petra Plus" }).click();
  await expect(sheet.getByTestId("join-success")).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Welcome to Petra Plus." })).toBeVisible();
  await expect(page.getByTestId("premium-badge")).toBeVisible();
  await noHorizontalScroll(page);
  await sheet.getByRole("link", { name: "Go to your dashboard" }).click();

  // 5. Dashboard: a first-day pet sees its potential, never a made-up saving. Then Health, the Movement check,
  //    the healthy demo walk, the skeleton plays once, Analyse, and the result.
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Luna");
  await expect(page.getByTestId("savings-card")).toHaveAttribute("data-state", "building");
  await expect(page.getByTestId("savings-card")).not.toContainText(/saved £/i);
  await expect(page.getByTestId("premium-status")).toContainText("Petra Plus member");
  await noHorizontalScroll(page);
  await page.getByRole("tab", { name: "Health" }).click();
  await expect(page.getByRole("tab", { name: "Health" })).toHaveAttribute("aria-selected", "true");
  const check = page.getByTestId("movement-check");
  await check.scrollIntoViewIfNeeded();
  await expect(check.getByRole("heading", { name: /Ten seconds of walking/ })).toBeVisible();
  await expect(check.locator("video")).toHaveCount(0); // nothing autoplays
  await check.getByRole("button", { name: /Healthy dog on a city walk/ }).click();
  await expect(check).toHaveAttribute("data-phase", "live", { timeout: 15_000 });
  await expect(check.getByText("Steps look even so far.", { exact: false })).toBeVisible({ timeout: 20_000 });
  await check.getByRole("button", { name: /^Analyse/ }).click();
  await expect(check.getByRole("heading", { name: /Moving evenly/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await noHorizontalScroll(page);

  // 6. The Savings tab: the member offers.
  await page.getByRole("tab", { name: "Savings" }).click();
  await expect(page.getByRole("heading", { name: "Your pet deserves the best life." })).toBeVisible();
  await expect(page.getByTestId("featured-offer")).toContainText("Doctapet Nutrition (coming to the UK)");
  await expect(page.getByTestId("featured-offer")).toContainText("Planned");
  for (const title of ["Nutrition and supplements", "Partner vets", "Insurer partnership", "Accessories"]) await expect(page.locator("#savings").getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(page.locator("#savings")).toContainText("The Petra discount");
  await expect(page.locator("#savings")).toContainText("Example partners.");
  await noHorizontalScroll(page);

  // Reset demo clears the membership too.
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByTestId("premium-badge")).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("prevently")))).toEqual([]);
  expect(errors).toEqual([]);
});
