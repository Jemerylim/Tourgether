import React from "react";
import { cn } from "../../lib/utils";

// A boarding pass: a main section and a stub, with notches cut where they meet
// (see .ticket-cut-* in index.css). No outlines; the drop shadow follows the cut shape.
// Stacks on mobile, sits side by side from `sm` up unless `stacked` is set.
const Ticket = ({
  as: Tag = "div",
  main,
  stub,
  mainClassName,
  stubClassName,
  stacked = false,
  className,
  ...props
}) => (
  <Tag
    className={cn("flex flex-col drop-shadow-ticket", !stacked && "sm:flex-row", className)}
    {...props}
  >
    <div
      className={cn(
        "min-w-0 flex-1 rounded-t-3xl bg-white p-6 ticket-cut-b",
        !stacked && "sm:rounded-tr-none sm:rounded-bl-3xl sm:ticket-cut-r",
        mainClassName
      )}
    >
      {main}
    </div>
    <div
      className={cn(
        "relative rounded-b-3xl ticket-cut-t",
        !stacked && "sm:w-52 sm:rounded-bl-none sm:rounded-tr-3xl sm:ticket-cut-l",
        stubClassName
      )}
    >
      {stub}
    </div>
  </Tag>
);

export default Ticket;
