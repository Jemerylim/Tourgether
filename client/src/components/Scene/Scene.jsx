import React from "react";
import { cn } from "../../lib/utils";

const Cloud = ({ className }) => (
  <svg viewBox="0 0 120 56" className={className} aria-hidden="true">
    <path
      fill="#fff"
      d="M22 56a22 22 0 0 1-2-43.9A30 30 0 0 1 76 8a24 24 0 0 1 36 20.5A14 14 0 0 1 106 56Z"
    />
  </svg>
);

// Sky, setting sun, clouds and rolling hills. The front hill is the page colour,
// so whatever follows the scene continues it without a seam.
// `cover` is an optional photo that fades in from the right of the sky, for pages about
// one place (a trip). Clouds drift slowly unless the visitor prefers reduced motion.
const Scene = ({ className, sunClassName, cover, children }) => (
  <div
    className={cn(
      "relative isolate overflow-hidden bg-gradient-to-b from-sky via-lagoon-light to-lagoon-light",
      className
    )}
  >
    <div
      aria-hidden="true"
      className={cn(
        "absolute -z-10 h-72 w-72 rounded-full bg-gradient-to-b from-mustard to-orange",
        sunClassName
      )}
    />
    <Cloud className="absolute left-[1%] top-[16%] -z-10 hidden w-32 animate-drift opacity-90 lg:block" />
    <Cloud className="absolute right-[34%] top-[24%] -z-10 w-24 animate-drift-slow opacity-80 lg:hidden" />
    <Cloud className="absolute left-[42%] top-[12%] -z-10 w-20 animate-drift-slow opacity-70" />
    <Cloud className="absolute right-[4%] top-[48%] -z-10 w-24 animate-drift opacity-80" />

    {cover && (
      <img
        src={cover}
        alt=""
        className="absolute inset-y-0 right-0 -z-10 h-full w-full object-cover opacity-30 [mask-composite:intersect] [-webkit-mask-composite:source-in] [mask-image:linear-gradient(to_left,#000_20%,transparent_95%),linear-gradient(to_bottom,transparent_70px,#000_40%)] sm:w-1/2 sm:opacity-90 sm:[mask-image:linear-gradient(to_left,#000_30%,transparent),linear-gradient(to_bottom,transparent_70px,#000_45%)]"
      />
    )}

    <svg
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 -z-10 h-[34%] min-h-[180px] w-full"
      viewBox="0 0 1440 400"
      preserveAspectRatio="none"
    >
      <path fill="#A9D9D6" d="M0 150C240 70 430 100 640 150C870 205 1090 60 1440 120V400H0Z" />
      <path fill="#F6C453" d="M0 255C250 185 520 225 770 245C1010 265 1230 195 1440 225V400H0Z" />
      <path fill="#FFFDF7" d="M0 330C290 285 630 320 900 308C1140 298 1300 280 1440 296V400H0Z" />
    </svg>

    {children}
  </div>
);

export default Scene;
