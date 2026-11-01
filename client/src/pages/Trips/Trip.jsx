import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useLocation, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, ListChecks, Plane, Trash2, UserPlus, Users } from "lucide-react";
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import { createViewDay, createViewMonthGrid, createViewWeek } from "@schedule-x/calendar";
import dayjs from "dayjs";
import axios from "../../api/client";
import { getToken } from "../../api/session";
import Navbar from "../../components/Navbar/Navbar";
import AvatarStack from "../../components/Avatar/AvatarStack";
import ConfirmDialog from "../../components/Modal/ConfirmDialog";
import PageLayout from "../../components/PageLayout/PageLayout";
import { ErrorState, LoadingState } from "../../components/PageState/PageState";
import { useToast } from "../../components/Toast/Toast";
import SectionSidebar from "../../components/SectionSidebar/SectionSidebar";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import { countdownLabel, coverPhoto, formatDate, isHappeningNow, tripLength } from "../../lib/trips";
import { fromHere } from "../../lib/navigation";
import { cn } from "../../lib/utils";
import TripDates from "./TripDates";
import TripPolls from "./TripPolls";
import TripExpenses from "./TripExpenses";
import TripChecklist from "./TripChecklist";
import Chip from "./trip/Chip";
import MoreMenu from "./trip/MoreMenu";
import MembersModal from "./trip/MembersModal";
import EventFormModal from "./trip/EventFormModal";
import { HEADER_BUTTON, SECTIONS } from "./trip/constants";
import {
  CALENDAR_PLUGINS,
  EVENT_CALENDARS,
  calendarControlsPlugin,
  eventsServicePlugin,
  notifyRef,
  toCalendarEvent,
  tripRef,
} from "./trip/calendar";

// The map library is large, so the Places section loads the first time it's opened
const TripPlaces = lazy(() => import("./TripPlaces"));

const EMPTY_EVENT = { title: "", date: "", startTime: "", endTime: "", place: null };

const Trip = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = SECTIONS.some((item) => item.value === searchParams.get("section"))
    ? searchParams.get("section")
    : "calendar";
  // Each section is its own history entry so Back steps through them. Carry the route
  // state along so the header's back link still knows which page opened the trip.
  const showSection = (next) => setSearchParams({ section: next }, { state: location.state });
  const back = location.state?.from || { to: "/my-trips", label: "My trips" };
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState("");
  const [selectedDates, setSelectedDates] = useState([]);
  const [userId, setUserId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [members, setMembers] = useState([]);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingTripDelete, setConfirmingTripDelete] = useState(false);
  const [cover, setCover] = useState();
  const calendarBoxRef = useRef(null);

  const [newEvent, setNewEvent] = useState(EMPTY_EVENT);

  useEffect(() => {
    tripRef.current = trip;
    notifyRef.current = showToast;
  }, [trip, showToast]);

  // Calendar setup
  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
    calendars: EVENT_CALENDARS,
    events: [], // Initially empty
    plugins: CALENDAR_PLUGINS,
    callbacks:{
        // Double-click an empty slot to start a new event there: a one-hour event from the
        // slot's time in the day and week views, or just the date in the month view
        onDoubleClickDateTime: (dateTime) => {
            const start = dayjs(dateTime);
            const end = start.add(1, "hour");
            setIsEditing(false);
            setEditingEvent(null);
            setErrorMessage("");
            setNewEvent({
                ...EMPTY_EVENT,
                date: start.format("YYYY-MM-DD"),
                startTime: start.format("HH:mm"),
                endTime: end.isSame(start, "day") ? end.format("HH:mm") : "23:59",
            });
            setShowCreateForm(true);
        },
        onDoubleClickDate: (date) => {
            setIsEditing(false);
            setEditingEvent(null);
            setErrorMessage("");
            setNewEvent({ ...EMPTY_EVENT, date: dayjs(date).format("YYYY-MM-DD") });
            setShowCreateForm(true);
        },
        onDoubleClickEvent: (event) => {
            // Viewers can look at events but not edit them
            if (tripRef.current?.myRole === "viewer") return;
            console.log("Editing Event:", event);
            setEditingEvent(event); // Set event to edit
            setNewEvent({
                title: event.title,
                date: dayjs(event.start).format("YYYY-MM-DD"),
                startTime: dayjs(event.start).format("HH:mm"),
                endTime: dayjs(event.end).format("HH:mm"),
                place: event.place || null,
              });
            setIsEditing(true);
            setShowCreateForm(true); // Show the form
        }
    }
  });

  // Dynamically set events on the calendar
  useEffect(() => {
    if (eventsServicePlugin && eventsServicePlugin.set) {
      console.log("Updating calendar with events:", selectedDates);
      eventsServicePlugin.set(selectedDates); // Update events dynamically
    } else {
      console.error("eventsServicePlugin is not available or not initialized properly.");
    }
  }, [selectedDates]);

  // The calendar works out which views fit from its width, but it's measured while the
  // section is hidden (zero wide, so only Day fits). Nudge it to measure again once shown.
  useEffect(() => {
    if (section !== "calendar") return undefined;
    const frame = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => cancelAnimationFrame(frame);
  }, [section, trip]);

  // The day grid starts at midnight, so open it scrolled to the first event (or to
  // the morning when there are none) instead of a screenful of empty small hours.
  useEffect(() => {
    if (section !== "calendar" || !trip) return undefined;
    const timer = setTimeout(() => {
      const grid = calendarBoxRef.current?.querySelector(".sx__view-container");
      if (!grid || grid.clientHeight === 0) return;
      const events = [...grid.querySelectorAll(".sx__time-grid-event")];
      if (events.length === 0) {
        grid.scrollTop = grid.scrollHeight * (7 / 24);
        return;
      }
      const top = Math.min(...events.map((el) => el.getBoundingClientRect().top));
      // The day names stick to the top of the scroller, so leave room for them
      const header = grid.querySelector(".sx__week-header")?.offsetHeight || 0;
      grid.scrollTop += top - grid.getBoundingClientRect().top - header - 16;
    }, 300);
    return () => clearTimeout(timer);
  }, [section, trip, selectedDates]);

  // Same destination photo as the trip's card on the dashboard
  useEffect(() => {
    if (!trip) return undefined;
    let cancelled = false;
    coverPhoto(trip.name, `cover:${trip._id}`).then((url) => {
      if (!cancelled) setCover(url);
    });
    return () => {
      cancelled = true;
    };
  }, [trip?._id, trip?.name]);

  // Fetch trip, event details, and members
  useEffect(() => {
    const fetchTripDetails = async () => {
      const authToken = getToken();
      if (!authToken) {
        setError("Authorization token is missing. Please log in again.");
        return navigate("/login", { replace: true });
      }

      try {
        // Use Promise.all to load both the trip and user profile at the same time
        const [tripResponse, userResponse] = await Promise.all([
          axios.get(`${API_URL}/api/trips/${id}`),
          axios.get(`${API_URL}/api/users/profile`),
        ]);
  
        const fetchedTrip = tripResponse.data.data;
        setTrip(fetchedTrip);
        // Ensure the creator is always in the members list
        const updatedMembers = [
          fetchedTrip.createdBy, // Add the creator
          ...fetchedTrip.members.filter(
            (member) => member._id !== fetchedTrip.createdBy._id
          ), // Avoid duplicates
        ];
        setMembers(updatedMembers);
        setUserId(userResponse.data.user._id);
  
        const fetchedUserId = userResponse.data.user?._id || userResponse.data.user?.id;
        if (!fetchedUserId) {
          throw new Error("User ID not found in profile response.");
        }
        setUserId(fetchedUserId);

        // Set calendar restrictions based on trip dates
        // (a trip whose dates are still to be decided has no restrictions)
        const tripStartDate = fetchedTrip.startDate && dayjs(fetchedTrip.startDate).format("YYYY-MM-DD");
        const tripEndDate = fetchedTrip.endDate && dayjs(fetchedTrip.endDate).format("YYYY-MM-DD");

        if (calendarControlsPlugin.$app && tripStartDate && tripEndDate) {
          calendarControlsPlugin.setDate(tripStartDate);
          calendarControlsPlugin.setMinDate(tripStartDate);
          calendarControlsPlugin.setMaxDate(tripEndDate);
          //take start date and get the day and set it as the first day
          const firstDayOfWeek = dayjs(tripStartDate).day(); // Returns 0 (Sunday) to 6 (Saturday)
          calendarControlsPlugin.setFirstDayOfWeek(firstDayOfWeek); // Set first day dynamically
        }

        // Fetch events associated with the trip
        const eventsResponse = await axios.get(
          `${API_URL}/api/events/trip/${id}`
        );

        // Format events for the calendar
        const formattedEvents = eventsResponse.data.data.map(toCalendarEvent);

        console.log("Formatted events from API:", formattedEvents);
        setSelectedDates(formattedEvents); // Update state
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          err.response?.data?.message ||
            "Failed to fetch data. Please try again later."
        );
      }
    };

    fetchTripDetails();
  }, [id, navigate]);

  const handleSubmitEvent = async (e) => {
    e.preventDefault();

    if (!newEvent.title || !newEvent.date || !newEvent.startTime || !newEvent.endTime) {
        setErrorMessage("Please fill in all fields.");
        return;
    }

    if (!trip) {
        setErrorMessage("Trip details are missing. Please try again.");
        return;
    }

    // Events only have to fall inside the trip once its dates are locked in
    if (trip.startDate && trip.endDate) {
        const tripStart = dayjs(trip.startDate).format("YYYY-MM-DD");
        const tripEnd = dayjs(trip.endDate).format("YYYY-MM-DD");
        const selectedDate = dayjs(newEvent.date).format("YYYY-MM-DD");

        if (selectedDate < tripStart || selectedDate > tripEnd) {
            setErrorMessage(`Event date must be between ${tripStart} and ${tripEnd}`);
            return;
        }
    }

    try {
        if (isEditing && editingEvent) {
            const response = await axios.put(
                `${API_URL}/api/events/${editingEvent.id}`,
                {
                    title: newEvent.title,
                    date: newEvent.date,
                    startTime: newEvent.startTime,
                    endTime: newEvent.endTime,
                    place: newEvent.place || null,
                }
            );

            setSelectedDates((prev) =>
                prev.map((event) => (event.id === editingEvent.id ? toCalendarEvent(response.data.data) : event))
            );
        } else {
            const response = await axios.post(
                `${API_URL}/api/events`,
                {
                    tripId: trip._id,
                    title: newEvent.title,
                    date: newEvent.date,
                    startTime: newEvent.startTime,
                    endTime: newEvent.endTime,
                }
            );

            setSelectedDates((prev) => [...prev, toCalendarEvent(response.data.data)]);
        }

        // Reset the form and clear error message
        setShowCreateForm(false);
        setIsEditing(false);
        setEditingEvent(null);
        setNewEvent(EMPTY_EVENT);
        setErrorMessage(""); // Clear error message

    } catch (err) {
        console.error("Error handling event:", err);
        setErrorMessage("Failed to process event. Please try again.");
    }
  };
  const handleDeleteEvent = async () => {
    if (!editingEvent) return;
    setConfirmingDelete(false);


    try {
        await axios.delete(`${API_URL}/api/events/${editingEvent.id}`);

        // Remove the deleted event from the state
        setSelectedDates((prev) => prev.filter(event => event.id !== editingEvent.id));

        // Reset form and close modal
        setShowCreateForm(false);
        setIsEditing(false);
        setEditingEvent(null);
        setNewEvent(EMPTY_EVENT);

        showToast("Event deleted", "success");
    } catch (err) {
        console.error("Error deleting event:", err);
        setErrorMessage("Failed to delete the event. Please try again.");
    }
  };

  const handleInviteMember = async (email) => {
    try {
      await axios.post(
        `${API_URL}/api/trips/${id}/invite`,
        { email }
      );
      showToast(`Invite sent to ${email}`, "success");
    } catch (error) {
      console.error("Error inviting member:", error);
      showToast(apiErrorMessage(error, "Couldn't send the invite"), "error");
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await axios.delete(
        `${API_URL}/api/trips/${id}/remove-member/${memberId}`
      );
      setMembers((prev) => prev.filter((member) => member._id !== memberId));
      showToast("Member removed", "success");
    } catch (error) {
      console.error("Error removing member:", error);
      showToast(apiErrorMessage(error, "Couldn't remove that member"), "error");
    }
  };

  const isOrganiser = trip?.createdBy?._id === userId;
  const canEdit = trip?.myRole !== "viewer";

  const handleChangeRole = async (member, role) => {
    try {
      const { data } = await axios.put(
        `${API_URL}/api/trips/${id}/members/${member._id}/role`,
        { role }
      );
      setTrip((prev) => ({ ...prev, memberRoles: data.data.memberRoles }));
      showToast(`${member.name} is now ${role === "viewer" ? "a viewer" : "an editor"}`, "success");
    } catch (error) {
      console.error("Error changing role:", error);
      showToast(apiErrorMessage(error, "Couldn't change that role"), "error");
    }
  };

  const handleDeleteTrip = async () => {
    setConfirmingTripDelete(false);
    try {
      await axios.delete(`${API_URL}/api/trips/${id}`);
      showToast(`"${trip.name}" deleted`, "success");
      navigate("/my-trips", { replace: true });
    } catch (err) {
      console.error("Error deleting trip:", err);
      showToast(apiErrorMessage(err, "Couldn't delete this trip"), "error");
    }
  };

  // The organiser locked new dates: show them everywhere and re-fit the calendar to them
  const handleDatesLocked = (updatedTrip) => {
    // Keep myRole, which only the GET response carries
    setTrip((prev) => ({ ...prev, ...updatedTrip }));
    const locked = updatedTrip.startDate && updatedTrip.endDate;
    const start = locked ? dayjs(updatedTrip.startDate).format("YYYY-MM-DD") : undefined;
    const end = locked ? dayjs(updatedTrip.endDate).format("YYYY-MM-DD") : undefined;
    if (calendarControlsPlugin.$app) {
      // Unlocked dates lift the limits again
      calendarControlsPlugin.setMinDate(start);
      calendarControlsPlugin.setMaxDate(end);
      if (start) {
        calendarControlsPlugin.setDate(start);
        calendarControlsPlugin.setFirstDayOfWeek(dayjs(start).day());
      }
    }
  };

  // Step the calendar by a day, week or month depending on the view, staying inside the
  // trip's dates once they're locked
  const moveCalendar = (direction) => {
    const view = calendarControlsPlugin.getView();
    const unit = view === "month-grid" ? "month" : view === "day" ? "day" : "week";
    const goTo = direction === 0 ? dayjs() : dayjs(calendarControlsPlugin.getDate()).add(direction, unit);
    let date = goTo.format("YYYY-MM-DD");
    if (trip?.startDate && trip?.endDate) {
      const first = dayjs(trip.startDate).format("YYYY-MM-DD");
      const last = dayjs(trip.endDate).format("YYYY-MM-DD");
      if (date < first) date = first;
      if (date > last) date = last;
    }
    calendarControlsPlugin.setDate(date);
  };

  const closeEventForm = () => {
    setShowCreateForm(false);
    setIsEditing(false);
    setEditingEvent(null);
    setNewEvent(EMPTY_EVENT);
    setErrorMessage("");
  };

  const openNewEventForm = () => {
    setIsEditing(false);
    setEditingEvent(null);
    setErrorMessage("");
    setShowCreateForm(true);
    showSection("calendar"); // so the new event is in view once it's saved
  };

  if (error) {
    return (
      <div className="min-h-screen bg-paper text-left">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-paper text-left">
        <Navbar />
        <LoadingState message="Loading trip details..." />
      </div>
    );
  }

  return (
    <PageLayout
      maxWidth="max-w-7xl"
      back={back}
      cover={cover}
      kicker={
        <div className="flex flex-wrap items-center gap-2">
          {countdownLabel(trip) && (
            <Chip icon={Plane}>{isHappeningNow(trip) ? "Happening now" : countdownLabel(trip)}</Chip>
          )}
          {tripLength(trip) && <Chip icon={CalendarDays}>{tripLength(trip)} {tripLength(trip) === 1 ? "day" : "days"}</Chip>}
          <Chip icon={ListChecks}>{selectedDates.length} {selectedDates.length === 1 ? "event" : "events"} planned</Chip>
        </div>
      }
      title={trip.name}
      subtitle={
        trip.startDate && trip.endDate
          ? `${formatDate(trip.startDate)} to ${formatDate(trip.endDate)}`
          : "Dates to be decided. Use Find dates to pick them."
      }
      actions={
        <>
              {canEdit && (
                <button className="btn-primary" onClick={openNewEventForm}>
                  <CalendarPlus size={18} aria-hidden="true" />
                  Add event
                </button>
              )}
              <button className={HEADER_BUTTON} onClick={() => navigate(`/trip/${id}/events`, { state: fromHere(location, trip.name) })}>
                <ListChecks size={18} aria-hidden="true" />
                All events
              </button>
              <button className={HEADER_BUTTON} onClick={() => setShowManageMembers(true)}>
                <Users size={18} aria-hidden="true" />
                Members
              </button>
              {isOrganiser && (
                <MoreMenu label="More trip actions">
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-xl border-0 bg-transparent px-3 py-2 text-left text-sm font-extrabold text-plum hover:bg-lagoon-light"
                    onClick={() => setConfirmingTripDelete(true)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete trip
                  </button>
                </MoreMenu>
              )}
        </>
      }
    >
        {/* Who's on the trip */}
        <div className="mb-6 flex w-fit items-center gap-3 rounded-full bg-white py-2 pl-3 pr-4 drop-shadow-ticket">
          <button
            type="button"
            aria-label="View trip members"
            onClick={() => setShowManageMembers(true)}
            className="rounded-full border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-mustard"
          >
            <AvatarStack people={members} />
          </button>
          {isOrganiser && (
            <button
              className="inline-flex items-center gap-1.5 rounded-full border-0 bg-lagoon-light px-3 py-1.5 text-sm font-extrabold text-ink hover:bg-sky"
              onClick={() => setShowManageMembers(true)}
            >
              <UserPlus size={14} aria-hidden="true" />
              Invite
            </button>
          )}
        </div>

        {/* Sections: calendar, places, polls, money and lists */}
        <SectionSidebar items={SECTIONS} value={section} onChange={showSection} label="Trip planner">
          {/* The calendar stays mounted while hidden so Schedule-X keeps its state */}
          <div ref={calendarBoxRef} className={cn("rounded-3xl bg-white p-3 drop-shadow-ticket sm:p-5", section !== "calendar" && "hidden")}>
            <div className="mb-3 flex items-center gap-2">
              <button type="button" aria-label="Previous" className="btn-ghost !px-2.5" onClick={() => moveCalendar(-1)}>
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button type="button" className="btn-ghost" onClick={() => moveCalendar(0)}>
                Today
              </button>
              <button type="button" aria-label="Next" className="btn-ghost !px-2.5" onClick={() => moveCalendar(1)}>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
            <ScheduleXCalendar calendarApp={calendar} />
          </div>
          {userId && section === "dates" && (
            <TripDates trip={trip} userId={userId} isOrganiser={isOrganiser} onLocked={handleDatesLocked} />
          )}
          {userId && section === "places" && (
            <Suspense fallback={<p className="text-ink-soft">Loading places...</p>}>
              <TripPlaces
                trip={trip}
                userId={userId}
                isOrganiser={isOrganiser}
                onEventsChanged={(events) =>
                  setSelectedDates((prev) => {
                    const byId = new Map(events.map((event) => [event._id, toCalendarEvent(event)]));
                    return [...prev.map((event) => byId.get(event.id) || event), ...[...byId.values()].filter((event) => !prev.some((other) => other.id === event.id))];
                  })
                }
              />
            </Suspense>
          )}
          {userId && section === "polls" && (
            <TripPolls
              trip={trip}
              userId={userId}
              isOrganiser={isOrganiser}
              onEventCreated={(event) => setSelectedDates((prev) => [...prev, toCalendarEvent(event)])}
            />
          )}
          {userId && section === "expenses" && (
            <TripExpenses trip={trip} members={members} userId={userId} isOrganiser={isOrganiser} />
          )}
          {userId && section === "lists" && (
            <TripChecklist trip={trip} members={members} userId={userId} isOrganiser={isOrganiser} />
          )}
        </SectionSidebar>

      <MembersModal
        open={showManageMembers}
        onClose={() => setShowManageMembers(false)}
        trip={trip}
        members={members}
        isOrganiser={isOrganiser}
        onInvite={handleInviteMember}
        onRemove={handleRemoveMember}
        onChangeRole={handleChangeRole}
      />

      <EventFormModal
        open={showCreateForm}
        onClose={closeEventForm}
        isEditing={isEditing}
        event={newEvent}
        onChange={setNewEvent}
        trip={trip}
        errorMessage={errorMessage}
        onSubmit={handleSubmitEvent}
        onRequestDelete={() => setConfirmingDelete(true)}
      />

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this event?"
        message={`"${newEvent.title}" will be removed from the trip calendar for everyone.`}
        confirmLabel="Delete event"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={handleDeleteEvent}
      />

      <ConfirmDialog
        open={confirmingTripDelete}
        title="Delete this trip?"
        message={`"${trip.name}" will be deleted for everyone on it, along with its events, polls and availability. This can't be undone.`}
        confirmLabel="Delete trip"
        onCancel={() => setConfirmingTripDelete(false)}
        onConfirm={handleDeleteTrip}
      />
    </PageLayout>
  );
};

export default Trip;
