import { DEFAULT_THEME, isHex, type ThemeTokens } from "./palette";
import type { SizeClass, Species } from "./types";

/**
 * Design tokens. The page reads four CSS variables (--bg, --accent, --accent-soft, --dark) that are
 * registered with @property in globals.css, so changing them animates the whole page.
 * Without a photo the theme comes from the species; with a photo it comes from the pet itself.
 */
export const THEME_KEY = "prevently.theme";

export const TOKENS = {
  ink: "#141414",
  muted: "#5E5E5E",
  radius: 6,
  maxWidth: 1200,
  ...DEFAULT_THEME,
};

/** Fallback coat colours and page theme per species, used before a photo is uploaded. */
export const SPECIES_THEME: Record<Species, { label: string; plural: string; coat: [string, string]; theme: ThemeTokens }> = {
  dog: { label: "Dog", plural: "dogs", coat: ["#C9A36B", "#F2E6D0"], theme: DEFAULT_THEME },
  cat: { label: "Cat", plural: "cats", coat: ["#8E9196", "#EDEBE6"], theme: { bg: "#F5F5F1", accent: "#F2C14E", accentSoft: "#FBEFC9", dark: "#111213" } },
  rabbit: { label: "Rabbit", plural: "rabbits", coat: ["#D8CBB8", "#FBF7F0"], theme: { bg: "#F7F4EE", accent: "#F4B6A6", accentSoft: "#FBE4DD", dark: "#141110" } },
  horse: { label: "Horse", plural: "horses", coat: ["#8B5A3C", "#F1E7DA"], theme: { bg: "#F6F3EC", accent: "#D9A441", accentSoft: "#F4E4C3", dark: "#12100D" } },
  other: { label: "Other", plural: "pets", coat: ["#B9A98F", "#F2ECE2"], theme: DEFAULT_THEME },
};

/** Size class tokens: avatar scale and the plain-English label. */
export const SIZE_THEME: Record<SizeClass, { label: string; scale: number; hint: string }> = {
  toy: { label: "Toy", scale: 0.8, hint: "under 5 kg" },
  small: { label: "Small", scale: 0.86, hint: "5 to 10 kg" },
  medium: { label: "Medium", scale: 0.92, hint: "10 to 25 kg" },
  large: { label: "Large", scale: 0.97, hint: "25 to 45 kg" },
  giant: { label: "Giant", scale: 1, hint: "over 45 kg" },
};

const VARS: Record<keyof ThemeTokens, string> = { bg: "--bg", accent: "--accent", accentSoft: "--accent-soft", dark: "--dark" };

export function isTheme(t: unknown): t is ThemeTokens {
  return Boolean(t) && typeof t === "object" && (Object.keys(VARS) as (keyof ThemeTokens)[]).every((k) => isHex((t as ThemeTokens)[k]));
}

/** Apply a theme to the document. The CSS transition on :root does the animation. */
export function applyTheme(theme: ThemeTokens, persist = true) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  (Object.keys(VARS) as (keyof ThemeTokens)[]).forEach((k) => root.style.setProperty(VARS[k], theme[k]));
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.bg);
  if (!persist) return;
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  } catch {
    /* storage unavailable: theme still applies for this page view */
  }
}

export function resetTheme() {
  if (typeof document === "undefined") return;
  Object.values(VARS).forEach((v) => document.documentElement.style.removeProperty(v));
  try {
    localStorage.removeItem(THEME_KEY);
  } catch {}
}

/**
 * Runs in <head> before first paint so a returning owner never sees the default theme flash.
 * Values are validated as 6-digit hex before they touch the DOM.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(THEME_KEY)})||"null");if(!t)return;var m=${JSON.stringify(VARS)};var s=document.documentElement.style;for(var k in m){if(/^#[0-9a-fA-F]{6}$/.test(t[k]))s.setProperty(m[k],t[k])}}catch(e){}})()`;
