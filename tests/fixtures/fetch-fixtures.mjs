// Downloads test photos at test time (third-party images are not committed) and generates synthetic ones.
// Usage: node tests/fixtures/fetch-fixtures.mjs   (macOS: uses `sips` to convert the synthetic images to JPEG)
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const ua = { headers: { "User-Agent": "prevently-qa" } };

async function dogCeo(breed, file) {
  if (existsSync(join(dir, file))) return;
  const { message } = await (await fetch(`https://dog.ceo/api/breed/${breed}/images/random`, ua)).json();
  writeFileSync(join(dir, file), Buffer.from(await (await fetch(message, ua)).arrayBuffer()));
}
async function url(u, file) {
  if (existsSync(join(dir, file))) return;
  const r = await fetch(u, { ...ua, redirect: "follow" });
  if (!r.ok) throw new Error(`${u} -> ${r.status}`);
  writeFileSync(join(dir, file), Buffer.from(await r.arrayBuffer()));
}
/** A simple PPM: a coloured background with a centred blob, converted to JPEG. Deterministic. */
function synthetic(file, bg, blob) {
  if (existsSync(join(dir, file))) return;
  const w = 400, h = 400, head = `P6\n${w} ${h}\n255\n`;
  const px = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const inBlob = ((x - 200) / 110) ** 2 + ((y - 215) / 135) ** 2 < 1 || ((x - 200) / 80) ** 2 + ((y - 110) / 70) ** 2 < 1;
    const c = inBlob ? blob : bg;
    px.set(c, (y * w + x) * 3);
  }
  const ppm = join(dir, file.replace(/\.jpg$/, ".ppm"));
  writeFileSync(ppm, Buffer.concat([Buffer.from(head), px]));
  execFileSync("sips", ["-s", "format", "jpeg", ppm, "--out", join(dir, file)], { stdio: "ignore" });
}

await dogCeo("labrador", "dog-golden.jpg");
await dogCeo("samoyed", "dog-white.jpg");
await dogCeo("newfoundland", "dog-black.jpg");
await url("https://cataas.com/cat?width=600&type=square", "cat.jpg");
// A real photo with no animal in it. Try a few public sources.
for (const u of [
  "https://commons.wikimedia.org/wiki/Special:FilePath/Tour_Eiffel_Wikimedia_Commons.jpg?width=800",
  "https://picsum.photos/id/1018/800/600.jpg",
]) {
  try {
    await url(u, "not-a-pet.jpg");
    break;
  } catch (e) {
    console.warn("fixture source failed:", e.message);
  }
}
synthetic("grey-pet-green-bg.jpg", [46, 139, 87], [128, 128, 128]);
synthetic("black-pet-teal-bg.jpg", [40, 150, 160], [22, 22, 22]);
console.log("fixtures ready in", dir);
