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

test("dashboard video scan: live view, record 15 s, analyse; nothing uploaded in mock mode", async ({ page }) => {
  const { errors, requests } = watch(page);
  await seedPet(page);
  await page.goto("/dashboard#video");
  const panel = page.locator("#video");
  await panel.getByRole("button", { name: "Open camera" }).click();
  await expect(panel.getByLabel("Camera preview")).toBeVisible();
  await panel.getByRole("button", { name: "Live view" }).click();
  await expect(panel.getByRole("button", { name: "Stop live view" })).toBeVisible();
  await panel.getByRole("button", { name: /Record 15 seconds/ }).click();
  await expect(panel.getByRole("timer")).toBeVisible();
  await expect(panel.getByLabel("Your recording")).toBeVisible({ timeout: 25_000 });
  const before = requests.length;
  await panel.getByRole("button", { name: "Analyse" }).click();
  await expect(panel.getByText("Using demo analysis")).toBeVisible({ timeout: 10_000 });
  await expect(panel.getByText("Mobility", { exact: true })).toBeVisible();
  await expect(page.getByText(/\(demo\)/).first()).toBeVisible();
  // Mock mode analyses on the device: no request carries the video anywhere.
  expect(requests.slice(before).filter((r) => r.method === "POST")).toEqual([]);
  expect(requests.filter((r) => r.method === "POST" && r.url.includes("/api/scan"))).toEqual([]);
  // Sharing is the owner's choice and nothing is sent.
  await panel.getByRole("button", { name: "Send to my vet" }).click();
  await expect(page.getByRole("dialog")).toContainText("Coming in the pilot");
  expect(errors).toEqual([]);
});

test("camera denied: the file upload path works", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
  await seedPet(page);
  await page.goto("/dashboard#video");
  const panel = page.locator("#video");
  await panel.getByRole("button", { name: "Open camera" }).click();
  await expect(panel.getByText("Camera not available.")).toBeVisible();
  await panel.getByLabel("Upload a video of your pet").setInputFiles(fakeClip());
  await panel.getByRole("button", { name: "Analyse" }).click();
  await expect(panel.getByText("Using demo analysis")).toBeVisible({ timeout: 10_000 });
});
