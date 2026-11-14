import { expect, test } from "@playwright/test";
import { noHorizontalScroll, watch } from "./helpers";

test("partner: four parties, journey, calculator, pricing toggle, telematics, data limits and the pilot", async ({ page }) => {
  const { errors } = watch(page);
  await page.goto("/partner");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prevention that pays, for all four parties.");
  for (const who of ["Pet parent", "Vet", "Insurer", "Underwriter"]) await expect(page.getByTestId("parties").getByRole("heading", { name: who, exact: true })).toBeVisible();

  await expect(page.getByTestId("journey").getByRole("listitem")).toHaveCount(8);
  await expect(page.getByTestId("journey")).toContainText("Online vet consult");

  // The base case from the financial model.
  const net = page.getByTestId("net-benefit");
  await expect(page.getByTestId("claims-avoided")).toHaveText("£965k");
  await expect(net).toHaveText("+£230k");
  await expect(page.getByTestId("return")).toHaveText("1.24x");
  await expect(page.getByTestId("break-even")).toHaveText("8.6%");

  // The levers recalculate.
  await page.getByLabel("Engagement").fill("0.5");
  await expect(net).not.toHaveText("+£230k");
  await page.getByRole("button", { name: "Back to the base case" }).click();
  await expect(net).toHaveText("+£230k");

  // Pricing: hybrid is recommended and selected; switching changes the fees and the net.
  const hybrid = page.getByRole("radio", { name: /Hybrid/ });
  await expect(hybrid).toHaveAttribute("aria-checked", "true");
  await expect(hybrid).toContainText("Recommended");
  await page.getByRole("radio", { name: /Per engaged member/ }).click();
  await expect(page.getByTestId("petra-fees")).toHaveText("−£360k");
  await expect(net).not.toHaveText("+£230k");
  await page.getByRole("radio", { name: /Per claim avoided/ }).click();
  await expect(page.getByTestId("petra-fees")).toHaveText("−£145k");
  await hybrid.click();
  await expect(net).toHaveText("+£230k");

  await expect(page.getByRole("columnheader", { name: "Car insurance" })).toBeVisible();
  await expect(page.getByTestId("coop-figure")).toContainText("Co-op");
  await expect(page.getByTestId("data-never")).toContainText("Walk routes and locations");
  await expect(page.getByTestId("data-shared")).toContainText("Engagement and discount tier");
  await expect(page.getByText("Rest mode", { exact: true })).toBeVisible();
  await expect(page.getByText("Veterinary Surgeons Act 1966", { exact: true })).toBeVisible();
  await expect(page.getByTestId("pilot")).toContainText("2,000");
  await noHorizontalScroll(page);
  expect(errors).toEqual([]);
});
