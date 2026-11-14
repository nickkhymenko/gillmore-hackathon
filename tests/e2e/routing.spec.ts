import { expect, test } from "@playwright/test";
import { noHorizontalScroll, seedPet, watch } from "./helpers";

test("/ opens onboarding for a new user", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Catch the");
  await expect(page.getByRole("button", { name: /Meet your Pet Twin/ })).toBeVisible();
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
