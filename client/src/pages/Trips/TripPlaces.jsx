import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ChevronDown, Compass, ImageOff, Pencil, Plus, Trash2, X } from "lucide-react";
import PlaceSearch from "../../components/PlaceSearch/PlaceSearch";
import ConfirmDialog from "../../components/Modal/ConfirmDialog";
import { useToast } from "../../components/Toast/Toast";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import { centreOf, listColour, recommendedPlaces } from "../../lib/places";
import { cn } from "../../lib/utils";
import TripMap from "./TripMap";

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } });

const NumberPin = ({ colour, number }) => (
  <span
    className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-white text-xs font-extrabold text-white shadow-float"
    style={{ background: colour }}
    aria-hidden="true"
  >
    {number}
  </span>
);

// Sideways strip of sights near the trip that aren't on this list yet, each with a +
// to save it. Scroll-snaps on touch; the arrow pages it on desktop.
const Recommendations = ({ places, loading, onAdd }) => {
  const [open, setOpen] = useState(true);
  const [strip, setStrip] = useState(null);
  if (!loading && places.length === 0) return null;

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
      {open && (
        <div className="relative mt-2">
          <ul ref={setStrip} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {loading
              ? [0, 1, 2].map((index) => (
                  <li key={index} className="h-14 w-56 shrink-0 animate-pulse rounded-xl bg-lagoon-light motion-reduce:animate-none" />
                ))
              : places.map((place) => (
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
      {open && strip && !loading && places.length > 2 && (
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

const PlaceListCard = ({
  list,
  colour,
  places,
  recommendations,
  recommendationsLoading,
  near,
  userId,
  isOrganiser,
  activeId,
  onHover,
  onFocus,
  onAdd,
  onRemove,
  onRename,
  onDelete,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(list.name);
  const savedIds = new Set(places.map((place) => place.sourceId).filter(Boolean));
  const suggestions = recommendations.filter((place) => !savedIds.has(place.sourceId));

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
        <span className="text-sm font-extrabold tabular-nums text-ink-soft">{places.length}</span>
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
              {places.map((place, index) => (
                <li
                  key={place._id}
                  id={`place-${place._id}`}
                  className="group/row flex items-start gap-3"
                  onMouseEnter={() => onHover(place._id)}
                  onMouseLeave={() => onHover(null)}
                >
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
                    </button>
                    {place.imageUrl && (
                      <img src={place.imageUrl} alt="" loading="lazy" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                    )}
                    {(isOrganiser || place.addedBy === userId) && (
                      <button
                        type="button"
                        aria-label={`Remove ${place.name}`}
                        onClick={() => onRemove(place)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-0 bg-transparent p-0 text-ink-soft opacity-100 hover:bg-lagoon-light hover:text-ink sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover/row:opacity-100"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
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

// Where the trip is. Sets the map's starting view and where recommendations come from.
const DestinationBar = ({ destination, onChange }) => {
  const [editing, setEditing] = useState(false);
  const picking = editing || !destination;

  return (
    <div className="rounded-3xl bg-white p-5 drop-shadow-ticket">
      <div className="flex items-center gap-3">
        <Compass size={22} className="shrink-0 text-lagoon" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-ink">
          {destination ? (
            <>
              Exploring around <span className="font-extrabold">{destination.name}</span>
            </>
          ) : (
            <span className="font-extrabold">Where's this trip?</span>
          )}
        </p>
        {destination && (
          <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => setEditing((value) => !value)}>
            {editing ? "Cancel" : "Change"}
          </button>
        )}
      </div>
      {picking && (
        <>
          {!destination && (
            <p className="mt-1 text-sm text-ink-soft">Pick a city or region to centre the map and get recommended places.</p>
          )}
          <PlaceSearch
            className="mt-3"
            citiesOnly
            autoFocus={editing}
            label="Trip destination"
            placeholder="Search a city, island or country"
            onPick={async (place) => {
              if (await onChange({ name: place.name, lat: place.lat, lng: place.lng })) setEditing(false);
            }}
          />
        </>
      )}
    </div>
  );
};

// Wanderlog-style place lists beside a map: named lists ("Restaurants", "Beaches") of
// real places, numbered and coloured to match their pins, with nearby sights suggested
// under each list.
const TripPlaces = ({ trip, userId, isOrganiser }) => {
  const { showToast } = useToast();
  const [lists, setLists] = useState([]);
  const [places, setPlaces] = useState([]);
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [focusPin, setFocusPin] = useState(null);
  const [newList, setNewList] = useState("");
  const [deletingList, setDeletingList] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/places/trip/${trip._id}`, authHeaders())
      .then(({ data }) => {
        setLists(data.data.lists);
        setPlaces(data.data.places);
        setDestination(data.data.destination);
      })
      .catch((error) => showToast(apiErrorMessage(error, "Couldn't load the places"), "error"))
      .finally(() => setLoading(false));
  }, [trip._id, showToast]);

  // Recommendations come from around the destination, or the first saved place without
  // one. Rounded so small changes don't refetch.
  const anchor = destination || places[0] || null;
  const anchorKey = anchor ? `${anchor.lat.toFixed(1)},${anchor.lng.toFixed(1)}` : "";
  useEffect(() => {
    if (!anchorKey) return undefined;
    let cancelled = false;
    const [lat, lng] = anchorKey.split(",").map(Number);
    setRecommendationsLoading(true);
    recommendedPlaces({ lat, lng })
      .then((found) => !cancelled && setRecommendations(found))
      .catch((error) => {
        console.error("Error fetching recommended places:", error);
        if (!cancelled) setRecommendations([]);
      })
      .finally(() => !cancelled && setRecommendationsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [anchorKey]);

  const pins = useMemo(
    () =>
      lists.flatMap((list, listIndex) =>
        places
          .filter((place) => place.list === list._id)
          .map((place, index) => ({ ...place, number: index + 1, colour: listColour(listIndex) }))
      ),
    [lists, places]
  );
  const near = destination || centreOf(places) || undefined;

  const handleAdd = async (list, place) => {
    try {
      const { data } = await axios.post(
        `${API_URL}/api/places`,
        { tripId: trip._id, listId: list._id, ...place },
        authHeaders()
      );
      setPlaces((prev) => [...prev, data.data]);
      setFocusPin({ ...data.data });
      showToast(`${place.name} added to ${list.name}`, "success");
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't add that place"), "error");
    }
  };

  const handleRemove = async (place) => {
    setPlaces((prev) => prev.filter((other) => other._id !== place._id));
    try {
      await axios.delete(`${API_URL}/api/places/${place._id}`, authHeaders());
    } catch (error) {
      setPlaces((prev) => [...prev, place].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
      showToast(apiErrorMessage(error, "Couldn't remove that place"), "error");
    }
  };

  const handleCreateList = async (event) => {
    event.preventDefault();
    if (!newList.trim()) return;
    try {
      const { data } = await axios.post(`${API_URL}/api/places/trip/${trip._id}/lists`, { name: newList }, authHeaders());
      setLists((prev) => [...prev, data.data]);
      setNewList("");
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't add that list"), "error");
    }
  };

  const handleRename = async (list, name) => {
    try {
      const { data } = await axios.put(`${API_URL}/api/places/trip/${trip._id}/lists/${list._id}`, { name }, authHeaders());
      setLists((prev) => prev.map((other) => (other._id === list._id ? data.data : other)));
      return true;
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't rename that list"), "error");
      return false;
    }
  };

  const handleDeleteList = async () => {
    const list = deletingList;
    setDeletingList(null);
    try {
      await axios.delete(`${API_URL}/api/places/trip/${trip._id}/lists/${list._id}`, authHeaders());
      setLists((prev) => prev.filter((other) => other._id !== list._id));
      setPlaces((prev) => prev.filter((place) => place.list !== list._id));
      showToast(`"${list.name}" deleted`, "success");
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't delete that list"), "error");
    }
  };

  const handleDestination = async (next) => {
    try {
      const { data } = await axios.put(
        `${API_URL}/api/places/trip/${trip._id}/destination`,
        { destination: next },
        authHeaders()
      );
      setDestination(data.data);
      return true;
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't save the destination"), "error");
      return false;
    }
  };

  // A pin was clicked: bring its row into view and outline it
  const showRow = (id) => {
    setHoveredId(id);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`place-${id}`)?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  };

  if (loading) return <p className="text-ink-soft">Loading places...</p>;

  return (
    <section aria-label="Places" className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="order-2 space-y-6 xl:order-1">
        <DestinationBar destination={destination} onChange={handleDestination} />

        {lists.map((list, index) => (
          <PlaceListCard
            key={list._id}
            list={list}
            colour={listColour(index)}
            places={places.filter((place) => place.list === list._id)}
            recommendations={recommendations}
            recommendationsLoading={recommendationsLoading}
            near={near}
            userId={userId}
            isOrganiser={isOrganiser}
            activeId={hoveredId}
            onHover={setHoveredId}
            onFocus={(place) => setFocusPin({ ...place })}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onRename={handleRename}
            onDelete={setDeletingList}
          />
        ))}

        <form onSubmit={handleCreateList} className="flex gap-2">
          <label htmlFor="new-place-list" className="sr-only">New list name</label>
          <input
            id="new-place-list"
            className="field"
            maxLength={40}
            placeholder="New list, e.g. Restaurants or Beaches"
            value={newList}
            onChange={(event) => setNewList(event.target.value)}
          />
          <button
            type="submit"
            className="btn-dark shrink-0"
            disabled={!newList.trim()}
            title={newList.trim() ? undefined : "Name the list first"}
          >
            <Plus size={18} aria-hidden="true" />
            Add list
          </button>
        </form>
      </div>

      <div className="order-1 h-72 sm:h-96 xl:sticky xl:top-[96px] xl:order-2 xl:h-[calc(100vh-120px)]">
        <TripMap
          pins={pins}
          destination={destination}
          activeId={hoveredId}
          focusPin={focusPin}
          onPinClick={showRow}
          onPinHover={setHoveredId}
        />
      </div>

      <ConfirmDialog
        open={Boolean(deletingList)}
        title="Delete this list?"
        message={`"${deletingList?.name}" and every place on it will be removed for everyone on the trip.`}
        confirmLabel="Delete list"
        onCancel={() => setDeletingList(null)}
        onConfirm={handleDeleteList}
      />
    </section>
  );
};

export default TripPlaces;
