import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useLocation, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Backpack, CalendarDays, CalendarRange, CalendarPlus, ChevronLeft, ChevronRight, ListChecks, MapPin, MoreHorizontal, Plane, Trash2, UserPlus, Users, Vote, Wallet, X } from "lucide-react";
import axios from "../../api/client";
import Navbar from "../../components/Navbar/Navbar";
import Avatar from "../../components/Avatar/Avatar";
import AvatarStack from "../../components/Avatar/AvatarStack";
import Modal from "../../components/Modal/Modal";
import ConfirmDialog from "../../components/Modal/ConfirmDialog";
import PageLayout from "../../components/PageLayout/PageLayout";
import { ErrorState, LoadingState } from "../../components/PageState/PageState";
import { useToast } from "../../components/Toast/Toast";
import TimePicker from "../../components/TimePicker/TimePicker";
import DatePicker from "../../components/DatePicker/DatePicker";
import SectionSidebar from "../../components/SectionSidebar/SectionSidebar";
import InviteLink from "./InviteLink";
import TripDates from "./TripDates";
import TripPolls from "./TripPolls";
import TripExpenses from "./TripExpenses";
import TripChecklist from "./TripChecklist";

// The map library is large, so the Places section loads the first time it's opened
const TripPlaces = lazy(() => import("./TripPlaces"));

const SECTIONS = [
  { value: "calendar", label: "Calendar", icon: CalendarDays },
  { value: "dates", label: "Find dates", icon: CalendarRange },
  { value: "places", label: "Places", icon: MapPin },
  { value: "polls", label: "Polls", icon: Vote },
  { value: "expenses", label: "Expenses", icon: Wallet },
  { value: "lists", label: "Packing & to-dos", icon: Backpack },
];
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import {
  createViewDay,
  createViewMonthGrid,
  createViewWeek,
} from "@schedule-x/calendar";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { createEventModalPlugin } from '@schedule-x/event-modal'
import "@schedule-x/theme-default/dist/index.css";
import dayjs from "dayjs";
import { API_URL, assetUrl } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import { countdownLabel, coverPhoto, formatDate, isHappeningNow, tripLength } from "../../lib/trips";
import { fromHere } from "../../lib/navigation";
import { cn } from "../../lib/utils";
import { getToken } from "../../api/session";

// Every event on the trip calendar uses the app's lagoon colours instead of Schedule-X's blue
const EVENT_CALENDARS = {
  trip: {
    colorName: "trip",
    lightColors: { main: "#0A7C84", container: "#DDF1EF", onContainer: "#082F37" },
    darkColors: { main: "#0A7C84", container: "#DDF1EF", onContainer: "#082F37" },
  },
};

// Header buttons sit on the destination photo, so they get a soft white backing
const HEADER_BUTTON = "btn-ghost bg-white/80 hover:bg-white";

// Small pill of trip facts in the header
const Chip = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-sm font-extrabold text-ink shadow-float">
    <Icon size={14} aria-hidden="true" />
    {children}
  </span>
);

// "..." button with a small menu, for actions that shouldn't sit next to the everyday ones
const MoreMenu = ({ label, children }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${HEADER_BUTTON} !px-2.5`}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-48 rounded-2xl bg-white p-1.5 shadow-soft ring-1 ring-ink/10" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
};

// The calendar plugins live at module level, so the drag handler reaches the current
// trip and the toast function through these refs (set inside the component).
const tripRef = { current: null };
const notifyRef = { current: () => {} };

// Plugins
const calendarControlsPlugin = createCalendarControlsPlugin({
    showTodayButton: false, // Hide the "Today" button
  showDatePicker: false,  // Hide the date picker
});
const eventsServicePlugin = createEventsServicePlugin();
const eventModal = createEventModalPlugin()
const dragAndDropPlugin = createDragAndDropPlugin({
    callbacks: {
      onDrop: ({ event, start, end, revert }) => {
        console.log("Dragged Event:", event);
        
        const trip = tripRef.current;
        if (!trip || !trip.startDate || !trip.endDate) {
          console.warn("Trip details not loaded yet.");
          return;
        }
        if (trip.myRole === "viewer") {
          notifyRef.current("Viewers can't move events.", "error");
          revert();
          return;
        }

        const tripStart = dayjs(trip.startDate).format("YYYY-MM-DD");
        const tripEnd = dayjs(trip.endDate).format("YYYY-MM-DD");
        const newStartDate = dayjs(start).format("YYYY-MM-DD");
        const newEndDate = dayjs(end).format("YYYY-MM-DD");
  
        if (newStartDate < tripStart || newEndDate > tripEnd) {
          console.warn("Drag restricted: Event cannot be moved outside trip dates.");
          notifyRef.current(`Events have to stay between ${tripStart} and ${tripEnd}.`, "error");
          revert(); 
        } else {
          console.log("Event moved successfully.");
        }
      }
    }
  });
  

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

  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  useEffect(() => {
    tripRef.current = trip;
    notifyRef.current = showToast;
  }, [trip, showToast]);

  // Calendar setup
  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
    calendars: EVENT_CALENDARS,
    events: [], // Initially empty
    plugins: [dragAndDropPlugin, calendarControlsPlugin, eventsServicePlugin,eventModal],
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
                title: "",
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
            setNewEvent({ title: "", date: dayjs(date).format("YYYY-MM-DD"), startTime: "", endTime: "" });
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
        const formattedEvents = eventsResponse.data.data.map((event) => ({
          id: event._id,
          title: event.title,
          calendarId: "trip",
          start: dayjs(`${event.date} ${event.startTime}`).format("YYYY-MM-DD HH:mm"),
          end: dayjs(`${event.date} ${event.endTime}`).format("YYYY-MM-DD HH:mm"),
        }));

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
    const authToken = getToken();

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
            await axios.put(
                `${API_URL}/api/events/${editingEvent.id}`,
                {
                    title: newEvent.title,
                    date: newEvent.date,
                    startTime: newEvent.startTime,
                    endTime: newEvent.endTime,
                }
            );

            setSelectedDates((prev) =>
                prev.map((event) =>
                    event.id === editingEvent.id
                        ? {
                            ...event,
                            title: newEvent.title,
                            start: dayjs(`${newEvent.date} ${newEvent.startTime}`).format("YYYY-MM-DD HH:mm"),
                            end: dayjs(`${newEvent.date} ${newEvent.endTime}`).format("YYYY-MM-DD HH:mm"),
                        }
                        : event
                )
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

            setSelectedDates((prev) => [
                ...prev,
                {
                    id: response.data.data._id,
                    title: response.data.data.title,
                    calendarId: "trip",
                    start: dayjs(`${response.data.data.date} ${response.data.data.startTime}`).format("YYYY-MM-DD HH:mm"),
                    end: dayjs(`${response.data.data.date} ${response.data.data.endTime}`).format("YYYY-MM-DD HH:mm"),
                },
            ]);
        }

        // Reset the form and clear error message
        setShowCreateForm(false);
        setIsEditing(false);
        setEditingEvent(null);
        setNewEvent({ title: "", date: "", startTime: "", endTime: "" });
        setErrorMessage(""); // Clear error message

    } catch (err) {
        console.error("Error handling event:", err);
        setErrorMessage("Failed to process event. Please try again.");
    }
  };
  const handleDeleteEvent = async () => {
    if (!editingEvent) return;
    setConfirmingDelete(false);

    const authToken = getToken();

    try {
        await axios.delete(`${API_URL}/api/events/${editingEvent.id}`);

        // Remove the deleted event from the state
        setSelectedDates((prev) => prev.filter(event => event.id !== editingEvent.id));

        // Reset form and close modal
        setShowCreateForm(false);
        setIsEditing(false);
        setEditingEvent(null);
        setNewEvent({ title: "", date: "", startTime: "", endTime: "" });

        showToast("Event deleted", "success");
    } catch (err) {
        console.error("Error deleting event:", err);
        setErrorMessage("Failed to delete the event. Please try again.");
    }
  };

  const handleInviteMember = async (email) => {
    const authToken = getToken();
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
    const authToken = getToken();
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

  const roleOf = (member) =>
    member._id === trip.createdBy._id
      ? "owner"
      : trip.memberRoles?.find((entry) => entry.user === member._id)?.role || "editor";

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
    setNewEvent({ title: "", date: "", startTime: "", endTime: "" });
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

  const memberPhoto = (member) => assetUrl(member.profilePicture);

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
              <TripPlaces trip={trip} userId={userId} isOrganiser={isOrganiser} />
            </Suspense>
          )}
          {userId && section === "polls" && (
            <TripPolls
              trip={trip}
              userId={userId}
              isOrganiser={isOrganiser}
              onEventCreated={(event) =>
                setSelectedDates((prev) => [
                  ...prev,
                  {
                    id: event._id,
                    title: event.title,
                    calendarId: "trip",
                    start: dayjs(`${event.date} ${event.startTime}`).format("YYYY-MM-DD HH:mm"),
                    end: dayjs(`${event.date} ${event.endTime}`).format("YYYY-MM-DD HH:mm"),
                  },
                ])
              }
            />
          )}
          {userId && section === "expenses" && (
            <TripExpenses trip={trip} members={members} userId={userId} isOrganiser={isOrganiser} />
          )}
          {userId && section === "lists" && (
            <TripChecklist trip={trip} members={members} userId={userId} isOrganiser={isOrganiser} />
          )}
        </SectionSidebar>

      {/* Members */}
      <Modal open={showManageMembers} onClose={() => setShowManageMembers(false)} title="Members" className="max-w-lg">
        <p className="text-sm text-ink-soft">
          Organised by <span className="font-bold text-ink">{trip.createdBy.name}</span>
        </p>

        <ul className="mt-4 space-y-3">
          {members.map((member) => (
            <li key={member._id} className="flex items-center gap-3">
              <Avatar src={memberPhoto(member)} name={member.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{member.name}</p>
                <p className="truncate text-sm text-ink-soft">{member.email}</p>
              </div>
              {member._id === trip.createdBy._id ? (
                <span className="rounded-full bg-mustard px-2.5 py-1 text-xs font-extrabold text-ink">Organiser</span>
              ) : isOrganiser ? (
                <>
                  <select
                    aria-label={`Role for ${member.name}`}
                    value={roleOf(member)}
                    onChange={(e) => handleChangeRole(member, e.target.value)}
                    className="rounded-full border-0 bg-lagoon-light px-3 py-1.5 text-sm font-extrabold text-ink"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="button"
                    aria-label={`Remove ${member.name}`}
                    onClick={() => handleRemoveMember(member._id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-lagoon-light"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </>
              ) : (
                <span className="rounded-full bg-lagoon-light px-2.5 py-1 text-xs font-extrabold capitalize text-ink">
                  {roleOf(member)}
                </span>
              )}
            </li>
          ))}
        </ul>

        {isOrganiser && (
          <form
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              handleInviteMember(e.target.email.value);
              e.target.reset();
            }}
          >
            <label htmlFor="invite-email" className="field-label">
              Invite by email
            </label>
            <div className="flex gap-2">
              <input
                id="invite-email"
                type="email"
                name="email"
                placeholder="friend@example.com"
                autoComplete="off"
                required
                className="field"
              />
              <button type="submit" className="btn-dark shrink-0">
                Send invite
              </button>
            </div>
          </form>
        )}

        {isOrganiser && <InviteLink tripId={trip._id} tripName={trip.name} />}

        <div className="mt-6 flex justify-end">
          <button type="button" className="btn-ghost" onClick={() => setShowManageMembers(false)}>
            Done
          </button>
        </div>
      </Modal>

      {/* Create / edit event */}
      <Modal open={showCreateForm} onClose={closeEventForm} title={isEditing ? "Edit event" : "Add event"} className="overflow-visible">
        <form onSubmit={handleSubmitEvent} className="space-y-4" noValidate>
          <div>
            <label htmlFor="event-title" className="field-label">
              Event
            </label>
            <input
              id="event-title"
              type="text"
              className="field"
              placeholder="Dinner at the harbour"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="event-date" className="field-label">
              Date
            </label>
            <DatePicker
              id="event-date"
              value={newEvent.date}
              min={trip.startDate ? dayjs(trip.startDate).format("YYYY-MM-DD") : undefined}
              max={trip.endDate ? dayjs(trip.endDate).format("YYYY-MM-DD") : undefined}
              onChange={(date) => setNewEvent({ ...newEvent, date })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-start" className="field-label">
                Starts
              </label>
              <TimePicker
                id="event-start"
                value={newEvent.startTime}
                onChange={(startTime) => setNewEvent({ ...newEvent, startTime })}
              />
            </div>
            <div>
              <label htmlFor="event-end" className="field-label">
                Ends
              </label>
              <TimePicker
                id="event-end"
                value={newEvent.endTime}
                onChange={(endTime) => setNewEvent({ ...newEvent, endTime })}
              />
            </div>
          </div>

          {errorMessage && (
            <p role="alert" className="text-sm font-bold text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {isEditing && (
              <button
                type="button"
                className="mr-auto border-0 bg-transparent p-0 text-sm font-extrabold text-plum underline hover:text-plum"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete event
              </button>
            )}
            <button type="button" className="btn-ghost ml-auto" onClick={closeEventForm}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isEditing ? "Save changes" : "Add event"}
            </button>
          </div>
        </form>
      </Modal>

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
