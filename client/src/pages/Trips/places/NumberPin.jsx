import React from "react";

// Round badge with a stop's number, in the same colour as its pin on the map
const NumberPin = ({ colour, number }) => (
  <span
    className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-white text-xs font-extrabold text-white shadow-float"
    style={{ background: colour }}
    aria-hidden="true"
  >
    {number}
  </span>
);

export default NumberPin;
