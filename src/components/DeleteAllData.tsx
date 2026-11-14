"use client";

import { useState } from "react";
import { deleteAllData } from "@/lib/store";
import { undoable } from "@/lib/toast";

/** Footer link: UK GDPR right to erasure for everything Petra keeps in this browser. */
export function DeleteAllData() {
  const [confirming, setConfirming] = useState(false);
  if (!confirming)
    return (
      <button type="button" onClick={() => setConfirming(true)} className="link min-h-11 text-left sm:min-h-0">
        Delete all my data
      </button>
    );
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>Delete every pet, photo and check-in on this device?</span>
      <button
        type="button"
        className="link min-h-11 font-semibold text-red-800 sm:min-h-0"
        onClick={() => {
          setConfirming(false);
          undoable("All your data was deleted.", deleteAllData());
        }}
      >
        Yes, delete
      </button>
      <button type="button" className="link min-h-11 sm:min-h-0" onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </span>
  );
}
