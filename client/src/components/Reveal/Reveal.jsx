import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

// Fades and lifts its children in the first time they scroll into view. Content is simply
// visible without IntersectionObserver or for visitors who prefer reduced motion.
const Reveal = ({ as: Tag = "div", delay = 0, className, children, ...props }) => {
  const ref = useRef(null);
  const [shown, setShown] = useState(() => {
    if (typeof window === "undefined") return true;
    return !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (shown || !ref.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : undefined }}
      className={cn("transition duration-700 ease-out", shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0", className)}
      {...props}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
