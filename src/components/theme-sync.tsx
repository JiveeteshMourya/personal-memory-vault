"use client";

import { useLayoutEffect } from "react";

import { applyTheme, readStoredTheme } from "@/lib/theme";

// In development, Strict Mode remounts the root layout and resets <html> to the attributes it
// renders, dropping the `.dark` class the inline theme script added. Re-apply it before paint.
// In production this is a no-op: the class is already correct.
export function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme(readStoredTheme());
  }, []);

  return null;
}
