import React, { useState } from "react";
import {
  ArrowDownWideNarrow,
  CalendarCheck,
  CalendarPlus,
  ChevronDown,
  CircleCheck,
  ExternalLink,
  Footprints,
  Heart,
  Info,
  Pencil,
  StickyNote,
  Trash2,
  Vote,
  X,
} from "lucide-react";
import PlaceSearch from "../../../components/PlaceSearch/PlaceSearch";
import { describeLeg, mapsLink } from "../../../lib/places";
import { cn } from "../../../lib/utils";
import NumberPin from "./NumberPin";
import PlaceDetails from "./PlaceDetails";
import Recommendations from "./Recommendations";

const ROW_BUTTON =
  "grid h-7 w-7 shrink-0 place-items-center rounded-full border-0 bg-transparent p-0 text-ink-soft opacity-100 hover:bg-lagoon-light hover:text-ink sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover/row:opacity-100";

// One named list of places, numbered to match its pins, with the walk between each
// and which day of the itinerary each is planned for. Drag a row (or focus its number
// and use the arrow keys) to reorder; once the trip has started, places can be ticked off.
const PlaceListCard = ({
  list,
  lists,
  colour,
  places,
  legs,
  schedule,
  recommendations,
  recommendationsLoading,
  preferred,
  preferredFor,
  near,
  members,
  userId,
  isOrganiser,
  canPlan,
  tripStarted,
  sortByVotes,
  activeId,
  onHover,
  onFocus,
  onAdd,
  onRemove,
  onRename,
  onDelete,
  onPlan,
  onVote,
  onSaveNotes,
  onToggleSort,
  onAskGroup,
  onMove,
  onVisited,
  onReorder,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(list.name);
  const [dragId, setDragId] = useState(null);
  const savedIds = new Set(places.map((place) => place.sourceId).filter(Boolean));
  const suggestions = recommendations.filter((place) => !savedIds.has(place.sourceId));
  const planned = places.filter((place) => schedule.has(place._id)).length;
  const visited = places.filter((place) => place.visitedAt).length;
  // Sorting by votes is only a view, so the saved order can't be changed while it's on
  const canReorder = !sortByVotes && places.length > 1;

  const moveTo = (id, target) => {
    const ids = places.map((place) => place._id);
    const from = ids.indexOf(id);
    if (from === -1 || target < 0 || target >= ids.length || target === from) return;
    ids.splice(from, 1);
    ids.splice(target, 0, id);
    onReorder(list, ids);
  };

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
          <span
            className="text-sm font-extrabold tabular-nums text-ink-soft"
            title={tripStarted ? "Places the group has been to" : "Places planned into a day"}
          >
            {tripStarted ? `${visited}/${places.length} visited` : `${planned}/${places.length} planned`}
          </span>
        )}
        {!renaming && places.length > 1 && (
          <button
            type="button"
            aria-pressed={sortByVotes}
            aria-label="Sort by must-do votes"
            title={sortByVotes ? "Sorted by votes" : "Sort by votes"}
            onClick={onToggleSort}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full border-0 p-0 hover:bg-lagoon-light hover:text-ink",
              sortByVotes ? "bg-lagoon-light text-ink" : "bg-transparent text-ink-soft"
            )}
          >
            <ArrowDownWideNarrow size={15} aria-hidden="true" />
          </button>
        )}
        {!renaming && places.length > 1 && (
          <button
            type="button"
            aria-label={`Start a poll from ${list.name}`}
            title="Ask the group"
            onClick={() => onAskGroup(list)}
            className="grid h-8 w-8 place-items-center rounded-full border-0 bg-transparent p-0 text-ink-soft hover:bg-lagoon-light hover:text-ink"
          >
            <Vote size={15} aria-hidden="true" />
          </button>
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
                const votes = place.votes || [];
                const voted = votes.includes(userId);
                const open = openId === place._id;
                return (
                  <li
                    key={place._id}
                    id={`place-${place._id}`}
                    draggable={canReorder}
                    onDragStart={(event) => {
                      setDragId(place._id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", place._id);
                    }}
                    onDragOver={(event) => dragId && event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragId) moveTo(dragId, index);
                      setDragId(null);
                    }}
                    onDragEnd={() => setDragId(null)}
                    onMouseEnter={() => onHover(place._id)}
                    onMouseLeave={() => onHover(null)}
                    className={cn(dragId === place._id && "opacity-50")}
                  >
                    <div className="group/row flex items-start gap-3">
                      {canReorder ? (
                        <button
                          type="button"
                          aria-label={`${place.name}, number ${index + 1}. Press up or down to move it.`}
                          title="Drag to reorder"
                          onKeyDown={(event) => {
                            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                              event.preventDefault();
                              moveTo(place._id, index + (event.key === "ArrowUp" ? -1 : 1));
                            }
                          }}
                          className="cursor-grab rounded-full border-0 bg-transparent p-0 focus-visible:ring-4 focus-visible:ring-mustard active:cursor-grabbing"
                        >
                          <NumberPin colour={colour} number={index + 1} />
                        </button>
                      ) : (
                        <NumberPin colour={colour} number={index + 1} />
                      )}
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
                          <span className={cn("block truncate font-bold", place.visitedAt ? "text-ink-soft line-through" : "text-ink")}>
                            {place.name}
                          </span>
                          {(place.category || place.address) && (
                            <span className="block truncate text-sm text-ink-soft">
                              {[place.category, place.address].filter(Boolean).join(" · ")}
                            </span>
                          )}
                          {(days.length > 0 || place.notes) && (
                            <span className="mt-1 flex flex-wrap gap-1">
                              {days.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-lagoon-light px-2 py-0.5 text-xs font-extrabold text-ink">
                                  <CalendarCheck size={12} aria-hidden="true" />
                                  {days.map((day) => `${day.number ? `Day ${day.number}` : day.date} · ${day.startTime}`).join(", ")}
                                </span>
                              )}
                              {place.notes && (
                                <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-mustard/30 px-2 py-0.5 text-xs font-bold text-ink">
                                  <StickyNote size={12} className="shrink-0" aria-hidden="true" />
                                  <span className="truncate">{place.notes}</span>
                                </span>
                              )}
                            </span>
                          )}
                        </button>
                        {place.imageUrl && (
                          <img src={place.imageUrl} alt="" loading="lazy" className="hidden h-12 w-16 shrink-0 rounded-lg object-cover sm:block" />
                        )}
                        {tripStarted && (
                          <button
                            type="button"
                            aria-pressed={Boolean(place.visitedAt)}
                            aria-label={place.visitedAt ? `Mark ${place.name} as not visited` : `Mark ${place.name} as visited`}
                            title={place.visitedAt ? "Visited" : "Mark as visited"}
                            onClick={() => onVisited(place, !place.visitedAt)}
                            className={cn(
                              "grid h-7 w-7 shrink-0 place-items-center rounded-full border-0 bg-transparent p-0 hover:bg-lagoon-light",
                              place.visitedAt ? "text-lagoon" : "text-ink-soft"
                            )}
                          >
                            <CircleCheck size={16} className={cn(place.visitedAt && "fill-lagoon-light")} aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-pressed={voted}
                          aria-label={voted ? `Take back your must-do vote for ${place.name}` : `Mark ${place.name} as a must-do`}
                          title={voted ? "You want to go" : "Must-do"}
                          onClick={() => onVote(place, !voted)}
                          className={cn(
                            "flex h-7 shrink-0 items-center gap-1 rounded-full border-0 bg-transparent px-1.5 text-xs font-extrabold hover:bg-lagoon-light",
                            voted ? "text-plum" : "text-ink-soft",
                            votes.length === 0 && !voted && "opacity-100 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover/row:opacity-100"
                          )}
                        >
                          <Heart size={14} className={cn(voted && "fill-current")} aria-hidden="true" />
                          {votes.length > 0 && <span className="tabular-nums">{votes.length}</span>}
                        </button>
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={`Details for ${place.name}`}
                          title="Details and notes"
                          onClick={() => setOpenId(open ? null : place._id)}
                          className={cn(ROW_BUTTON, open && "bg-lagoon-light text-ink sm:opacity-100")}
                        >
                          <Info size={15} aria-hidden="true" />
                        </button>
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
                    {open && (
                      <PlaceDetails
                        place={place}
                        members={members}
                        lists={lists}
                        onSaveNotes={onSaveNotes}
                        onMove={onMove}
                        onMoveBy={canReorder ? (step) => moveTo(place._id, index + step) : null}
                        position={{ index, count: places.length }}
                        onAddNearby={(other) => onAdd(list, other)}
                      />
                    )}
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
          <Recommendations
            places={suggestions}
            loading={recommendationsLoading}
            preferred={preferred}
            preferredFor={preferredFor}
            onAdd={(place) => onAdd(list, place)}
          />
        </>
      )}
    </article>
  );
};

export default PlaceListCard;
