import { expect, type Page } from "@playwright/test";

export const NORMAL = { appetite: "normal", energy: "normal", water: "normal", stool: "normal", vomiting: "none", mobility: "normal", skin: "normal", breathing: "normal", urination: "normal" };

type Seed = { name?: string; species?: "dog" | "cat"; checkins?: number; lastStatus?: "green" | "amber" | "red"; lastAnswers?: Partial<typeof NORMAL> };

/** Puts one onboarded pet (and optionally weekly check-ins) straight into browser storage. */
export async function seedPet(page: Page, s: Seed = {}) {
  await page.goto("/");
  await page.evaluate((s) => {
    const dog = (s.species ?? "dog") === "dog";
    const name = s.name ?? (dog ? "Biscuit" : "Miso");
    const rec = {
      id: "p1",
      pet: dog ? { name, species: "dog", breed: "Labrador Retriever", ageYears: 8, weightKg: 34, sizeClass: "large", neutered: true, activity: "moderate" } : { name, species: "cat", breed: "British Shorthair", ageYears: 4, weightKg: 5, sizeClass: "small" },
      profile: { species: dog ? "dog" : "cat", breedGuess: "", breedConfidence: 0, sizeClass: dog ? "large" : "small", coatColours: [], coatPattern: "solid", earShape: dog ? "floppy" : "upright", muzzle: dog ? "medium" : "short", bodyCondition: "unknown", ageGuess: "adult", notes: "" },
      photo: null, swatches: [], photoTheme: null,
      theme: { bg: "#F7F5F0", accent: "#FFD43B", accentSoft: "#FFF3C4", dark: "#121212" },
      twinSource: "breed", consent: { vet: true, insurer: true, research: false, updatedAt: null }, setupStep: null,
      createdAt: new Date(Date.now() - 40 * 7 * 864e5).toISOString(),
    };
    localStorage.clear();
    localStorage.setItem("prevently.household", JSON.stringify({ activeId: "p1", pets: [rec] }));
    const n = s.checkins ?? 0;
    const normal = { appetite: "normal", energy: "normal", water: "normal", stool: "normal", vomiting: "none", mobility: "normal", skin: "normal", breathing: "normal", urination: "normal" };
    const log = Array.from({ length: n }, (_, i) => {
      const last = i === n - 1;
      const status = last ? (s.lastStatus ?? "green") : "green";
      return {
        petName: name, petId: "p1", answers: last ? { ...normal, ...(s.lastAnswers ?? {}) } : normal, status, healthScore: last && status !== "green" ? 70 : 92,
        headline: "h", ownerMessage: "m", flags: [], nextStep: { action: status === "green" ? "keep_monitoring" : "online_consult", rationale: "r" }, preventionTips: [], vetBrief: "",
        source: "rules", safetyOverride: false, safetyReasons: [], trend: { baseline: null, delta: null, note: null }, creditsEarned: 10, disclaimer: "",
        createdAt: new Date(Date.now() - (n - i) * 7 * 864e5 + 2 * 864e5).toISOString(),
      };
    });
    localStorage.setItem("prevently.checkins", JSON.stringify(log));
  }, s);
}

/** Collects console errors, failed requests and every request URL for later assertions. */
export function watch(page: Page) {
  const errors: string[] = [];
  const requests: { url: string; method: string; body: string | null }[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) => {
    // Navigations aborted by the router are not failures.
    if (!r.failure()?.errorText.includes("ERR_ABORTED")) errors.push(`request failed: ${r.url()} ${r.failure()?.errorText}`);
  });
  page.on("request", (r) => requests.push({ url: r.url(), method: r.method(), body: r.postData() }));
  return { errors, requests };
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(0);
}
