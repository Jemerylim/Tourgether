import React, { useState } from "react";
import { ChevronDown, ImageOff, Plus } from "lucide-react";
import { placeGroup } from "../../../lib/places";
import { cn } from "../../../lib/utils";

// Sideways strip of sights near the trip that aren't on this list yet, each with a +
// to save it. Scroll-snaps on touch; the arrow pages it on desktop.
const Recommendations = ({ places, loading, onAdd }) => {
  const [open, setOpen] = useState(true);
  const [strip, setStrip] = useState(null);
  const [group, setGroup] = useState("All");
  if (!loading && places.length === 0) return null;

  const groups = ["All", ...new Set(places.map(placeGroup))];
  const shown = group === "All" || !groups.includes(group) ? places : places.filter((place) => placeGroup(place) === group);

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-sm font-extrabold text-ink-soft hover:text-ink"
      >
        <ChevronDown size={16} className={cn("transition-transform", !open && "-rotate-90")} aria-hidden="true" />
        Recommended places
      </button>
      {open && !loading && groups.length > 2 && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filter recommendations">
          {groups.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={name === group}
              onClick={() => setGroup(name)}
              className={cn(
                "rounded-full border-0 px-3 py-1 text-xs font-extrabold transition",
                name === group ? "bg-ink text-white" : "bg-lagoon-light text-ink hover:bg-sky"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="relative mt-2">
          <ul ref={setStrip} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {loading
              ? [0, 1, 2].map((index) => (
                  <li key={index} className="h-14 w-56 shrink-0 animate-pulse rounded-xl bg-lagoon-light motion-reduce:animate-none" />
                ))
              : shown.map((place) => (
                  <li key={place.sourceId} className="flex w-60 shrink-0 snap-start items-center gap-3 overflow-hidden rounded-xl border border-ink/10 bg-white pr-2">
                    {place.imageUrl ? (
                      <img src={place.imageUrl} alt="" loading="lazy" className="h-14 w-14 shrink-0 object-cover" />
                    ) : (
                      <span className="grid h-14 w-14 shrink-0 place-items-center bg-lagoon-light text-ink-soft">
                        <ImageOff size={18} aria-hidden="true" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink" title={place.name}>{place.name}</span>
                      <span className="block truncate text-xs text-ink-soft">{place.category || place.description}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Add ${place.name}`}
                      onClick={() => onAdd(place)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-0 bg-lagoon-light p-0 text-ink hover:bg-sky"
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
          </ul>
        </div>
      )}
      {open && strip && !loading && shown.length > 2 && (
        <button
          type="button"
          className="mt-1 border-0 bg-transparent p-0 text-xs font-bold text-ink-soft underline hover:text-ink"
          onClick={() => strip.scrollBy({ left: strip.clientWidth * 0.8, behavior: "smooth" })}
        >
          More suggestions
        </button>
      )}
    </div>
  );
};

export default Recommendations;
