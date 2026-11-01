import React, { useState } from "react";
import dayjs from "dayjs";
import { AlertTriangle, CalendarPlus, Clock, Footprints, Loader2, Route } from "lucide-react";
import { describeLeg } from "../../../lib/places";
import { cn } from "../../../lib/utils";
import { gapBetween } from "./days";
import NumberPin from "./NumberPin";

export const DAY_COLOUR = "#0A7C84";
const UNPLANNED_SHOWN = 6;

// One day of the itinerary: its events in time order, the walk between each pair of
// stops (flagged when there isn't time for it), and the saved places not planned yet
const DayPlan = ({ day, stops, legs, unplanned, canPlan, activeId, optimising, onHover, onFocus, onPlan, onOptimise }) => {
  const [showAll, setShowAll] = useState(false);
  const placed = stops.filter((stop) => stop.place);
  let number = 0;

  return (
    <div className="space-y-6">
      <article className="rounded-3xl bg-white p-5 drop-shadow-ticket">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 flex-1 font-display text-2xl text-ink">
            Day {day.number} <span className="text-ink-soft">· {dayjs(day.date).format("dddd, D MMMM")}</span>
          </h3>
          {canPlan && placed.length >= 3 && (
            <button type="button" className="btn-ghost px-3 py-1.5" onClick={onOptimise} disabled={optimising}>
              {optimising ? (
                <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Route size={16} aria-hidden="true" />
              )}
              Shortest route
            </button>
          )}
        </div>

        {stops.length === 0 ? (
          <p className="mt-2 text-ink-soft">
            Nothing planned for this day yet.{canPlan && unplanned.length > 0 && " Add some of your saved places below."}
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {stops.map((stop) => {
              const placedIndex = stop.place ? number++ : -1;
              const leg = placedIndex > 0 ? legs?.[placedIndex - 1] : null;
              const gap = placedIndex > 0 ? gapBetween(placed[placedIndex - 1], stop) : null;
              const tight = leg && gap !== null && leg.duration / 60 > gap;
              return (
                <li
                  key={stop._id}
                  id={`place-${stop._id}`}
                  onMouseEnter={() => stop.place && onHover(stop._id)}
                  onMouseLeave={() => onHover(null)}
                >
                  {leg && (
                    <p
                      className={cn(
                        "mb-1.5 ml-10 flex flex-wrap items-center gap-1.5 text-xs font-bold",
                        tight ? "text-plum" : "text-ink-soft"
                      )}
                    >
                      {tight ? <AlertTriangle size={13} aria-hidden="true" /> : <Footprints size={13} aria-hidden="true" />}
                      {describeLeg(leg)}
                      {tight && <span>, but only {Math.max(gap, 0)} min between these</span>}
                    </p>
                  )}
                  <div className="flex items-start gap-3">
                    {stop.place ? (
                      <NumberPin colour={DAY_COLOUR} number={placedIndex + 1} />
                    ) : (
                      <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center text-ink-soft" aria-hidden="true">
                        <Clock size={16} />
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={!stop.place}
                      onClick={() => onFocus(stop)}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-3 rounded-2xl border-0 bg-paper py-2.5 pl-4 pr-3 text-left ring-2 transition disabled:cursor-default",
                        activeId === stop._id ? "ring-lagoon" : "ring-transparent"
                      )}
                    >
                      <span className="w-[5.5rem] shrink-0 text-sm font-extrabold tabular-nums text-ink">
                        {stop.startTime}–{stop.endTime}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-ink">{stop.title}</span>
                        <span className="block truncate text-sm text-ink-soft">{stop.place ? stop.place.name : "No place linked"}</span>
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </article>

      {canPlan && unplanned.length > 0 && (
        <article className="rounded-3xl bg-white p-5 drop-shadow-ticket">
          <h3 className="font-display text-xl text-ink">Saved, not planned yet</h3>
          <p className="text-sm text-ink-soft">Places from your lists that aren't on any day.</p>
          <ul className="mt-3 space-y-2">
            {(showAll ? unplanned : unplanned.slice(0, UNPLANNED_SHOWN)).map((place) => (
              <li key={place._id} className="flex items-center gap-3 rounded-2xl bg-paper py-2 pl-4 pr-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-ink">{place.name}</span>
                  <span className="block truncate text-xs text-ink-soft">{place.listName}</span>
                </span>
                <button type="button" className="btn-ghost shrink-0 px-3 py-1.5" onClick={() => onPlan(place, day.date)}>
                  <CalendarPlus size={15} aria-hidden="true" />
                  Add
                </button>
              </li>
            ))}
          </ul>
          {unplanned.length > UNPLANNED_SHOWN && (
            <button
              type="button"
              className="mt-2 border-0 bg-transparent p-0 text-xs font-bold text-ink-soft underline hover:text-ink"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? "Show fewer" : `Show all ${unplanned.length}`}
            </button>
          )}
        </article>
      )}
    </div>
  );
};

export default DayPlan;
