import { expect, test } from "@playwright/test";
import { noHorizontalScroll, seedPet, watch } from "./helpers";

test("/ opens onboarding for a new user", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Make managing your pet's finances");
  await expect(page.getByRole("button", { name: /^Dog/ })).toBeVisible();
});

test("/ sends a returning user to the dashboard", async ({ page }) => {
  await seedPet(page);
  await page.goto("/");
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Biscuit");
});

test("old /checkin and /pet pages redirect into the new design", async ({ page }) => {
  await seedPet(page);
  await page.goto("/checkin");
  expect(new URL(page.url()).pathname).toBe("/walk");
  await page.goto("/pet");
  expect(new URL(page.url()).pathname).toBe("/dashboard");
});

test("no page uses the old teal palette", async ({ page }) => {
  const { errors } = watch(page);
  await seedPet(page, { checkins: 6 });
  for (const path of ["/", "/dashboard", "/walk", "/twin", "/partner", "/add"]) {
    await page.goto(path);
    const teal = await page.evaluate(() => [...document.querySelectorAll("[class]")].filter((e) => /\bteal-/.test(e.getAttribute("class") ?? "")).length);
    expect(teal, `teal classes on ${path}`).toBe(0);
    await noHorizontalScroll(page);
  }
  expect(errors).toEqual([]);
});

test("navigation: Walk, Dashboard, Savings, For insurers; fits on a phone", async ({ page }, info) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  const labels = (await nav.getByRole("link").allTextContents()).map((t) => t.trim()).filter((t) => t && t !== "Petra");
  if (info.project.name.startsWith("mobile")) expect(labels).toEqual(["Walk", "Dashboard", "Savings"]);
  else expect(labels).toEqual(["Walk", "Dashboard", "Savings", "For insurers"]);
  const navBox = await nav.boundingBox();
  expect(navBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});
