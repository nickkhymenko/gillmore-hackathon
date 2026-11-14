"use client";

import { usePathname, useRouter } from "next/navigation";
import { deleteAllData } from "@/lib/store";
import { resetTheme } from "@/lib/theme";
import { undoable } from "@/lib/toast";

/**
 * Footer link for the presenter: clears every Petra key in this browser (pets, check-ins, walks, scans and the
 * Petra Plus membership) and goes back to the start. Undo is offered, so a slip on stage is not fatal.
 */
export function ResetDemo() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <button
      type="button"
      className="link min-h-11 text-left sm:min-h-0"
      onClick={() => {
        undoable("Demo reset. Everything on this device was cleared.", deleteAllData());
        resetTheme();
        if (pathname !== "/") router.push("/");
      }}
    >
      Reset demo
    </button>
  );
}
