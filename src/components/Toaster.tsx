"use client";

import { X } from "@phosphor-icons/react";
import { dismissToast, useToast } from "@/lib/toast";

/** Bottom toast with an optional action (Undo). Announced politely to screen readers. */
export function Toaster() {
  const t = useToast();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      {t && (
        <div key={t.id} role="status" className="fade-up pointer-events-auto flex max-w-md items-center gap-4 rounded-brand bg-ink py-2 pl-4 pr-2 text-sm text-white shadow-lg">
          <span>{t.message}</span>
          {t.action && (
            <button type="button" onClick={t.action.run} className="min-h-11 rounded-[4px] px-3 font-semibold text-accent underline underline-offset-4 hover:bg-white/10">
              {t.action.label}
            </button>
          )}
          <button type="button" onClick={dismissToast} aria-label="Dismiss" className="grid h-11 w-11 place-items-center rounded-[4px] text-white/70 hover:bg-white/10">
            <X size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
