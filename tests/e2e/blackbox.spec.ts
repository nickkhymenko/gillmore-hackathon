import { expect, test } from "@playwright/test";
import { noHorizontalScroll, seedPet, watch } from "./helpers";

test.beforeEach(async ({ page }) => {
  // Keep tests offline and fast: blank map tiles, fixed weather.
  await page.route("https://tile.openstreetmap.org/**", (r) => r.fulfill({ status: 204, body: "" }));
  await page.route("https://api.open-meteo.com/**", (r) => r.fulfill({ json: { current: { temperature_2m: 10 }, hourly: { time: ["2026-11-14T12:00"], temperature_2m: [10], precipitation_probability: [0] }, daily: { sunrise: ["2026-11-14T07:30"], sunset: ["2026-11-14T16:15"], temperature_2m_max: [11] } } }));
});

test("simulated walk end to end: finish screen, target, live price and dashboard", async ({ page }) => {
  const { errors, requests } = watch(page);
  await seedPet(page);
  await page.goto("/savings");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Make managing your pet's finances");
  await expect(page.locator("#compare")).toContainText("What you pay now vs with Petra");
  const priceBefore = await page.locator("#your-price").textContent();

  await page.locator("#walk-mode select").selectOption("60");
  await page.getByRole("button", { name: "Simulate a walk" }).click();
  await expect(page.getByText("Simulated walk, 60x speed")).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.getByText("Walk saved")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Target: \d+ of \d+ minutes today/)).toBeVisible();
  await expect(page.getByText(/35 min/)).toBeVisible();

  const priceAfter = await page.locator("#your-price").textContent();
  expect(priceAfter).not.toBe(priceBefore);
  await expect(page.locator("#your-price")).toContainText("Target met in");

  await page.goto("/dashboard");
  await expect(page.locator("#savings-title")).toHaveText(/Petra Savings/);
  await expect(page.getByText(/of \d+ minutes/).first()).toBeVisible();

  // Routes never leave the device: no location in any request to our API.
  const api = requests.filter((r) => new URL(r.url).pathname.startsWith("/api/"));
  for (const r of api) expect(`${r.url} ${r.body ?? ""}`).not.toMatch(/lat|lon|52\.3|-1\.5|route/i);
  await noHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("pairing the simulated collar adds vitals; a 10-day dip raises an amber vet flag", async ({ page }) => {
  await seedPet(page);
  await page.goto("/savings");
  await page.getByRole("button", { name: "Pair Petra Walk Companion" }).click();
  await expect(page.getByText("Paired (simulated for the demo)")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/No sustained changes against Biscuit's own baseline/)).toBeVisible();
  await page.getByRole("button", { name: "Demo: simulate a 10-day dip" }).click();
  await expect(page.getByText("A change worth a vet's look")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "A change worth a vet's look" })).toContainText("not a diagnosis");
  await expect(page.getByRole("button", { name: /Online vet consult, savings summary attached/ })).toBeVisible();
});

test("rest mode protects the discount", async ({ page }) => {
  await seedPet(page);
  // Enrolled 6 weeks ago; walked the full target for 5 weeks, then nothing for the last week (an injury).
  const setup = (restDaysAgo: number | null) =>
    page.evaluate((restDaysAgo) => {
      const day = 864e5, now = Date.now();
      const h = JSON.parse(localStorage.getItem("prevently.household")!);
      h.pets[0].blackBox = { device: "phone", enrolledAt: new Date(now - 42 * day).toISOString(), restSince: restDaysAgo === null ? null : new Date(now - restDaysAgo * day).toISOString() };
      localStorage.setItem("prevently.household", JSON.stringify(h));
      const walks = Array.from({ length: 35 }, (_, i) => ({ id: `w${i}`, petId: "p1", startedAt: new Date(now - (42 - i) * day + 3600e3).toISOString(), minutes: 150, distanceKm: 5, steps: 0, source: "phone", route: [] }));
      localStorage.setItem("prevently.walks", JSON.stringify(walks));
    }, restDaysAgo);

  await setup(null);
  await page.goto("/savings");
  const without = await page.locator("#your-price").textContent();
  expect(without).toContain("Target met in 5 of 6 weeks");

  await setup(8);
  await page.goto("/savings");
  await expect(page.getByText("Rest mode: no target today.")).toBeVisible();
  await expect(page.locator("#your-price")).toContainText("Target met in 6 of 6 weeks");
  const pct = (t: string | null) => Number(/Petra Savings discount \(([\d.]+)%\)/.exec(t ?? "")?.[1] ?? -1);
  expect(pct(await page.locator("#your-price").textContent())).toBeGreaterThan(pct(without));
});

test("Web Bluetooth option is hidden when the browser does not support it", async ({ page }) => {
  await page.addInitScript(() => {
    // Simulate Safari / Firefox, which have no Web Bluetooth.
    delete (Navigator.prototype as unknown as Record<string, unknown>).bluetooth;
  });
  await seedPet(page);
  await page.goto("/savings");
  await expect(page.getByRole("button", { name: "Pair Petra Walk Companion" })).toBeVisible();
  await expect(page.getByText("Connect a heart rate sensor")).toHaveCount(0);
});

test("the data rules are always one tap or one glance away", async ({ page }, info) => {
  await seedPet(page);
  await page.goto("/savings");
  if (info.project.name.startsWith("mobile")) {
    await page.getByRole("button", { name: /Your data, your rules/ }).click();
    await expect(page.getByRole("dialog")).toContainText("It can only lower your premium");
  } else {
    await expect(page.getByRole("complementary", { name: "Your data, your rules" })).toContainText("Routes and locations stay on your device");
  }
});
