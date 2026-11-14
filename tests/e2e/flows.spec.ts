import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";
import { noHorizontalScroll, seedPet, watch } from "./helpers";

// docs/11-QA-VERIFY.md section 4: flows not covered by the other specs. Screenshots go to tests/e2e/screenshots/.

const shot = (page: Page, name: string) => page.screenshot({ path: join(__dirname, "screenshots", `${name}-${test.info().project.name}.png`), fullPage: false });
const fixture = (f: string) => join(__dirname, "../fixtures", f);

/** Deterministic photo reader: answers like Gemini would, so these tests do not depend on the live model. */
async function mockTwin(page: Page, coat: string[], species = "dog") {
  await page.route("**/api/twin", (r) =>
    r.fulfill({
      json: {
        source: "gemini",
        petVisible: true,
        profile: { species, breedGuess: "Mixed breed", breedConfidence: 0.6, sizeClass: "medium", coatColours: coat, coatPattern: "solid", earShape: "floppy", muzzle: "medium", bodyCondition: "unknown", ageGuess: "adult", notes: "", breedSuggestions: [{ breed: "Mixed breed", confidence: 0.6 }] },
      },
    }),
  );
}
const cssVar = (page: Page, v: string) => page.evaluate((v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim(), v);
const rgb = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);

test("2: photo controls: replace, remove with undo, reset theme; a grey pet takes its accent from the background", async ({ page }) => {
  const { errors } = watch(page);
  await mockTwin(page, ["#808080"]);
  await seedPet(page);
  await page.goto("/twin");
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(fixture("grey-pet-green-bg.jpg"));
  await expect(page.getByRole("button", { name: "Remove photo" })).toBeVisible();
  await page.waitForTimeout(800); // the theme transition
  const [r, g, b] = rgb(await cssVar(page, "--accent"));
  expect(g, "accent should come from the green background").toBeGreaterThan(r);
  expect(g).toBeGreaterThan(b);
  await shot(page, "02-grey-pet-green-accent");

  // Manual accent, then reset to the photo's own palette.
  const photoAccent = await cssVar(page, "--accent");
  const swatches = page.getByRole("button", { name: /Use #.* as the accent colour/ });
  for (let i = 0; i < (await swatches.count()) && (await cssVar(page, "--accent")) === photoAccent; i++) {
    await swatches.nth(i).click();
    await page.waitForTimeout(700);
  }
  expect(await cssVar(page, "--accent")).not.toBe(photoAccent);
  await page.getByRole("button", { name: "Reset theme" }).click();
  await expect.poll(() => cssVar(page, "--accent")).toBe(photoAccent);

  // Replace.
  const before = await page.getByRole("img", { name: /Photo of/ }).getAttribute("src");
  await input.setInputFiles(fixture("dog-white.jpg"));
  await expect.poll(() => page.getByRole("img", { name: /Photo of/ }).getAttribute("src")).not.toBe(before);

  // Remove, undo, remove again: back to the default palette.
  await page.getByRole("button", { name: "Remove photo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Photo removed." })).toBeVisible();
  await expect(page.getByRole("img", { name: /Photo of/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("img", { name: /Photo of/ })).toBeVisible();
  await page.getByRole("button", { name: "Remove photo" }).click();
  await expect.poll(() => cssVar(page, "--accent")).toMatch(/255, 212, 59|#ffd43b/i);
  expect(errors).toEqual([]);
});

test("3: multiple pets: switch, separate data, remove with undo", async ({ page }) => {
  await seedPet(page, { checkins: 6 });
  await page.evaluate(() => {
    const h = JSON.parse(localStorage.getItem("prevently.household")!);
    const cat = JSON.parse(JSON.stringify(h.pets[0]));
    Object.assign(cat, { id: "p2", theme: { bg: "#F2F2EF", accent: "#F2C14E", accentSoft: "#FBEFC9", dark: "#111213" } });
    Object.assign(cat.pet, { name: "Miso", species: "cat", breed: "British Shorthair", ageYears: 4, sizeClass: "small" });
    cat.profile.species = "cat";
    h.pets.push(cat);
    localStorage.setItem("prevently.household", JSON.stringify(h));
  });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Biscuit");
  await page.getByRole("button", { name: /Switch pet or add another/ }).click();
  await page.getByRole("menuitemradio", { name: /Miso/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Miso");
  await expect(page.getByText("No check-ins yet for Miso.")).toBeVisible(); // Biscuit's six check-ins stay with Biscuit
  await expect.poll(() => cssVar(page, "--accent")).toMatch(/242, 193, 78|#f2c14e/i);
  await shot(page, "03-switched-to-miso");
  await page.getByRole("button", { name: /Switch pet or add another/ }).click();
  await page.getByRole("menuitem", { name: "Remove Miso" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Biscuit");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Miso");
});

test("4 and 5: the walk: stops, Doctapet line, charts, cover only when reached, payment only after a plan; amber check-in shows next step and vet brief", async ({ page }) => {
  const { errors } = watch(page);
  await page.route("https://api.open-meteo.com/**", (r) => r.fulfill({ json: { current: { temperature_2m: 10 }, hourly: { time: ["2026-11-14T12:00"], temperature_2m: [10], precipitation_probability: [0] }, daily: { sunrise: ["2026-11-14T07:30"], sunset: ["2026-11-14T16:15"], temperature_2m_max: [11] } } }));
  await seedPet(page, { checkins: 6 });
  await page.goto("/walk");
  await expect(page.getByText("Powered by Doctapet.")).toBeVisible();
  await expect(page.getByText("Here with you.")).toBeVisible();
  expect(await page.locator("section[id] [data-stop]").count()).toBe(8);
  await expect(page.locator("#trends .recharts-line").first()).toBeAttached();
  expect(await page.locator("#trends .recharts-line").count()).toBeGreaterThanOrEqual(4);

  // Cover is not shown until the paw reaches it; payment only after a plan is chosen.
  const cover = page.locator("#cover > div").last();
  expect(Number(await cover.evaluate((e) => getComputedStyle(e).opacity))).toBeLessThan(0.5);
  await page.locator("#cover").scrollIntoViewIfNeeded();
  await expect.poll(() => cover.evaluate((e) => Number(getComputedStyle(e).opacity))).toBeGreaterThan(0.9);
  await expect(page.locator("#how-you-pay")).toHaveCount(0);
  await page.getByRole("radio", { name: /Lifetime/ }).click();
  await expect(page.locator("#how-you-pay")).toBeVisible();
  await shot(page, "04-walk-cover-and-pay");

  // Amber check-in (flow 5): the last seeded week was 5 days ago, so check in again.
  await page.locator("#check-in").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Check in again/ }).click();
  await page.getByRole("button", { name: "Something's different" }).click();
  const q = (label: string) => page.locator("li", { has: page.getByText(label, { exact: true }) });
  await q("Drinking").getByRole("radio", { name: "More" }).click();
  await q("Movement").getByRole("radio", { name: "Stiff" }).click();
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  const result = page.locator("#check-in article");
  await expect(result).toContainText("Worth a vet's view", { timeout: 20_000 });
  await expect(result).toContainText(/online vet consult|vet within 48 hours/i);
  await result.getByText("Vet brief, ready to send if you choose").click();
  await expect(result.locator("details p")).toContainText(/Labrador|Biscuit/);
  await shot(page, "05-amber-checkin");
  await noHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("7: dashboard: savings hero, streak, care plan and trends", async ({ page }) => {
  await seedPet(page, { checkins: 30 });
  await page.goto("/dashboard");
  await expect(page.locator("#savings-title")).toBeVisible();
  await expect(page.getByText(/You've saved £\d+/)).toBeVisible();
  await expect(page.getByText(/weeks in a row/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Care plan/i }).or(page.getByText("/ Care plan"))).toBeVisible();
  expect(await page.locator(".recharts-line").count()).toBeGreaterThanOrEqual(4);
  await shot(page, "07-dashboard");
});

test("11: refresh mid-journey keeps progress; Delete all my data clears everything", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page.getByRole("button", { name: /^Rabbit/ }).click();
  await page.getByPlaceholder("Biscuit").fill("Pip");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Add a photo of Pip.");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Let's finish");
  await page.getByRole("button", { name: "Carry on" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Add a photo of Pip.");

  await page.getByRole("button", { name: "Delete all my data" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("prevently")));
  expect(keys).toEqual([]);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Make your pet bills");
});

test("12: reduced motion: no moving paw, content visible without scroll animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  const story = page.getByText("Petra notices the dip against his own normal, not an average dog's.");
  expect(Number(await story.evaluate((e) => getComputedStyle(e.closest("div")!).opacity))).toBe(1);
  await seedPet(page, { checkins: 6 });
  await page.goto("/walk");
  await expect(page.getByText("Hello,")).toBeVisible();
  // The moving paw is the only accent-filled circle with a 20px radius in the walk path.
  expect(await page.locator('svg circle[fill="var(--accent)"]').count()).toBe(0);
  await page.locator("#cover").scrollIntoViewIfNeeded();
  await page.getByRole("radio", { name: /Lifetime/ }).click();
  await expect(page.locator("#how-you-pay")).toBeVisible();
});
