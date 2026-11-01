import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { HEADER_BUTTON } from "./constants";

// "..." button with a small menu, for actions that shouldn't sit next to the everyday ones
const MoreMenu = ({ label, children }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${HEADER_BUTTON} !px-2.5`}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-48 rounded-2xl bg-white p-1.5 shadow-soft ring-1 ring-ink/10" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
};

export default MoreMenu;
