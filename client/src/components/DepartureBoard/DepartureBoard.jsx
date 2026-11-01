import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";

const destinations = ["Kyoto", "Lisbon", "Bali", "Reykjavík", "Cape Town", "Hanoi", "Oaxaca", "Seoul"];

// Split-flap style "next stop" tile. Decorative, so hidden from screen readers, and it
// holds still when the visitor prefers reduced motion. With `to` the tile is a link
// (the travel quiz, say) and is announced as one.
const DepartureBoard = ({ className, to }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % destinations.length), 2600);
    return () => clearInterval(id);
  }, []);

  const tile = (
    <span
      className={cn(
        "inline-flex min-w-[10rem] items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 shadow-float [perspective:400px]",
        to && "transition group-hover:-translate-y-0.5 group-hover:shadow-soft"
      )}
    >
      <span key={index} className="inline-block animate-flip font-extrabold uppercase tracking-[0.2em] text-mustard">
        {destinations[index]}
      </span>
      {to && <ArrowRight size={16} className="text-mustard" aria-hidden="true" />}
    </span>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label="Not sure where to go? Take the travel quiz"
        className={cn("group flex w-fit items-center gap-3 no-underline", className)}
      >
        <span className="text-sm font-extrabold text-ink">Next stop</span>
        {tile}
      </Link>
    );
  }

  return (
    <div aria-hidden="true" className={cn("flex items-center gap-3", className)}>
      <span className="text-sm font-extrabold text-ink">Next stop</span>
      {tile}
    </div>
  );
};

export default DepartureBoard;
