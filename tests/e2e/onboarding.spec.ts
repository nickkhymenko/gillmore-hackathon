import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { noHorizontalScroll, watch } from "./helpers";

test("landing: species card first, then name, photo (skipped), breed and the rest, ending on the walk", async ({ page }) => {
  const { errors } = watch(page);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Make managing your pet's finances a walk in the park.");
  await expect(page.getByText("69%")).toBeVisible();
  await noHorizontalScroll(page);
  await page.getByRole("button", { name: /^Cat/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What's your cat called?");
  await expect(page.getByPlaceholder("Biscuit")).toBeFocused();
  await page.getByPlaceholder("Biscuit").pressSequentially("miso");
  await expect(page.getByPlaceholder("Biscuit")).toHaveValue("Miso");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Add a photo of Miso.");
  await expect(page.getByLabel(/Step 3 of 8/)).toBeVisible();
  await page.getByRole("button", { name: "Skip, I'll add one later" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What breed is Miso?");
  await page.getByPlaceholder("Search cats").fill("british");
  await page.getByRole("radio", { name: "British Shorthair" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How old is Miso?");
  await page.keyboard.press("Enter"); // age, prefilled
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How much does Miso weigh?");
  await page.keyboard.press("Enter"); // weight, prefilled
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Roughly how active is Miso?");
  await page.getByRole("radio", { name: /low/i }).click();
  await page.getByRole("switch", { name: /Share engagement/ }).click();
  await page.getByRole("button", { name: "Start the walk" }).click();
  await page.waitForURL("**/walk", { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello, Miso.");
  const pet = await page.evaluate(() => JSON.parse(localStorage.getItem("prevently.household")!).pets[0].pet);
  expect(pet).toMatchObject({ name: "Miso", species: "cat", breed: "British Shorthair", activity: "low" });
  expect(errors).toEqual([]);
});

test("photo step: the twin uses the chosen species and offers the top breed suggestions", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop-1440", "one run is enough for a live AI call");
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page.getByRole("button", { name: /^Dog/ }).click();
  await page.getByPlaceholder("Biscuit").fill("Biscuit");
  await page.keyboard.press("Enter");
  await page.locator('input[type="file"]').setInputFiles(join(__dirname, "../fixtures/dog-golden.jpg"));
  // Live AI: when Gemini itself is unavailable the app falls back to manual picks (tested elsewhere), so skip honestly.
  await expect(page.getByText(/sure\.|photo reader is not available|could not reach the photo reader/)).toBeVisible({ timeout: 20_000 });
  test.skip(await page.getByText(/photo reader is not available|could not reach the photo reader/).isVisible(), "Gemini unavailable during this run");
  await page.getByRole("button", { name: /Looks right, continue/ }).click();
  const chips = page.getByRole("radiogroup", { name: "Breed suggestions from the photo" }).getByRole("radio");
  await expect(chips.first()).toBeVisible();
  expect(await chips.count()).toBeGreaterThanOrEqual(2); // one to three suggestions plus "Mixed / not sure"
  expect(await chips.count()).toBeLessThanOrEqual(4);
  await expect(chips.last()).toHaveText("Mixed / not sure");
  await expect(chips.first()).toContainText("%");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/From Biscuit's photo, we think .+ \(\d+% sure\)\./);
});

test("empty dashboard: designed state with 'See a demo pet' loading Biscuit", async ({ page }) => {
  const { errors } = watch(page);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("This space is for your pet.");
  await expect(page.getByRole("link", { name: "Meet your Pet Twin" })).toBeVisible();
  await page.getByRole("link", { name: "See a demo pet" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Biscuit", { timeout: 10_000 });
  await page.waitForURL((u) => u.pathname === "/dashboard" && u.search === "");
  await expect(page.locator("#savings-title")).toHaveText(/Petra Savings/);
  await page.getByRole("tab", { name: "Health" }).click();
  await expect(page.getByText(/supplement and product ideas are paused/i)).toBeVisible();
  await page.getByRole("tab", { name: "Walks" }).click();
  await expect(page.getByText("A change worth a vet's look")).toBeVisible();
  expect(errors).toEqual([]);
});

test("?demo=miso loads the cat with a play plan and an indoor tracker", async ({ page }) => {
  await page.goto("/dashboard?demo=miso");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Miso", { timeout: 10_000 });
  await expect(page.getByText(/Help your cat drink more/)).toBeVisible();
  await page.goto("/walk");
  await expect(page.locator("#your-walk")).toContainText("here is her play plan");
});
