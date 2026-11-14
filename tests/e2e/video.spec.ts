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

const PILOT = "Live analysis of your own videos is coming in the pilot. Try a demo walk.";

test("dashboard Movement tab: the demo walk analyses in one tap; the result feeds the dashboard and the Walks tab; Send to my vet needs a tap", async ({ page }) => {
  const { errors, requests } = watch(page);
  await seedPet(page, { checkins: 6 });
  await page.goto("/walk");
  await expect(page.locator("#movement")).toHaveCount(0); // not on the walk any more
  await page.goto("/dashboard#movement");
  const stop = page.locator("#movement");
  await expect(page.getByRole("tab", { name: "Movement" })).toHaveAttribute("aria-selected", "true");
  await expect(stop.getByRole("heading", { name: "Movement check" })).toBeVisible();
  await expect(stop.getByRole("tab", { name: "Walk" })).toHaveAttribute("aria-selected", "true");
  await expect(stop.getByRole("radio", { name: "Demo walk" })).toHaveAttribute("aria-checked", "true");
  await expect(stop.getByRole("tab", { name: /Face|General/ })).toHaveCount(0);
  // the demo is one tap: Analyse
  await stop.getByRole("button", { name: "Analyse" }).click();
  await expect(stop.getByText("Moving")).toBeVisible({ timeout: 15_000 });
  await expect(stop.getByRole("img", { name: /^Symmetry: Even/ })).toBeVisible();
  await expect(stop.getByTestId("mobility-summary")).toHaveText("Mobility 89, in line with Biscuit's usual.");
  await expect(stop.getByText("Signs worth a vet's look, never a diagnosis.").first()).toBeVisible();
  // nothing is sent until the owner taps Send to my vet
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(requests.filter((r) => r.method === "POST")).toEqual([]);
  await stop.getByRole("button", { name: "Send to my vet" }).click();
  await expect(page.getByRole("dialog")).toContainText("Coming in the pilot");
  await page.keyboard.press("Escape");

  await expect(page.getByTestId("dashboard-mobility")).toHaveText("Mobility 89, in line with Biscuit's usual.");
  await expect(page.getByText("mobility 89 (demo walk)")).toBeVisible();
  await page.getByRole("tab", { name: "Walks" }).click();
  await expect(page.getByTestId("savings-health")).toContainText("demo walk): Mobility 89, in line with Biscuit's usual");
  expect(errors).toEqual([]);
});

test("/dashboard: the same Movement check; a cat demo walk gives the model's own amber result", async ({ page }) => {
  const { errors } = watch(page);
  await seedPet(page, { species: "cat", checkins: 3 });
  await page.goto("/dashboard#movement");
  const box = page.locator("#movement");
  await expect(box.getByRole("heading", { name: "Movement check" })).toBeVisible();
  // The clean dog walk is the default; the cat clip is the second option.
  await expect(box.getByRole("button", { name: /Clean result/ })).toHaveAttribute("aria-pressed", "true");
  await box.getByRole("button", { name: /Worth watching example.*Black cat walking on grass/ }).click();
  await expect(box.getByRole("button", { name: /Worth watching example/ })).toHaveAttribute("aria-pressed", "true");
  await box.getByRole("button", { name: "Analyse" }).click();
  await expect(box.getByText("Worth watching").first()).toBeVisible({ timeout: 15_000 });
  await expect(box.getByText("Leg to watch: hind left").first()).toBeVisible();
  await expect(box.getByTestId("mobility-summary")).toHaveText("Mobility 93, a change from Miso's usual.");
  await expect(page.getByTestId("dashboard-mobility")).toHaveText("Mobility 93, a change from Miso's usual.");
  await expect(box.getByText(/Credits: .*CC BY-SA 3\.0.*CC0/)).toBeVisible();
  await expect(box.getByText(/Reddit/)).toHaveCount(0);
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

test("an uploaded video in mock mode: no made-up result, the pilot message and a way to the demo", async ({ page }) => {
  test.skip(Boolean(process.env.QA_VIDEO_SERVER), "mock-mode build only");
  const { requests } = watch(page);
  await seedPet(page);
  await page.goto("/dashboard#movement");
  const box = page.locator("#movement");
  await box.getByRole("radio", { name: "Upload" }).click();
  await box.getByLabel("Upload a video of Biscuit").setInputFiles(fakeClip());
  await expect(box.getByText(PILOT)).toBeVisible();
  await expect(box.getByText(/Mobility \d/)).toHaveCount(0);
  await expect(box.getByRole("button", { name: "Analyse" })).toHaveCount(0);
  expect(requests.filter((r) => r.method === "POST")).toEqual([]);
  await box.getByRole("button", { name: "Try a demo walk" }).click();
  await expect(box.getByRole("radio", { name: "Demo walk" })).toHaveAttribute("aria-checked", "true");
  // sleeping breathing: own videos only, same honesty
  await box.getByRole("tab", { name: "Sleeping breathing" }).click();
  await expect(box.getByRole("radio", { name: "Demo walk" })).toHaveCount(0);
  await box.getByLabel("Upload a video of Biscuit").setInputFiles(fakeClip());
  await expect(box.getByText(PILOT)).toBeVisible();
});

test("camera: record, then the pilot message; camera denied falls back to upload", async ({ page }) => {
  test.skip(Boolean(process.env.QA_VIDEO_SERVER), "mock-mode build only");
  await seedPet(page);
  await page.goto("/dashboard#movement");
  const box = page.locator("#movement");
  await box.getByRole("radio", { name: "Camera" }).click();
  await box.getByRole("button", { name: "Open camera" }).click();
  await expect(box.getByLabel("Camera preview")).toBeVisible();
  await box.getByRole("button", { name: /Record 15 seconds/ }).click();
  await expect(box.getByRole("timer")).toBeVisible();
  await box.getByRole("button", { name: "Stop early" }).click();
  await expect(box.getByText(PILOT)).toBeVisible({ timeout: 10_000 });

  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
  await box.getByRole("button", { name: "Another video" }).click();
  await box.getByRole("button", { name: "Open camera" }).click();
  await expect(box.getByText("Camera not available.")).toBeVisible();
});

test("server mode with a dead model: /api/scan falls back to the mock within 20 s and the owner sees the pilot message, not mock numbers", async ({ page, request }) => {
  test.skip(!process.env.QA_VIDEO_SERVER, "needs a build with NEXT_PUBLIC_VIDEO_MODE=server and a dead ML_API_URL");
  const api = await request.post("/api/scan", { multipart: { video: fakeClip(), petId: "p1", species: "dog", scanType: "walk" } });
  const body = await api.json();
  expect(body.source).toBe("mock");
  expect(body.fallbackReason).toMatch(/Model (unavailable|timed out)/);

  const { requests, errors } = watch(page);
  await seedPet(page);
  await page.goto("/dashboard#movement");
  const box = page.locator("#movement");
  await box.getByRole("radio", { name: "Upload" }).click();
  await box.getByLabel("Upload a video of Biscuit").setInputFiles(fakeClip());
  await expect(box.getByText("sends this clip to the Petra scan service")).toBeVisible();
  expect(requests.filter((r) => r.method === "POST")).toEqual([]);
  const t0 = Date.now();
  await box.getByRole("button", { name: "Analyse" }).click();
  await expect(box.getByText(PILOT)).toBeVisible({ timeout: 25_000 });
  expect(Date.now() - t0).toBeLessThan(20_000);
  await expect(box.getByText(/Mobility \d/)).toHaveCount(0);
  const posts = requests.filter((r) => r.method === "POST").map((r) => new URL(r.url));
  expect(posts.map((u) => u.origin + u.pathname)).toEqual([new URL(page.url()).origin + "/api/scan"]);
  expect(errors).toEqual([]);
});
