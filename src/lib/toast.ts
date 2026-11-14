"use client";
import { useSyncExternalStore } from "react";

/** Tiny toast store: one message at a time, with an optional action such as Undo. */
export type Toast = { id: number; message: string; action?: { label: string; run: () => void } };

let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(message: string, action?: Toast["action"], ms = 6000) {
  clearTimeout(timer);
  current = { id: Date.now(), message, action };
  emit();
  timer = setTimeout(dismissToast, ms);
}

export function dismissToast() {
  clearTimeout(timer);
  current = null;
  emit();
}

/** Show an "X removed. Undo" toast for something that returned an undo function. */
export function undoable(message: string, undo: () => void) {
  toast(message, {
    label: "Undo",
    run: () => {
      undo();
      dismissToast();
    },
  });
}

export function useToast() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );
}
