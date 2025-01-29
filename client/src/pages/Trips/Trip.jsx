import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar/Navbar";
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import {
  createViewDay,
  createViewWeek,
} from "@schedule-x/calendar";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { createEventModalPlugin } from '@schedule-x/event-modal'
import "@schedule-x/theme-default/dist/index.css";
import "./Trip.css";
import dayjs from "dayjs";

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
        
        if (!trip || !trip.startDate || !trip.endDate) {
          console.warn("Trip details not loaded yet.");
          return;
        }
  
        const tripStart = dayjs(trip.startDate).format("YYYY-MM-DD");
        const tripEnd = dayjs(trip.endDate).format("YYYY-MM-DD");
        const newStartDate = dayjs(start).format("YYYY-MM-DD");
        const newEndDate = dayjs(end).format("YYYY-MM-DD");
  
        if (newStartDate < tripStart || newEndDate > tripEnd) {
          console.warn("Drag restricted: Event cannot be moved outside trip dates.");
          alert(`Event must stay between ${tripStart} and ${tripEnd}`);
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
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState("");
  const [selectedDates, setSelectedDates] = useState([]);
  const [userId, setUserId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
const [editingEvent, setEditingEvent] = useState(null);
const [errorMessage, setErrorMessage] = useState("");

  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  // Calendar setup
  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek()],
    events: [], // Initially empty
    plugins: [dragAndDropPlugin, calendarControlsPlugin, eventsServicePlugin,eventModal],
    callbacks:{
        onDoubleClickEvent: (event) => {
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

  // Fetch trip and event details
  useEffect(() => {
    const fetchTripDetails = async () => {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        setError("Authorization token is missing. Please log in again.");
        return;
      }

      try {
        // Fetch trip details
        const tripResponse = await axios.get(
          `http://localhost:5000/api/trips/${id}`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        const fetchedTrip = tripResponse.data.data;
        setTrip(fetchedTrip);

        // Fetch user details
        const userResponse = await axios.get(
          "http://localhost:5000/api/users/profile",
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        if (userResponse.data.user) {
          setUserId(userResponse.data.user._id || userResponse.data.user.id);
        } else {
          setError(
            "User information could not be retrieved. Please log in again."
          );
        }

        // Set calendar restrictions based on trip dates
        const tripStartDate = dayjs(fetchedTrip.startDate).format("YYYY-MM-DD");
        const tripEndDate = dayjs(fetchedTrip.endDate).format("YYYY-MM-DD");

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
          `http://localhost:5000/api/events/trip/${id}`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );

        // Format events for the calendar
        const formattedEvents = eventsResponse.data.data.map((event) => ({
          id: event._id,
          title: event.title,
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
  }, [id]);

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    const authToken = localStorage.getItem("authToken");

    if (!newEvent.title || !newEvent.date || !newEvent.startTime || !newEvent.endTime) {
        setErrorMessage("Please fill in all fields.");
        return;
    }

    if (!trip || !trip.startDate || !trip.endDate) {
        setErrorMessage("Trip details are missing. Please try again.");
        return;
    }

    const tripStart = dayjs(trip.startDate).format("YYYY-MM-DD");
    const tripEnd = dayjs(trip.endDate).format("YYYY-MM-DD");
    const selectedDate = dayjs(newEvent.date).format("YYYY-MM-DD");

    if (selectedDate < tripStart || selectedDate > tripEnd) {
        setErrorMessage(`Event date must be between ${tripStart} and ${tripEnd}`);
        return;
    }

    try {
        if (isEditing && editingEvent) {
            await axios.put(
                `http://localhost:5000/api/events/${editingEvent.id}`,
                {
                    title: newEvent.title,
                    date: newEvent.date,
                    startTime: newEvent.startTime,
                    endTime: newEvent.endTime,
                },
                { headers: { Authorization: `Bearer ${authToken}` } }
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
                "http://localhost:5000/api/events",
                {
                    tripId: trip._id,
                    title: newEvent.title,
                    date: newEvent.date,
                    startTime: newEvent.startTime,
                    endTime: newEvent.endTime,
                },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            setSelectedDates((prev) => [
                ...prev,
                {
                    id: response.data.data._id,
                    title: response.data.data.title,
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

    const confirmDelete = window.confirm("Are you sure you want to delete this event?");
    if (!confirmDelete) return; // Exit if user cancels

    const authToken = localStorage.getItem("authToken");

    try {
        await axios.delete(`http://localhost:5000/api/events/${editingEvent.id}`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        // Remove the deleted event from the state
        setSelectedDates((prev) => prev.filter(event => event.id !== editingEvent.id));

        // Reset form and close modal
        setShowCreateForm(false);
        setIsEditing(false);
        setEditingEvent(null);
        setNewEvent({ title: "", date: "", startTime: "", endTime: "" });

        alert("Event deleted successfully!");
    } catch (err) {
        console.error("Error deleting event:", err);
        setErrorMessage("Failed to delete the event. Please try again.");
    }
};



  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!trip) {
    return <div className="loading-message">Loading trip details...</div>;
  }

  return (
    <div className="trip-details-container">
      <Navbar />
      <div className="header">
        <button className="back-button" onClick={() => navigate("/my-trips")}>
          Back to Trips
        </button>
        <h1 className="trip-title">{trip.name}</h1>
        <button
          className="create-event-button"
          onClick={() => setShowCreateForm(true)}
        >
          Create Event
        </button>
      </div>
      <div className="calendar-section">
        <ScheduleXCalendar calendarApp={calendar} />
      </div>

      {showCreateForm && (
    <div className="event-form-overlay">
        <div className="event-form">
            <h2>{isEditing ? "Edit Event" : "Create Event"}</h2>
            <form onSubmit={handleSubmitEvent}>
                <label>
                    Event Title:
                    <input
                        type="text"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        required
                    />
                </label>
                <label>
                    Date:
                    <input
                        type="date"
                        value={newEvent.date}
                        min={trip.startDate ? dayjs(trip.startDate).format("YYYY-MM-DD") : ""}
                        max={trip.endDate ? dayjs(trip.endDate).format("YYYY-MM-DD") : ""}
                        onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                        required
                    />
                </label>
                <label>
                    Start Time:
                    <input
                        type="time"
                        value={newEvent.startTime}
                        onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                        required
                    />
                </label>
                <label>
                    End Time:
                    <input
                        type="time"
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                        required
                    />
                </label>

                {errorMessage && <div className="error-message-box">{errorMessage}</div>}

                <button type="submit">{isEditing ? "Update Event" : "Add Event"}</button>
                <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {
                        setShowCreateForm(false);
                        setIsEditing(false);
                        setEditingEvent(null);
                        setNewEvent({ title: "", date: "", startTime: "", endTime: "" });
                    }}
                >
                    Cancel
                </button>

                {/* 🗑️ Delete Button: Only Show When Editing an Event */}
                {isEditing && (
                    <button
                        type="button"
                        className="delete-button"
                        onClick={handleDeleteEvent}
                    >
                        Delete Event
                    </button>
                )}
            </form>
        </div>
    </div>
)}

    </div>
  );
};

export default Trip;
