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
import "@schedule-x/theme-default/dist/index.css";
import "./Trip.css";
import dayjs from "dayjs";

// Plugins
const calendarControlsPlugin = createCalendarControlsPlugin({
    showTodayButton: false, // Hide the "Today" button
  showDatePicker: false,  // Hide the date picker
});
const eventsServicePlugin = createEventsServicePlugin();

const Trip = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState("");
  const [selectedDates, setSelectedDates] = useState([]);
  const [userId, setUserId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
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
    plugins: [createDragAndDropPlugin(), calendarControlsPlugin, eventsServicePlugin],
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

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const authToken = localStorage.getItem("authToken");

    if (!newEvent.title || !newEvent.date || !newEvent.startTime || !newEvent.endTime) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5000/api/events",
        {
          tripId: trip._id,
          title: newEvent.title,
          date: newEvent.date,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      // Add the new event dynamically
      const newEventFormatted = {
        id: response.data.data._id,
        title: response.data.data.title,
        start: dayjs(`${response.data.data.date} ${response.data.data.startTime}`).format("YYYY-MM-DD HH:mm"),
        end: dayjs(`${response.data.data.date} ${response.data.data.endTime}`).format("YYYY-MM-DD HH:mm"),
      };

      setSelectedDates((prev) => [...prev, newEventFormatted]); // Update state
      setShowCreateForm(false);
      setNewEvent({ title: "", date: "", startTime: "", endTime: "" });
    } catch (err) {
      console.error("Error creating event:", err);
      alert("Failed to create event. Please try again.");
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
            <h2>Create Event</h2>
            <form onSubmit={handleCreateEvent}>
              <label>
                Event Title:
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, title: e.target.value })
                  }
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
                    onChange={(e) =>
                    setNewEvent({ ...newEvent, date: e.target.value })
                    }
                    required
                />
                </label>
              <label>
                Start Time:
                <input
                  type="time"
                  value={newEvent.startTime}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, startTime: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                End Time:
                <input
                  type="time"
                  value={newEvent.endTime}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, endTime: e.target.value })
                  }
                  required
                />
              </label>
              <button type="submit">Add Event</button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trip;
