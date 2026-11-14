"use client";

import { useEffect } from "react";
import { loadHousehold } from "@/lib/store";
import { applyTheme, resetTheme } from "@/lib/theme";
import { useActivePet } from "@/lib/usePets";

/** Keeps the page theme in step with the active pet. Switching pets animates to that pet's palette. */
export function ThemeSync() {
  const { pet, ready } = useActivePet();
  const theme = pet?.theme;

  // Runs the one-time move from the single-pet storage format.
  useEffect(() => {
    loadHousehold();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (theme) applyTheme(theme);
    else resetTheme();
  }, [ready, theme]);

  return null;
}
