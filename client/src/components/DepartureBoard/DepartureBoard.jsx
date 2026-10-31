import React, { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

const destinations = ["Kyoto", "Lisbon", "Bali", "Reykjavík", "Cape Town", "Hanoi", "Oaxaca", "Seoul"];

// Split-flap style "next stop" tile. Decorative, so hidden from screen readers,
// and it holds still when the visitor prefers reduced motion.
const DepartureBoard = ({ className }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % destinations.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div aria-hidden="true" className={cn("flex items-center gap-3", className)}>
      <span className="text-sm font-extrabold text-ink">Next stop</span>
      <span className="inline-flex min-w-[10rem] justify-center rounded-xl bg-ink px-4 py-2 shadow-float [perspective:400px]">
        <span key={index} className="inline-block animate-flip font-extrabold uppercase tracking-[0.2em] text-mustard">
          {destinations[index]}
        </span>
      </span>
    </div>
  );
};

export default DepartureBoard;
