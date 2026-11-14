import { expect, test } from "@playwright/test";
import { noHorizontalScroll, watch } from "./helpers";

test("partner: pricing switch and sliders recalculate; underwriter and Black Box tabs render", async ({ page }) => {
  const { errors } = watch(page);
  await page.goto("/partner");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Prevention that pays.");
  const net = page.getByRole("row", { name: /Net benefit to insurer and underwriter/ });
  await expect(net).toContainText("+£354k");
  await expect(page.getByRole("row", { name: /ignoring retention/ })).toContainText("9.0%");

  await page.getByRole("radio", { name: /Hybrid/ }).click();
  await expect(net).not.toContainText("+£354k");
  await page.getByRole("radio", { name: /Per engaged member/ }).click();
  await expect(net).toContainText("+£354k");

  const engagement = page.getByLabel(/Engaged members/);
  await engagement.fill("0.5");
  await expect(net).not.toContainText("+£354k");
  await noHorizontalScroll(page);

  await page.getByRole("tab", { name: "Underwriter" }).click();
  await expect(page.getByText("Baseline loss ratio")).toBeVisible();
  await expect(page.getByRole("table").getByText("Walk routes and locations")).toBeVisible();
  await expect(page.getByText("Never shared: stay on the owner's phone")).toBeVisible();
  await expect(page.getByText("Rest mode", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Black Box" }).click();
  await expect(page.getByText("Hardware economics")).toBeVisible();
  await page.getByRole("radio", { name: /£5 a month, bundled/ }).click();
  await expect(page.getByText("10 months")).toBeVisible();
  await expect(page.getByText("Why younger owners")).toBeVisible();
  await noHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("partner deep link opens the Black Box tab", async ({ page }) => {
  await page.goto("/partner#blackbox");
  await expect(page.getByRole("tab", { name: "Black Box" })).toHaveAttribute("aria-selected", "true");
});
