// Adapted from https://21st.dev/@lailai0916/components/dialog
import React, { useEffect, useId, useRef } from "react";
import { cn } from "../../lib/utils";

// Page scroll is locked while any modal is open. A counter (not a saved "previous" value)
// keeps nested modals, e.g. a confirm dialog over a form, from restoring in the wrong order
// and leaving the page stuck unscrollable.
let openModals = 0;
const lockScroll = () => {
  openModals += 1;
  document.body.style.overflow = "hidden";
};
const unlockScroll = () => {
  openModals = Math.max(0, openModals - 1);
  if (openModals === 0) document.body.style.overflow = "";
};

// A modal on the native <dialog> element: the browser traps focus and closes on Escape.
// This adds body scroll lock, focus restore and a backdrop click that ignores drags
// which start inside the panel.
const Modal = ({ open, onClose, title, children, className }) => {
  const ref = useRef(null);
  const titleId = useId();
  const pointerStartedOutside = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return undefined;
    const previousFocus = document.activeElement;
    dialog.showModal();
    lockScroll();
    return () => {
      dialog.close();
      unlockScroll();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  const isOutside = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    return (
      event.target === event.currentTarget &&
      (event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom)
    );
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border-0 bg-white p-7 text-left text-ink-deep shadow-soft backdrop:bg-ink-deep/50",
        className
      )}
      onClose={(event) => {
        if (open && !event.currentTarget.open) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        pointerStartedOutside.current = isOutside(event);
      }}
      onPointerUp={(event) => {
        if (pointerStartedOutside.current && isOutside(event)) onClose();
        pointerStartedOutside.current = false;
      }}
    >
      {open && (
        <>
          <h2 id={titleId} className="font-display text-2xl text-ink">
            {title}
          </h2>
          <div className="mt-4">{children}</div>
        </>
      )}
    </dialog>
  );
};

export default Modal;
