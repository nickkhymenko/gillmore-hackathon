import { expect, test } from "@playwright/test";
import { seedPet, watch } from "./helpers";

// docs/11-QA-VERIFY.md section 3, the items that need a browser.

test("14: script tags in a pet name and notes render as text, never run", async ({ page }) => {
  const { errors } = watch(page);
  let dialog = false;
  page.on("dialog", async (d) => {
    dialog = true;
    await d.dismiss();
  });
  const evil = '"</script><script>alert(1)</script>';
  await seedPet(page, { name: evil });
  for (const path of ["/walk", "/dashboard", "/twin"]) {
    await page.goto(path);
    await expect(page.getByText("<script>alert(1)</script>", { exact: false }).first()).toBeVisible();
  }
  // Notes go through the check-in API and come back inside the vet brief.
  await page.goto("/walk");
  await page.locator("#check-in").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Something's different" }).click();
  await page.getByPlaceholder(/scratching left ear/).fill(evil);
  await page.getByRole("button", { name: "Check in" }).click();
  await expect(page.getByText("Health score").first()).toBeVisible({ timeout: 20_000 });
  expect(dialog, "an alert() dialog fired").toBe(false);
  expect(errors).toEqual([]);
});

test("16: an amber flag pauses supplements and puts the vet step first", async ({ page }) => {
  await seedPet(page, { checkins: 30, lastStatus: "amber", lastAnswers: { mobility: "stiff", water: "more" } });
  // The care plan lives on the dashboard (the walk no longer has a care plan stop).
  await page.goto("/dashboard#health");
  await expect(page.getByText(/supplement and product ideas are paused/i).first()).toBeVisible();
  const titles = await page.locator("ol h3, ol h4").allTextContents();
  expect(titles.join(" | ")).not.toMatch(/omega|glucosamine|probiotic|chews/i);
  expect(titles[0]).toMatch(/vet/i);
  // Control: the same pet with a green week does get the joint supplement suggestion.
  await seedPet(page, { checkins: 30, lastStatus: "green", lastAnswers: { mobility: "stiff" } });
  await page.goto("/dashboard#health");
  await expect(page.locator("ol h3", { hasText: /omega-3/i })).toBeVisible();
});

test("17: the discount comes from check-ins only; partner offers cannot change it", async ({ page }) => {
  await seedPet(page, { checkins: 30 });
  await page.goto("/dashboard");
  const hero = page.locator("section[aria-labelledby=savings-title]");
  const before = await hero.textContent();
  await page.goto("/dashboard#savings");
  const offers = page.locator("#savings li");
  await expect(offers.first()).toBeVisible();
  const count = await offers.count();
  for (let i = 0; i < count; i++) await offers.nth(i).click({ force: true });
  // Partner offers are not links or buttons: nothing to buy, nothing tracked.
  expect(await page.locator("#savings li a, #savings li button").count()).toBe(0);
  await expect(page.locator("#savings")).toContainText("Example partners.");
  await page.goto("/dashboard");
  expect(await hero.textContent()).toBe(before);
});

test("19: nothing is sent to any insurer or third party without an owner action", async ({ page }) => {
  const { requests } = watch(page);
  await seedPet(page);
  for (const path of ["/", "/dashboard", "/walk", "/twin"]) await page.goto(path);
  await page.goto("/walk");
  await page.getByRole("button", { name: "All normal" }).click();
  await expect(page.getByText("Health score").first()).toBeVisible({ timeout: 20_000 });
  const origin = new URL(page.url()).origin;
  const external = requests.filter((r) => !r.url.startsWith(origin) && !r.url.startsWith("data:"));
  // The only third party allowed is the owner's own weather lookup (docs/12): Open-Meteo, default Coventry
  // coordinates unless the owner taps "Use my location", and no pet or owner details in the request.
  const weather = external.filter((r) => r.url.startsWith("https://api.open-meteo.com/v1/forecast"));
  expect(external.filter((r) => !weather.includes(r)).map((r) => r.url)).toEqual([]);
  for (const w of weather) {
    const q = new URL(w.url).searchParams;
    expect([q.get("latitude"), q.get("longitude")]).toEqual(["52.38", "-1.56"]);
    expect(w.url).not.toMatch(/Biscuit|Labrador/i);
    expect(w.method).toBe("GET");
  }
  const posts = requests.filter((r) => r.method === "POST").map((r) => new URL(r.url).pathname);
  expect(posts.every((p) => p === "/api/checkin")).toBe(true);
  // The check-in payload holds this pet's answers only: no owner identity, no location, no insurer fields.
  const body = JSON.parse(requests.find((r) => r.method === "POST")!.body!);
  expect(Object.keys(body).sort()).toEqual(["answers", "history", "notes", "pet", "streakWeeks"]);
});
