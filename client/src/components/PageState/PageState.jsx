import React from "react";
import { Loader2, TriangleAlert } from "lucide-react";

export const LoadingState = ({ message = "Loading..." }) => (
  <div role="status" className="flex items-center justify-center gap-3 rounded-3xl bg-white py-20 text-ink-soft drop-shadow-ticket">
    <Loader2 size={22} className="animate-spin" aria-hidden="true" />
    {message}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div role="alert" className="flex flex-col items-start rounded-3xl bg-white p-8 drop-shadow-ticket sm:p-12">
    <TriangleAlert size={28} className="text-plum" aria-hidden="true" />
    <p className="mt-3 max-w-md font-bold text-ink">{message}</p>
    {onRetry && (
      <button type="button" className="btn-dark mt-5" onClick={onRetry}>
        Try again
      </button>
    )}
  </div>
);

// `action` is a ready-made button or link; `secondary` an optional second one;
// `image` is an illustration that stands on the card's bottom edge on wider screens.
export const EmptyState = ({ icon: Icon, title, text, action, secondary, image }) => (
  <div className="relative overflow-hidden rounded-3xl bg-white p-8 drop-shadow-ticket sm:p-12">
    <div className="relative z-10 flex flex-col items-start sm:max-w-[55%]">
      {Icon && (
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-mustard text-ink">
          <Icon size={28} aria-hidden="true" />
        </span>
      )}
      <h2 className="mt-5 font-display text-3xl text-ink">{title}</h2>
      {text && <p className="mt-2 max-w-sm text-ink-soft">{text}</p>}
      {(action || secondary) && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {action}
          {secondary}
        </div>
      )}
    </div>
    {image && (
      <img
        src={image}
        alt=""
        className="pointer-events-none absolute -bottom-4 right-4 hidden h-[110%] max-h-80 w-auto sm:block"
      />
    )}
  </div>
);
