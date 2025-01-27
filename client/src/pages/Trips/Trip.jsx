import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar/Navbar";
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import {
  createViewDay,
  createViewWeek,
} from "@schedule-x/calendar";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls"; // Added for restricting dates
import "@schedule-x/theme-default/dist/index.css";
import "./Trip.css";
import dayjs from "dayjs"; // Import dayjs for date formatting

// Initialize calendar controls plugin outside of the component
const calendarControlsPlugin = createCalendarControlsPlugin();

const Trip = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState("");
  const [selectedDates, setSelectedDates] = useState([]);
  const [userId, setUserId] = useState(null);
  const [submissionError, setSubmissionError] = useState("");

  // Mock events for testing
  const mockEvents = [
    {
      id: "1",
      title: "Team Meeting",
      start: "2025-01-16 10:05",
      end: "2025-01-16 11:05",
    },
    {
      id: "2",
      title: "Team Meeting",
      start: "2025-01-16 11:05",
      end: "2025-01-16 11:15",
    },
  ];

  // Memoize plugins to ensure they're stable
  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek()],
    events: mockEvents,
    plugins: [createDragAndDropPlugin(), calendarControlsPlugin],
  });

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
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        const fetchedTrip = tripResponse.data.data;
        setTrip(fetchedTrip);

        // Fetch user details
        const userResponse = await axios.get(
          "http://localhost:5000/api/users/profile",
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        if (userResponse.data.user) {
          setUserId(userResponse.data.user._id || userResponse.data.user.id);
        } else {
          setError(
            "User information could not be retrieved. Please log in again."
          );
        }

        // Set trip date restrictions dynamically after trip details are loaded
        const tripStartDate = dayjs(fetchedTrip.startDate).format("YYYY-MM-DD");
        const tripEndDate = dayjs(fetchedTrip.endDate).format("YYYY-MM-DD");
        console.log(tripStartDate)
        console.log(tripEndDate)

        // Ensure the plugin is initialized before calling its methods
        if (calendarControlsPlugin.$app && tripStartDate && tripEndDate) {
          calendarControlsPlugin.setDate(tripStartDate)
          calendarControlsPlugin.setMinDate(tripStartDate); // Restrict start date
          calendarControlsPlugin.setMaxDate(tripEndDate); // Restrict end date
        }
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

  const handleEventAdd = (event) => {
    setSelectedDates([...selectedDates, event]);
  };

  const handleDatesChange = (events) => {
    setSelectedDates(events);
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
      <button className="back-button" onClick={() => navigate("/my-trips")}>
        Back to Trips
      </button>
      <h1 className="trip-title">{trip.name}</h1>
      <div className="divider"></div>

      <div className="calendar-section">
        <h2>Trip Calendar</h2>
        <ScheduleXCalendar calendarApp={calendar} />
      </div>

      {/* For future date voting */}
      <div className="calendar-section">
        <h2>All Users' Availabilities</h2>
        {/* Uncomment the following if CalendarComponent is implemented */}
        {/* <CalendarComponent
          initialEvents={allAvailabilities}
          onEventAdd={handleEventAdd}
          onDatesChange={handleDatesChange}
        /> */}
        {trip.startDate === null && trip.endDate === null && (
          <>
            <h2>Your Available Dates</h2>
            <button className="button submit-button" onClick={submitAvailability}>
              Submit Availability
            </button>
            {submissionError && <p className="error-message">{submissionError}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default Trip;
