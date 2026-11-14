import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { seedPet } from "./helpers";

// docs/11-QA-VERIFY.md section 5: accessibility.

const PAGES: [string, boolean][] = [
  ["/", false],
  ["/walk", true],
  ["/dashboard", true],
  ["/blackbox", true],
  ["/partner", false],
  ["/twin", true],
];

for (const [path, needsPet] of PAGES) {
  test(`axe: no serious or critical issues on ${path}`, async ({ page }) => {
    await page.route("https://api.open-meteo.com/**", (r) => r.fulfill({ json: { current: { temperature_2m: 10 }, hourly: { time: ["2026-11-14T12:00"], temperature_2m: [10], precipitation_probability: [0] }, daily: { sunrise: ["2026-11-14T07:30"], sunset: ["2026-11-14T16:15"], temperature_2m_max: [11] } } }));
    await page.route("https://tile.openstreetmap.org/**", (r) => r.fulfill({ status: 204, body: "" }));
    await page.emulateMedia({ reducedMotion: "reduce" }); // so scroll reveals are visible to the scanner
    if (needsPet) await seedPet(page, { checkins: 8 });
    else {
      await page.goto("/");
      await page.evaluate(() => localStorage.clear());
    }
    await page.goto(path);
    await page.waitForTimeout(600);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
}

test("keyboard only: onboarding from the landing page to the walk", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop-1440", "one keyboard run is enough");
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  const tabTo = async (match: RegExp, max = 60) => {
    for (let i = 0; i < max; i++) {
      await page.keyboard.press("Tab");
      const label = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.innerText || document.activeElement?.getAttribute("aria-label") || "");
      if (match.test(label)) return;
    }
    throw new Error(`could not reach ${match} with Tab`);
  };
  await tabTo(/^Dog/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What's your dog called?");
  await page.keyboard.type("Rex");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Add a photo of Rex.");
  await tabTo(/Skip, I'll add one later/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What breed is Rex?");
  await page.keyboard.type("border col");
  await tabTo(/Border Collie/);
  await page.keyboard.press("Enter");
  await tabTo(/^Continue/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How old is Rex?");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How much does Rex weigh?");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("neutered");
  await page.keyboard.press("Enter"); // "Yes" is focused
  await expect(page.getByRole("heading", { level: 1 })).toContainText("How active");
  await page.keyboard.press("Enter"); // "moderate" is focused
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What can we share?");
  await page.keyboard.press("Space"); // first switch is focused
  await tabTo(/Start the walk/);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/walk", { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello, Rex.");
});

/** Contrast after re-theming from three real palettes (photo reader mocked so only the palette maths is tested). */
const ratio = (a: number[], b: number[]) => {
  const lum = ([r, g, bl]: number[]) => {
    const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const parse = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);

for (const [fixture, coat] of [
  ["dog-golden.jpg", ["#E3D1A9"]],
  ["black-pet-teal-bg.jpg", ["#161616"]],
  ["dog-white.jpg", ["#F4F1EC"]],
] as const) {
  test(`contrast after re-theming: ${fixture}`, async ({ page }) => {
    test.skip(test.info().project.name !== "desktop-1440", "palette maths is viewport independent");
    await page.route("**/api/twin", (r) => r.fulfill({ json: { source: "gemini", petVisible: true, profile: { species: "dog", breedGuess: "Mixed breed", breedConfidence: 0.5, sizeClass: "medium", coatColours: [...coat], coatPattern: "solid", earShape: "floppy", muzzle: "medium", bodyCondition: "unknown", ageGuess: "adult", notes: "" } } }));
    await seedPet(page);
    await page.goto("/twin");
    await page.locator('input[type="file"]').first().setInputFiles(join(__dirname, "../fixtures", fixture));
    await expect(page.getByRole("button", { name: "Remove photo" })).toBeVisible();
    await page.waitForTimeout(900);
    const v = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return { bg: s.getPropertyValue("--bg"), accent: s.getPropertyValue("--accent"), dark: s.getPropertyValue("--dark") };
    });
    const ink = [20, 20, 20];
    expect(ratio(ink, parse(v.bg)), "body text on page").toBeGreaterThanOrEqual(4.5);
    expect(ratio(ink, parse(v.accent)), "text on primary buttons").toBeGreaterThanOrEqual(4.5);
    expect(ratio(parse(v.accent), parse(v.dark)), "accent numbers on the dark band").toBeGreaterThanOrEqual(4.5);
    expect(ratio([94, 94, 94], parse(v.bg)), "muted text on page").toBeGreaterThanOrEqual(4.5);
  });
}
