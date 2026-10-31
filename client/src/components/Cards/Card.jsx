import React, { useState } from "react";
import { Plane } from "lucide-react";
import Ticket from "../Ticket/Ticket";

const Field = ({ label, value }) => (
  <div>
    <dt className="text-xs font-extrabold text-ink-soft">{label}</dt>
    <dd className="text-base font-bold text-ink">{value}</dd>
  </div>
);

// A trip rendered as a boarding pass; the whole ticket opens the trip.
const Card = ({ title, start, end, imageUrl, onClick }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = imageUrl && !imageFailed;

  return (
    <Ticket
      as="button"
      type="button"
      onClick={onClick}
      className="w-full rounded-none border-0 bg-transparent p-0 text-left transition duration-200 hover:-translate-y-1 hover:drop-shadow-ticket-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
      main={
        <>
          <h3 className="font-display text-2xl leading-tight text-ink">{title}</h3>
          <dl className="mt-4 flex gap-8">
            <Field label="Departs" value={start} />
            <Field label="Returns" value={end} />
          </dl>
        </>
      }
      stubClassName="h-28 overflow-hidden bg-lagoon-light sm:h-auto"
      stub={
        showImage ? (
          <img
            src={imageUrl}
            alt=""
            onError={() => setImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink">
            <Plane size={36} aria-hidden="true" />
          </div>
        )
      }
    />
  );
};

export default Card;
