import React, { useState } from "react";
import { Plane, Trash2 } from "lucide-react";
import Ticket from "../Ticket/Ticket";

const Field = ({ label, value }) => (
  <div>
    <dt className="text-xs font-extrabold text-ink-soft">{label}</dt>
    <dd className="text-base font-bold text-ink">{value}</dd>
  </div>
);

// A trip rendered as a boarding pass; the whole ticket opens the trip. With `onDelete`, a
// delete button sits over the corner. `children` adds more detail under the dates; keep
// it non-interactive, since it sits inside the ticket's button. It's a sibling of the ticket, since a button can't
// nest inside the ticket's own button.
const Card = ({ title, start, end, imageUrl, badge, muted = false, onClick, onDelete, children }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = imageUrl && !imageFailed;

  const ticket = (
    <Ticket
      as="button"
      type="button"
      onClick={onClick}
      className="group w-full rounded-none border-0 bg-transparent p-0 text-left transition duration-200 hover:-translate-y-1 hover:drop-shadow-ticket-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
      mainClassName={onDelete ? "pr-14 sm:pr-6" : undefined}
      main={
        <>
          <h3 className="font-display text-2xl leading-tight text-ink">{title}</h3>
          <dl className="mt-4 flex gap-8">
            <Field label="Departs" value={start} />
            <Field label="Returns" value={end} />
          </dl>
          {children}
        </>
      }
      stubClassName="h-28 overflow-hidden bg-lagoon-light sm:h-auto"
      stub={
        <>
          {showImage ? (
            <img
              src={imageUrl}
              alt=""
              onError={() => setImageFailed(true)}
              className={`absolute inset-0 h-full w-full object-cover transition duration-200 ${
                muted ? "opacity-75 saturate-50 group-hover:opacity-100 group-hover:saturate-100" : ""
              }`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink">
              <Plane size={36} aria-hidden="true" />
            </div>
          )}
          {badge && (
            <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-3 py-1 text-xs font-extrabold text-ink shadow-float">
              {badge}
            </span>
          )}
        </>
      }
    />
  );

  if (!onDelete) return ticket;

  return (
    <div className="relative">
      {ticket}
      <button
        type="button"
        aria-label={`Delete ${title}`}
        title="Delete trip"
        onClick={onDelete}
        className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border-0 bg-paper/90 p-0 text-ink shadow-float transition hover:bg-white hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
};

export default Card;
