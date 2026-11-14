"use client";

import { X } from "@phosphor-icons/react";
import { dismissToast, useToast } from "@/lib/toast";

/** Bottom toast with an optional action (Undo). Announced politely to screen readers. */
export function Toaster() {
  const t = useToast();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      {t && (
        <div key={t.id} role="status" className="fade-up pointer-events-auto flex max-w-md items-center gap-3 rounded-full border border-line bg-surface py-1.5 pl-5 pr-1.5 text-sm text-ink shadow-lift">
          <span>{t.message}</span>
          {t.action && (
            <button type="button" onClick={t.action.run} className="min-h-11 rounded-full px-3 font-semibold underline underline-offset-4 hover:bg-ink/5">
              {t.action.label}
            </button>
          )}
          <button type="button" onClick={dismissToast} aria-label="Dismiss" className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-ink/5">
            <X size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
