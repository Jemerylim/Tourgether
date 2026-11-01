import React, { useState } from "react";
import { CalendarCheck, CalendarPlus, ChevronDown, ExternalLink, Footprints, Pencil, Trash2, X } from "lucide-react";
import PlaceSearch from "../../../components/PlaceSearch/PlaceSearch";
import { describeLeg, mapsLink } from "../../../lib/places";
import { cn } from "../../../lib/utils";
import NumberPin from "./NumberPin";
import Recommendations from "./Recommendations";

const ROW_BUTTON =
  "grid h-7 w-7 shrink-0 place-items-center rounded-full border-0 bg-transparent p-0 text-ink-soft opacity-100 hover:bg-lagoon-light hover:text-ink sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover/row:opacity-100";

// One named list of places, numbered to match its pins, with the walk between each
// and which day of the itinerary each is planned for
const PlaceListCard = ({
  list,
  colour,
  places,
  legs,
  schedule,
  recommendations,
  recommendationsLoading,
  near,
  userId,
  isOrganiser,
  canPlan,
  activeId,
  onHover,
  onFocus,
  onAdd,
  onRemove,
  onRename,
  onDelete,
  onPlan,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(list.name);
  const savedIds = new Set(places.map((place) => place.sourceId).filter(Boolean));
  const suggestions = recommendations.filter((place) => !savedIds.has(place.sourceId));
  const planned = places.filter((place) => schedule.has(place._id)).length;

  const finishRename = async () => {
    setRenaming(false);
    const next = name.trim();
    if (!next || next === list.name) return setName(list.name);
    if (!(await onRename(list, next))) setName(list.name);
  };

  return (
    <article className="rounded-3xl bg-white p-5 drop-shadow-ticket">
      <div className="group/head flex items-center gap-2">
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Show ${list.name}` : `Hide ${list.name}`}
          onClick={() => setCollapsed((value) => !value)}
          className="grid h-8 w-8 place-items-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-lagoon-light"
        >
          <ChevronDown size={18} className={cn("transition-transform", collapsed && "-rotate-90")} aria-hidden="true" />
        </button>
        {renaming ? (
          <input
            autoFocus
            aria-label="List name"
            maxLength={40}
            className="field flex-1 py-1.5 font-display text-2xl"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={finishRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setName(list.name);
                setRenaming(false);
              }
            }}
          />
        ) : (
          <h3 className="min-w-0 flex-1 truncate font-display text-2xl text-ink">{list.name}</h3>
        )}
        {places.length > 0 && (
          <span className="text-sm font-extrabold tabular-nums text-ink-soft" title="Places planned into a day">
            {planned}/{places.length} planned
          </span>
        )}
        {!renaming && (
          <button
            type="button"
            aria-label={`Rename ${list.name}`}
            onClick={() => setRenaming(true)}
            className="grid h-8 w-8 place-items-center rounded-full border-0 bg-transparent p-0 text-ink-soft hover:bg-lagoon-light hover:text-ink"
          >
            <Pencil size={15} aria-hidden="true" />
          </button>
        )}
        {isOrganiser && !renaming && (
          <button
            type="button"
            aria-label={`Delete ${list.name}`}
            onClick={() => onDelete(list)}
            className="grid h-8 w-8 place-items-center rounded-full border-0 bg-transparent p-0 text-ink-soft hover:bg-lagoon-light hover:text-ink"
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          {places.length > 0 && (
            <ol className="mt-3 space-y-2">
              {places.map((place, index) => {
                const days = schedule.get(place._id) || [];
                return (
                  <li
                    key={place._id}
                    id={`place-${place._id}`}
                    onMouseEnter={() => onHover(place._id)}
                    onMouseLeave={() => onHover(null)}
                  >
                    <div className="group/row flex items-start gap-3">
                      <NumberPin colour={colour} number={index + 1} />
                      <div
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-paper py-2 pl-4 pr-2 ring-2 transition",
                          activeId === place._id ? "ring-lagoon" : "ring-transparent"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onFocus(place)}
                          className="min-w-0 flex-1 border-0 bg-transparent p-0 py-1 text-left"
                        >
                          <span className="block truncate font-bold text-ink">{place.name}</span>
                          {(place.category || place.address) && (
                            <span className="block truncate text-sm text-ink-soft">
                              {[place.category, place.address].filter(Boolean).join(" · ")}
                            </span>
                          )}
                          {days.length > 0 && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-lagoon-light px-2 py-0.5 text-xs font-extrabold text-ink">
                              <CalendarCheck size={12} aria-hidden="true" />
                              {days.map((day) => `${day.number ? `Day ${day.number}` : day.date} · ${day.startTime}`).join(", ")}
                            </span>
                          )}
                        </button>
                        {place.imageUrl && (
                          <img src={place.imageUrl} alt="" loading="lazy" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                        )}
                        {canPlan && (
                          <button
                            type="button"
                            aria-label={`Add ${place.name} to a day`}
                            title="Add to a day"
                            onClick={() => onPlan(place)}
                            className={cn(ROW_BUTTON, days.length === 0 && "text-lagoon sm:opacity-100")}
                          >
                            <CalendarPlus size={15} aria-hidden="true" />
                          </button>
                        )}
                        <a
                          href={mapsLink(place)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${place.name} in Google Maps`}
                          className={ROW_BUTTON}
                        >
                          <ExternalLink size={14} aria-hidden="true" />
                        </a>
                        {(isOrganiser || place.addedBy === userId) && (
                          <button type="button" aria-label={`Remove ${place.name}`} onClick={() => onRemove(place)} className={ROW_BUTTON}>
                            <X size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                    {legs?.[index] && (
                      <p className="ml-10 mt-1.5 flex items-center gap-1.5 text-xs font-bold text-ink-soft">
                        <Footprints size={13} aria-hidden="true" />
                        {describeLeg(legs[index])}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          <PlaceSearch
            className="mt-3"
            label={`Add a place to ${list.name}`}
            near={near}
            onPick={(place) => onAdd(list, place)}
          />
          <Recommendations places={suggestions} loading={recommendationsLoading} onAdd={(place) => onAdd(list, place)} />
        </>
      )}
    </article>
  );
};

export default PlaceListCard;
