/**
 * Photo to palette to theme. Pure functions, no dependencies, no AI.
 * extractPalette runs a small weighted k-means over a downsampled image (about 4,000 pixels),
 * which takes a few milliseconds, so the page can re-theme while the owner is still looking at the photo.
 */

export type RGB = [number, number, number];
export type Swatch = { hex: string; rgb: RGB; weight: number };
export type ThemeTokens = { bg: string; accent: string; accentSoft: string; dark: string };

export const INK = "#141414";
export const DEFAULT_THEME: ThemeTokens = { bg: "#F7F5F0", accent: "#FFD43B", accentSoft: "#FFF3C4", dark: "#121212" };

// ---------- colour maths ----------

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const isHex = (s: unknown): s is string => typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const h = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

/** Returns [hue 0..360, saturation 0..1, lightness 0..1]. */
export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

const hslHex = (h: number, s: number, l: number) => rgbToHex(hslToRgb(h, clamp(s, 0, 1), clamp(l, 0, 1)));

/** WCAG relative luminance. */
export function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio between two hex colours (1 to 21). */
export function contrast(a: string, b: string): number {
  const la = luminance(hexToRgb(a)), lb = luminance(hexToRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export const lighten = (hex: string, t: number) => mix(hex, "#FFFFFF", t);
export const darken = (hex: string, t: number) => mix(hex, "#000000", t);

// ---------- palette extraction ----------

type PixelSource = { data: Uint8ClampedArray | number[]; width: number; height: number };

/**
 * Weighted k-means in RGB. Pixels near the centre of the frame count more, because that is
 * where the pet usually is and the edges are usually grass, sofa or floor.
 * Deterministic: the same photo always gives the same palette.
 */
export function extractPalette(img: PixelSource, k = 5): Swatch[] {
  const { data, width, height } = img;
  const pts: number[] = []; // r, g, b, weight
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue;
      const dx = (x + 0.5) / width - 0.5, dy = (y + 0.5) / height - 0.5;
      const w = Math.exp(-(dx * dx + dy * dy) / (2 * 0.3 * 0.3));
      pts.push(data[i], data[i + 1], data[i + 2], w);
    }
  }
  const n = pts.length / 4;
  if (n === 0) return [];
  k = Math.min(k, n);

  const dist = (p: number, c: number[]) => {
    const dr = pts[p] - c[0], dg = pts[p + 1] - c[1], db = pts[p + 2] - c[2];
    return dr * dr + dg * dg + db * db;
  };

  // Maximin seeding: start from the heaviest pixel, then repeatedly take the pixel furthest from all centres.
  let first = 0;
  for (let p = 0; p < n; p++) if (pts[p * 4 + 3] > pts[first * 4 + 3]) first = p;
  const centres: number[][] = [[pts[first * 4], pts[first * 4 + 1], pts[first * 4 + 2]]];
  const nearest = new Float64Array(n).fill(Infinity);
  while (centres.length < k) {
    const last = centres[centres.length - 1];
    let best = 0, bestD = -1;
    for (let p = 0; p < n; p++) {
      const d = Math.min(nearest[p], dist(p * 4, last));
      nearest[p] = d;
      const score = d * pts[p * 4 + 3];
      if (score > bestD) { bestD = score; best = p; }
    }
    centres.push([pts[best * 4], pts[best * 4 + 1], pts[best * 4 + 2]]);
  }

  const weights = new Array<number>(k).fill(0);
  for (let iter = 0; iter < 8; iter++) {
    const sum = centres.map(() => [0, 0, 0, 0]);
    for (let p = 0; p < n; p++) {
      let bi = 0, bd = Infinity;
      for (let c = 0; c < k; c++) {
        const d = dist(p * 4, centres[c]);
        if (d < bd) { bd = d; bi = c; }
      }
      const w = pts[p * 4 + 3];
      sum[bi][0] += pts[p * 4] * w; sum[bi][1] += pts[p * 4 + 1] * w; sum[bi][2] += pts[p * 4 + 2] * w; sum[bi][3] += w;
    }
    for (let c = 0; c < k; c++) {
      weights[c] = sum[c][3];
      if (sum[c][3] > 0) centres[c] = [sum[c][0] / sum[c][3], sum[c][1] / sum[c][3], sum[c][2] / sum[c][3]];
    }
  }

  // Merge near-duplicates so we never show two swatches the eye reads as one colour.
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  const merged: { rgb: number[]; w: number }[] = [];
  centres
    .map((rgb, i) => ({ rgb, w: weights[i] }))
    .filter((c) => c.w > 0)
    .sort((a, b) => b.w - a.w)
    .forEach((c) => {
      const near = merged.find((m) => Math.hypot(m.rgb[0] - c.rgb[0], m.rgb[1] - c.rgb[1], m.rgb[2] - c.rgb[2]) < 28);
      if (near) {
        const t = c.w / (near.w + c.w);
        near.rgb = near.rgb.map((v, i) => v + (c.rgb[i] - v) * t);
        near.w += c.w;
      } else merged.push({ rgb: [...c.rgb], w: c.w });
    });

  return merged
    .sort((a, b) => b.w - a.w)
    .map((m) => {
      const rgb = m.rgb.map(Math.round) as RGB;
      return { rgb, hex: rgbToHex(rgb), weight: m.w / total };
    });
}

// ---------- theme derivation ----------

/**
 * Turn a palette into page tokens.
 *  - bg: a very light tint of the coat colour.
 *  - accent: the most saturated colour, lightened until near-black text on it passes WCAG AA (4.5:1).
 *  - dark: a near-black shade carrying the coat hue, for the dark band.
 * `coat` (hex colours from the vision model, most dominant first) takes priority over the raw photo
 * palette for the tint, because the photo palette can include background.
 * Black, white and grey pets have no usable coat hue, so the accent comes from the photo background
 * instead (the swatches furthest from the coat). Only a completely grey photo falls back to brand yellow.
 */
export function deriveTheme(swatches: Swatch[], coat: string[] = []): ThemeTokens {
  const coatSwatches: Swatch[] = coat.filter(isHex).map((hex, i) => ({ hex, rgb: hexToRgb(hex), weight: 0.5 / (i + 1) }));
  const all = [...coatSwatches, ...swatches];
  if (all.length === 0) return DEFAULT_THEME;

  const dominant = coatSwatches[0] ?? swatches[0];
  const [dh, ds] = rgbToHsl(dominant.rgb);
  const hasHue = ds >= 0.1;

  if (!hasHue) {
    // Neutral coat: look for colour in the background, ignoring anything close to the coat colours.
    const coatRgb = coatSwatches.length ? coatSwatches.map((c) => c.rgb) : [dominant.rgb];
    const background = swatches.filter((sw) => coatRgb.every((c) => Math.hypot(c[0] - sw.rgb[0], c[1] - sw.rgb[1], c[2] - sw.rgb[2]) > 40));
    const pick = pickAccent(background, 0.12);
    if (!pick) {
      const bg = hslHex(220, 0.08, 0.925);
      return { bg, accent: DEFAULT_THEME.accent, accentSoft: mix(bg, DEFAULT_THEME.accent, 0.35), dark: hslHex(220, 0.06, 0.08) };
    }
    const bg = hslHex(pick.h, clamp(pick.s, 0.2, 0.4), 0.925);
    const dark = hslHex(pick.h, 0.12, 0.08);
    return { bg, ...accentTokens(pick.h, pick.s, pick.l, dark), dark };
  }

  // Light enough for near-black body text (well above AAA), tinted enough that the change is visible.
  const bg = hslHex(dh, clamp(ds * 1.1, 0.3, 0.6), 0.905);
  const dark = hslHex(dh, clamp(ds * 0.5, 0.1, 0.28), 0.085);
  const pick = pickAccent(all, 0.2);
  if (!pick) return { bg, accent: DEFAULT_THEME.accent, accentSoft: mix(bg, DEFAULT_THEME.accent, 0.35), dark };
  return { bg, ...accentTokens(pick.h, pick.s, pick.l, dark), dark };
}

/** The most saturated, mid-light swatch, weighted a little by how much of the photo it covers. */
function pickAccent(swatches: Swatch[], minSaturation: number) {
  let best: { h: number; s: number; l: number; score: number } | null = null;
  for (const sw of swatches) {
    const [h, s, l] = rgbToHsl(sw.rgb);
    if (l < 0.15 || l > 0.9) continue;
    const score = s * Math.pow(sw.weight, 0.25) * (1 - Math.abs(l - 0.55));
    if (!best || score > best.score) best = { h, s, l, score };
  }
  return best && best.s >= minSaturation ? best : null;
}

/** Accent and soft accent for a hue, lightened until both AA checks pass. */
function accentTokens(h: number, sat: number, light: number, dark: string) {
  const s = clamp(sat * 1.3, 0.68, 0.92);
  let l = clamp(light, 0.52, 0.7);
  let accent = hslHex(h, s, l);
  // Clamp for accessibility: dark ink on the accent, and the accent on the dark band, must both pass AA.
  while ((contrast(accent, INK) < 4.5 || contrast(accent, dark) < 4.5) && l < 0.9) {
    l += 0.02;
    accent = hslHex(h, s, l);
  }
  return { accent, accentSoft: hslHex(h, s * 0.7, 0.9) };
}

/** Owner picked a swatch as the accent: keep the page tint and dark band, re-derive the accent from that colour. */
export function withAccent(theme: ThemeTokens, hex: string): ThemeTokens {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  if (s < 0.08) return { ...theme, accent: DEFAULT_THEME.accent, accentSoft: mix(theme.bg, DEFAULT_THEME.accent, 0.35) };
  return { ...theme, ...accentTokens(h, Math.max(s, 0.5), l, theme.dark) };
}

export const sameTheme = (a: ThemeTokens | null | undefined, b: ThemeTokens | null | undefined) =>
  Boolean(a && b && a.bg === b.bg && a.accent === b.accent && a.accentSoft === b.accentSoft && a.dark === b.dark);
