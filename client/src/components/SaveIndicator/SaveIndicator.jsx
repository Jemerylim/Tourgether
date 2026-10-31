// Pattern from https://21st.dev/@klyv-ui/components/save-indicator
import React from "react";
import { Check, Loader2 } from "lucide-react";

// Small status line under an autosaving field: saving, saved or failed (with retry).
// `status` is "idle" | "saving" | "saved" | "error".
const SaveIndicator = ({ status, onRetry }) => {
  let content = null;
  if (status === "saving") {
    content = (
      <>
        <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Saving...
      </>
    );
  } else if (status === "saved") {
    content = (
      <>
        <Check size={14} aria-hidden="true" /> Saved just now
      </>
    );
  } else if (status === "error") {
    content = (
      <span className="font-bold text-red-700">
        Couldn't save your notes.{" "}
        <button type="button" onClick={onRetry} className="border-0 bg-transparent p-0 font-extrabold text-plum underline">
          Retry
        </button>
      </span>
    );
  }

  return (
    <p aria-live="polite" className="mt-1 flex min-h-[1.25rem] items-center gap-1.5 text-sm text-ink-soft">
      {content}
    </p>
  );
};

export default SaveIndicator;
