import { expect, test } from "@playwright/test";
import { ClipResultSchema, SCAN_TYPES, ScanResponseSchema } from "../../src/lib/video/contract";
import { mockClipResult } from "../../src/lib/video/mock";
import { seedPet, watch } from "./helpers";

// docs/13: video contract tests and the video QA checks.

const fakeClip = (bytes = 50_000) => ({ name: "clip.webm", mimeType: "video/webm", buffer: Buffer.alloc(bytes, 1) });

test.describe("contract", () => {
  test("mock results match the frozen contract for every scan type and species", async () => {
    for (const scanType of SCAN_TYPES)
      for (const species of ["dog", "cat", "rabbit", "horse"]) {
        const r = mockClipResult({ petId: "p1", species, scanType }, 1234);
        expect(ClipResultSchema.safeParse(r).success, `${species} ${scanType}`).toBe(true);
      }
  });

  test("POST /api/scan returns a contract-shaped response and validates input", async ({ request }) => {
    const ok = await request.post("/api/scan", { multipart: { video: fakeClip(), petId: "p1", species: "dog", scanType: "walk" } });
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(ScanResponseSchema.safeParse(body).success).toBe(true);
    expect(["ml", "mock"]).toContain(body.source);
    if (!process.env.ML_API_URL) expect(body.source).toBe("mock");

    expect((await request.post("/api/scan", { multipart: { petId: "p1" } })).status()).toBe(422);
    expect((await request.post("/api/scan", { multipart: { video: fakeClip(4_100_000), petId: "p1" } })).status()).toBe(413);
    expect((await request.post("/api/scan", { data: "not a form", headers: { "Content-Type": "text/plain" } })).status()).toBe(400);
  });

  test("the ML service response parses with the contract (runs when ML_API_URL is set)", async ({ request }) => {
    test.skip(!process.env.ML_API_URL, "ML_API_URL not set");
    const res = await request.post(`${process.env.ML_API_URL!.replace(/\/$/, "")}/analyze`, { multipart: { video: fakeClip(), petId: "p1", species: "dog", scanType: "walk" }, timeout: 30_000 });
    expect(res.ok()).toBe(true);
    const parsed = ClipResultSchema.safeParse(await res.json());
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues)).toBe(true);
  });
});

const LAB = /Black Labrador in the living room/;
const HEALTHY = /Healthy dog on a city walk/;

test("Movement check (top of Health): nothing autoplays; a demo walk plays once, the uneven leg turns red, Analyse gives the result and it feeds Earlier checks", async ({ page }) => {
  const { errors, requests } = watch(page);
  await seedPet(page, { checkins: 6 });
  await page.goto("/walk");
  await expect(page.locator("#movement")).toHaveCount(0); // not on the walk page
  await page.goto("/dashboard#pet-scanner"); // old links open Health at the Movement check
  await expect(page.getByRole("tab", { name: "Health" })).toHaveAttribute("aria-selected", "true");
  const check = page.locator("#movement").getByTestId("movement-check");
  await expect(check.getByRole("heading", { name: /Ten seconds of walking/ })).toBeVisible();
  // The demo walks first: the owner videos and the open-licence samples. Nothing is loaded, let alone playing.
  await expect(check.getByRole("button", { name: LAB })).toBeVisible();
  await expect(check.getByRole("button", { name: HEALTHY })).toBeVisible();
  await expect(check.getByText(/Owner videos shared publicly on Reddit.*CC BY-SA 3\.0.*CC0/)).toBeVisible();
  await expect(check.locator("video")).toHaveCount(0);
  // Pick the Labrador: the skeleton plays once, then the hind end is flagged in red.
  await check.getByRole("button", { name: LAB }).click();
  await expect(check).toHaveAttribute("data-phase", "live", { timeout: 15_000 });
  await expect(check.getByRole("alert")).toContainText("Uneven steps spotted: hind", { timeout: 20_000 });
  await check.getByRole("button", { name: "Analyse Biscuit's walk" }).click();
  await expect(check).toHaveAttribute("data-phase", "done", { timeout: 15_000 });
  await expect(check.getByRole("heading", { name: /A change worth/ })).toBeVisible();
  await expect(check.getByText("Movement check result").first()).toBeVisible();
  // A dog result for a dog is saved as a check, so it shows under Earlier checks. Nothing was sent anywhere.
  await expect(page.getByTestId("dashboard-mobility")).toContainText("Mobility 68");
  expect(requests.filter((r) => r.method === "POST")).toEqual([]);
  expect(errors).toEqual([]);
});

test("Movement check: the healthy demo walk reads even, with nothing to act on", async ({ page }) => {
  const { errors } = watch(page);
  await seedPet(page);
  await page.goto("/dashboard#movement");
  const check = page.locator("#movement").getByTestId("movement-check");
  await check.getByRole("button", { name: HEALTHY }).click();
  await expect(check.getByText("Steps look even so far.", { exact: false })).toBeVisible({ timeout: 20_000 });
  await expect(check.getByRole("alert")).toHaveCount(0);
  await check.getByRole("button", { name: /^Analyse/ }).click();
  await expect(check.getByRole("heading", { name: /Moving evenly/ })).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("pet names are shown capitalised", async ({ page }) => {
  await seedPet(page, { name: "biscuit" });
  await page.goto("/walk");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello, Biscuit.");
  await expect(page.getByText(/\bbiscuit\b/)).toHaveCount(0);
  await page.goto("/dashboard#movement");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Biscuit");
  await expect(page.getByText(/\bbiscuit\b/)).toHaveCount(0);
});

test("server mode with a dead model: /api/scan falls back to the mock within 20 s", async ({ request }) => {
  test.skip(!process.env.QA_VIDEO_SERVER, "needs a build with NEXT_PUBLIC_VIDEO_MODE=server and a dead ML_API_URL");
  const t0 = Date.now();
  const api = await request.post("/api/scan", { multipart: { video: fakeClip(), petId: "p1", species: "dog", scanType: "walk" }, timeout: 25_000 });
  const body = await api.json();
  expect(Date.now() - t0).toBeLessThan(20_000);
  expect(body.source).toBe("mock");
  expect(body.fallbackReason).toMatch(/Model (unavailable|timed out)/);
});
