"use client";
import { extractPalette, type Swatch } from "./palette";

export type PreparedPhoto = {
  /** Compressed JPEG for the API (longest side 768px). */
  photo: { mimeType: "image/jpeg"; dataBase64: string };
  /** Small JPEG data URL kept in browser storage (longest side 360px). */
  thumb: string;
  swatches: Swatch[];
  /** How long the colour extraction took, in milliseconds. */
  paletteMs: number;
};

function draw(bitmap: ImageBitmap, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: maxSide <= 64 })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

/** JPEG for upload, as used by the check-in and the Pet Twin. */
export async function compressImage(file: File, maxSide = 768): Promise<{ mimeType: "image/jpeg"; dataBase64: string }> {
  const bitmap = await createImageBitmap(file);
  const { canvas } = draw(bitmap, maxSide);
  bitmap.close();
  return { mimeType: "image/jpeg", dataBase64: canvas.toDataURL("image/jpeg", 0.8).split(",")[1] };
}

/** One decode, three outputs: palette (instant), thumbnail and upload JPEG. */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file);
  try {
    const t0 = performance.now();
    const small = draw(bitmap, 64);
    const swatches = extractPalette(small.ctx.getImageData(0, 0, small.canvas.width, small.canvas.height));
    const paletteMs = performance.now() - t0;

    const thumb = draw(bitmap, 360).canvas.toDataURL("image/jpeg", 0.78);
    const dataBase64 = draw(bitmap, 768).canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
    return { photo: { mimeType: "image/jpeg", dataBase64 }, thumb, swatches, paletteMs };
  } finally {
    bitmap.close();
  }
}
