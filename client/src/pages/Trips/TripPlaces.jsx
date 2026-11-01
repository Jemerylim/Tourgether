import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import axios from "../../api/client";
import { Plus } from "lucide-react";
import ConfirmDialog from "../../components/Modal/ConfirmDialog";
import { useToast } from "../../components/Toast/Toast";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import { centreOf, listColour, recommendedPlaces, shortestOrder, walkingRoute } from "../../lib/places";
import TripMap from "./TripMap";
import EventFormModal from "./trip/EventFormModal";
import DayPlan, { DAY_COLOUR } from "./places/DayPlan";
import DayTabs from "./places/DayTabs";
import DestinationBar from "./places/DestinationBar";
import PlaceListCard from "./places/PlaceListCard";
import { eventsOn, retime, scheduleByPlace, suggestSlot, tripDays } from "./places/days";
import useWalkingRoutes from "./places/useWalkingRoutes";

// Wanderlog-style place lists beside a map: named lists ("Restaurants", "Beaches") of
// real places, numbered and coloured to match their pins, with nearby sights suggested
// under each list. The day tabs switch to the itinerary: one day's events at their
// places, in time order, with the walk between each.
// `onEventsChanged(events)` tells the trip page about events added or moved from here.
const TripPlaces = ({ trip, userId, isOrganiser, onEventsChanged }) => {
  const { showToast } = useToast();
  const [lists, setLists] = useState([]);
  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [focusPin, setFocusPin] = useState(null);
  const [newList, setNewList] = useState("");
  const [deletingList, setDeletingList] = useState(null);
  const [view, setView] = useState("lists");
  const [planning, setPlanning] = useState(null);
  const [planError, setPlanError] = useState("");
  const [optimising, setOptimising] = useState(false);
  const [proposal, setProposal] = useState(null);
  const canPlan = trip.myRole !== "viewer";

  useEffect(() => {
    Promise.all([axios.get(`${API_URL}/api/places/trip/${trip._id}`), axios.get(`${API_URL}/api/events/trip/${trip._id}`)])
      .then(([placesResponse, eventsResponse]) => {
        setLists(placesResponse.data.data.lists);
        setPlaces(placesResponse.data.data.places);
        setDestination(placesResponse.data.data.destination);
        setEvents(eventsResponse.data.data);
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

  const days = useMemo(() => tripDays(trip, events), [trip, events]);
  const day = days.find((item) => item.date === view);
  const dayStops = day ? eventsOn(events, day.date) : [];
  const dayPlaced = dayStops.filter((stop) => stop.place);
  const schedule = useMemo(() => scheduleByPlace(events, days), [events, days]);
  const eventCounts = useMemo(
    () => events.reduce((counts, event) => counts.set(event.date, (counts.get(event.date) || 0) + 1), new Map()),
    [events]
  );

  const placesByList = useMemo(
    () => new Map(lists.map((list) => [list._id, places.filter((place) => place.list === list._id)])),
    [lists, places]
  );
  const routes = useWalkingRoutes([
    ...lists.map((list) => ({ id: list._id, stops: placesByList.get(list._id) || [] })),
    { id: "day", stops: dayPlaced.map((stop) => stop.place) },
  ]);

  const pins = useMemo(() => {
    if (day) {
      return dayPlaced.map((stop, index) => ({
        _id: stop._id,
        lat: stop.place.lat,
        lng: stop.place.lng,
        name: `${stop.startTime} ${stop.title}`,
        number: index + 1,
        colour: DAY_COLOUR,
      }));
    }
    return lists.flatMap((list, listIndex) =>
      (placesByList.get(list._id) || []).map((place, index) => ({ ...place, number: index + 1, colour: listColour(listIndex) }))
    );
  }, [day, dayPlaced, lists, placesByList]);

  const routeLines = day
    ? routes.day ? [{ id: "day", colour: DAY_COLOUR, line: routes.day.line }] : []
    : lists
        .map((list, index) => ({ id: list._id, colour: listColour(index), line: routes[list._id]?.line }))
        .filter((route) => route.line);

  const unplanned = places
    .filter((place) => !schedule.has(place._id))
    .map((place) => ({ ...place, listName: lists.find((list) => list._id === place.list)?.name || "" }));

  const near = destination || centreOf(places) || undefined;

  const handleAdd = async (list, place) => {
    try {
      const { data } = await axios.post(
        `${API_URL}/api/places`,
        { tripId: trip._id, listId: list._id, ...place }
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
      await axios.delete(`${API_URL}/api/places/${place._id}`);
    } catch (error) {
      setPlaces((prev) => [...prev, place].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
      showToast(apiErrorMessage(error, "Couldn't remove that place"), "error");
    }
  };

  const handleCreateList = async (event) => {
    event.preventDefault();
    if (!newList.trim()) return;
    try {
      const { data } = await axios.post(`${API_URL}/api/places/trip/${trip._id}/lists`, { name: newList });
      setLists((prev) => [...prev, data.data]);
      setNewList("");
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't add that list"), "error");
    }
  };

  const handleRename = async (list, name) => {
    try {
      const { data } = await axios.put(`${API_URL}/api/places/trip/${trip._id}/lists/${list._id}`, { name });
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
      await axios.delete(`${API_URL}/api/places/trip/${trip._id}/lists/${list._id}`);
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
        { destination: next }
      );
      setDestination(data.data);
      return true;
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't save the destination"), "error");
      return false;
    }
  };

  // Open the event form for a saved place, on the day being looked at (or the first
  // day of the trip), in the next free slot of that day
  const openPlan = (place, date = day?.date || days[0]?.date || "") => {
    setPlanError("");
    setPlanning({
      title: place.name,
      date,
      ...(date ? suggestSlot(events, date) : { startTime: "", endTime: "" }),
      place: { placeId: place._id, name: place.name, address: place.address || "", lat: place.lat, lng: place.lng },
    });
  };

  const handlePlan = async (event) => {
    event.preventDefault();
    const { title, date, startTime, endTime, place } = planning;
    if (!title || !date || !startTime || !endTime) return setPlanError("Please fill in all fields.");
    if (endTime <= startTime) return setPlanError("The end time has to be after the start.");
    if (trip.startDate && trip.endDate) {
      const first = dayjs(trip.startDate).format("YYYY-MM-DD");
      const last = dayjs(trip.endDate).format("YYYY-MM-DD");
      if (date < first || date > last) return setPlanError(`Pick a day between ${first} and ${last}.`);
    }
    try {
      const { data } = await axios.post(`${API_URL}/api/events`, { tripId: trip._id, title, date, startTime, endTime, place });
      setEvents((prev) => [...prev, data.data]);
      onEventsChanged?.([data.data]);
      setPlanning(null);
      const number = days.find((item) => item.date === date)?.number;
      showToast(`${title} added to ${number ? `Day ${number}` : dayjs(date).format("D MMM")} at ${startTime}`, "success");
    } catch (error) {
      setPlanError(apiErrorMessage(error, "Couldn't add that to the itinerary"));
    }
  };

  // Work out the shortest walk through the day's stops (keeping the first one first) and
  // new times to fit it, then ask before moving anything
  const handleOptimise = async () => {
    setOptimising(true);
    try {
      const order = await shortestOrder(dayPlaced.map((stop) => stop.place));
      if (order.every((position, index) => position === index)) {
        showToast("These stops are already in the shortest order", "success");
        return;
      }
      const reordered = order.map((index) => dayPlaced[index]);
      const route = await walkingRoute(reordered.map((stop) => stop.place));
      const timed = route && retime(reordered, route.legs);
      if (!timed) {
        showToast("That order wouldn't fit in the day", "error");
        return;
      }
      setProposal(timed);
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't work out a route right now"), "error");
    } finally {
      setOptimising(false);
    }
  };

  const applyProposal = async () => {
    const timed = proposal;
    setProposal(null);
    try {
      const updated = await Promise.all(
        timed.map((stop) =>
          axios
            .put(`${API_URL}/api/events/${stop._id}`, { startTime: stop.startTime, endTime: stop.endTime })
            .then(({ data }) => data.data)
        )
      );
      const byId = new Map(updated.map((event) => [event._id, event]));
      setEvents((prev) => prev.map((event) => byId.get(event._id) || event));
      onEventsChanged?.(updated);
      showToast("Day reordered into the shortest walk", "success");
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't move every event. Check the calendar."), "error");
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
    <section aria-label="Places" className="space-y-4">
      {days.length > 0 && <DayTabs days={days} counts={eventCounts} value={day ? day.date : "lists"} onChange={setView} />}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="order-2 space-y-6 xl:order-1">
          {day ? (
            <DayPlan
              day={day}
              stops={dayStops}
              legs={routes.day?.legs}
              unplanned={unplanned}
              canPlan={canPlan}
              activeId={hoveredId}
              optimising={optimising}
              onHover={setHoveredId}
              onFocus={(stop) => setFocusPin({ _id: stop._id, lat: stop.place.lat, lng: stop.place.lng })}
              onPlan={openPlan}
              onOptimise={handleOptimise}
            />
          ) : (
            <>
              <DestinationBar destination={destination} onChange={handleDestination} />

              {lists.map((list, index) => (
                <PlaceListCard
                  key={list._id}
                  list={list}
                  colour={listColour(index)}
                  places={placesByList.get(list._id) || []}
                  legs={routes[list._id]?.legs}
                  schedule={schedule}
                  recommendations={recommendations}
                  recommendationsLoading={recommendationsLoading}
                  near={near}
                  userId={userId}
                  isOrganiser={isOrganiser}
                  canPlan={canPlan}
                  activeId={hoveredId}
                  onHover={setHoveredId}
                  onFocus={(place) => setFocusPin({ ...place })}
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                  onRename={handleRename}
                  onDelete={setDeletingList}
                  onPlan={(place) => openPlan(place)}
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
            </>
          )}
        </div>

        <div className="order-1 h-72 sm:h-96 xl:sticky xl:top-[96px] xl:order-2 xl:h-[calc(100vh-120px)]">
          <TripMap
            pins={pins}
            routes={routeLines}
            destination={destination}
            activeId={hoveredId}
            focusPin={focusPin}
            onPinClick={showRow}
            onPinHover={setHoveredId}
          />
        </div>
      </div>

      {planning && (
        <EventFormModal
          open
          title="Add to the itinerary"
          onClose={() => setPlanning(null)}
          isEditing={false}
          event={planning}
          onChange={setPlanning}
          trip={trip}
          errorMessage={planError}
          onSubmit={handlePlan}
        />
      )}

      <ConfirmDialog
        open={Boolean(deletingList)}
        title="Delete this list?"
        message={`"${deletingList?.name}" and every place on it will be removed for everyone on the trip.`}
        confirmLabel="Delete list"
        onCancel={() => setDeletingList(null)}
        onConfirm={handleDeleteList}
      />

      <ConfirmDialog
        open={Boolean(proposal)}
        title="Use the shortest route?"
        message={
          proposal
            ? `New order: ${proposal.map((stop) => `${stop.startTime} ${stop.title}`).join(", ")}. Each stop keeps its length. Events without a place stay where they are, so check they don't overlap.`
            : ""
        }
        confirmLabel="Reorder day"
        onCancel={() => setProposal(null)}
        onConfirm={applyProposal}
      />
    </section>
  );
};

export default TripPlaces;
