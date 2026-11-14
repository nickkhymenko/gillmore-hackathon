"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";

/**
 * Bottom sheet on phones, centred dialog on desktop. Native <dialog> gives focus trapping,
 * Escape to close and an inert background for free.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="m-0 mt-auto w-full max-w-none rounded-t-[12px] border border-line bg-paper p-0 text-ink backdrop:bg-ink/40 sm:m-auto sm:max-w-lg sm:rounded-brand"
    >
      <div className="fade-up space-y-4 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 className="display text-3xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-brand hover:bg-ink/5">
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

/** The standard "not built yet" sheet, so no button is ever dead. */
export function PilotSheet({ open, onClose, what }: { open: boolean; onClose: () => void; what: string }) {
  return (
    <Sheet open={open} onClose={onClose} title="Coming in the pilot">
      <p className="text-muted">{what} is part of the 12-week pilot with an insurer partner. In this prototype nothing is booked, charged or sent.</p>
      <button type="button" onClick={onClose} className="btn btn-primary">
        Got it
      </button>
    </Sheet>
  );
}
