import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";
import { CalendarDays } from "lucide-react";
import PageLayout from "../../components/PageLayout/PageLayout";
import SaveIndicator from "../../components/SaveIndicator/SaveIndicator";
import ConfirmDialog from "../../components/Modal/ConfirmDialog";
import { useToast } from "../../components/Toast/Toast";
import { EmptyState, ErrorState, LoadingState } from "../../components/PageState/PageState";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";

const AllEvents = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState({});
  const [notesState, setNotesState] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState("");
  const [eventToDelete, setEventToDelete] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchEvents = async () => {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        return navigate("/login", { replace: true });
      }

      try {
        // Fetch trip details
        const tripResponse = await axios.get(`${API_URL}/api/trips/${id}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setTrip(tripResponse.data.data);

        // Fetch events associated with the trip
        const eventsResponse = await axios.get(`${API_URL}/api/events/trip/${id}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        // Format each event
        const formattedEvents = eventsResponse.data.data.map((event) => ({
          id: event._id,
          title: event.title,
          date: dayjs(event.date).format("YYYY-MM-DD"),
          startTime: dayjs(`${event.date} ${event.startTime}`).format("HH:mm"),
          endTime: dayjs(`${event.date} ${event.endTime}`).format("HH:mm"),
          notes: event.notes || "",
        }));

        // Group events by date
        const groupedEvents = formattedEvents.reduce((acc, event) => {
          if (!acc[event.date]) {
            acc[event.date] = [];
          }
          acc[event.date].push(event);
          return acc;
        }, {});

        setEvents(groupedEvents);

        // Initialize local notes state with the notes stored in the database
        const initialNotes = {};
        formattedEvents.forEach((e) => {
          initialNotes[e.id] = e.notes;
        });
        setNotesState(initialNotes);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError(apiErrorMessage(err, "Couldn't load the events"));
      }
    };

    fetchEvents();
  }, [id, navigate]);

  // Handle text changes in the notes text area
  const handleNotesChange = (eventId, value) => {
    setNotesState((prev) => ({ ...prev, [eventId]: value }));
    setSaveStatus((prev) => ({ ...prev, [eventId]: "idle" }));
  };

  // Auto-save notes to the server (PUT /api/events/:id), called when the textarea loses focus
  const handleSaveNotes = async (eventId) => {
    const authToken = localStorage.getItem("authToken");
    setSaveStatus((prev) => ({ ...prev, [eventId]: "saving" }));
    try {
      await axios.put(
        `${API_URL}/api/events/${eventId}`,
        { notes: notesState[eventId] || "" },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSaveStatus((prev) => ({ ...prev, [eventId]: "saved" }));
    } catch (err) {
      console.error("Error saving notes:", err);
      setSaveStatus((prev) => ({ ...prev, [eventId]: "error" }));
    }
  };

  const handleDeleteEvent = async () => {
    const { id: eventId, date } = eventToDelete;
    const authToken = localStorage.getItem("authToken");
    setEventToDelete(null);
    try {
      await axios.delete(`${API_URL}/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setEvents((prev) => {
        const remaining = prev[date].filter((e) => e.id !== eventId);
        const next = { ...prev, [date]: remaining };
        if (remaining.length === 0) delete next[date];
        return next;
      });
      showToast("Event deleted", "success");
    } catch (err) {
      console.error("Error deleting event:", err);
      showToast(apiErrorMessage(err, "Couldn't delete that event"), "error");
    }
  };

  const days = Object.keys(events).sort();
  const canEdit = trip?.myRole !== "viewer";

  let content;
  if (error) {
    content = <ErrorState message={error} onRetry={() => window.location.reload()} />;
  } else if (!trip) {
    content = <LoadingState message="Loading events..." />;
  } else if (days.length === 0) {
    content = (
      <EmptyState
        icon={CalendarDays}
        title="Nothing planned yet"
        text={canEdit ? "Add the first event on the trip calendar and it will show up here." : "Events added to the trip calendar will show up here."}
        action={
          canEdit && (
            <button className="btn-primary" onClick={() => navigate(`/trip/${id}`)}>
              Add an event
            </button>
          )
        }
      />
    );
  } else {
    content = (
      <div className="space-y-12">
        {days.map((date) => (
          <section key={date} aria-labelledby={`day-${date}`}>
            <h2 id={`day-${date}`} className="mb-5 font-display text-2xl text-ink">
              {dayjs(date).format("dddd, D MMMM")}
            </h2>
            <ul className="space-y-4">
              {[...events[date]]
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((event) => (
                  <li
                    key={event.id}
                    className="grid gap-4 rounded-2xl bg-white p-5 drop-shadow-ticket sm:grid-cols-[9rem_1fr]"
                  >
                    <p className="font-extrabold text-ink">
                      {event.startTime} to {event.endTime}
                    </p>
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-extrabold text-ink">{event.title}</h3>
                        {canEdit && (
                          <button
                            type="button"
                            className="border-0 bg-transparent p-0 text-sm font-extrabold text-plum underline hover:text-plum"
                            onClick={() => setEventToDelete({ id: event.id, date, title: event.title })}
                          >
                            Delete event
                          </button>
                        )}
                      </div>
                      <label htmlFor={`notes-${event.id}`} className="field-label mt-3">
                        Notes
                      </label>
                      <textarea
                        id={`notes-${event.id}`}
                        className="field min-h-[5.5rem] resize-y"
                        placeholder={canEdit ? "Add notes, links, who's bringing what..." : "No notes"}
                        readOnly={!canEdit}
                        value={notesState[event.id] || ""}
                        onChange={(e) => handleNotesChange(event.id, e.target.value)}
                        // Auto-save when the user clicks away
                        onBlur={() => handleSaveNotes(event.id)}
                      />
                      <SaveIndicator
                        status={saveStatus[event.id] || "idle"}
                        onRetry={() => handleSaveNotes(event.id)}
                      />
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <PageLayout
      maxWidth="max-w-4xl"
      back={location.state?.from || { to: `/trip/${id}`, label: trip ? trip.name : "Back to trip" }}
      title="All events"
      subtitle={trip ? `The plan for ${trip.name}, day by day.` : undefined}
    >
      {content}
      <ConfirmDialog
        open={Boolean(eventToDelete)}
        title="Delete this event?"
        message={`"${eventToDelete?.title}" will be removed from the trip calendar for everyone.`}
        confirmLabel="Delete event"
        onCancel={() => setEventToDelete(null)}
        onConfirm={handleDeleteEvent}
      />
    </PageLayout>
  );
};

export default AllEvents;
