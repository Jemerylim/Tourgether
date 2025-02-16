// src/pages/AllEvents.js

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar/Navbar";
import dayjs from "dayjs";
import "./AllEvents.css";

const AllEvents = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [notesState, setNotesState] = useState({});
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        setError("Authorization token is missing. Please log in again.");
        return navigate("/login");
      }

      try {
        // Fetch trip details
        const tripResponse = await axios.get(
          `http://localhost:5000/api/trips/${id}`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        setTrip(tripResponse.data.data);

        // Fetch events associated with the trip
        const eventsResponse = await axios.get(
          `http://localhost:5000/api/events/trip/${id}`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );

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

        // Initialize local notes state
        const initialNotes = {};
        formattedEvents.forEach((e) => {
          initialNotes[e.id] = e.notes; // store existing notes from DB
        });
        setNotesState(initialNotes);

      } catch (err) {
        console.error("Error fetching events:", err);
        setError(
          err.response?.data?.message ||
            "Failed to fetch events. Please try again later."
        );
      }
    };

    fetchEvents();
  }, [id, navigate]);

  // Handle text changes in the notes text area
  const handleNotesChange = (eventId, value) => {
    setNotesState((prev) => ({ ...prev, [eventId]: value }));
  };

  // Auto-save notes to the server (PUT /api/events/:id)
  // Called on textarea blur
  const handleSaveNotes = async (eventId) => {
    const authToken = localStorage.getItem("authToken");
    try {
      await axios.put(
        `http://localhost:5000/api/events/${eventId}`,
        { notes: notesState[eventId] || "" },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      console.log("Notes auto-saved for event:", eventId);
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes. Please try again.");
    }
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!trip) {
    return <div className="loading-message">Loading trip details...</div>;
  }

  return (
    <div className="all-events-page">
      <Navbar />
      <div className="header">
        <button className="back-button" onClick={() => navigate(`/trip/${id}`)}>
          Back to Trip
        </button>
        <h1 className="trip-title">{trip.name} - All Events</h1>
      </div>

      <div className="events-list">
        {Object.keys(events).length === 0 ? (
          <p>No events scheduled for this trip.</p>
        ) : (
          Object.keys(events).map((date) => (
            <div key={date} className="day-events">
              <h2 className="event-date">
                {dayjs(date).format("dddd, MMMM D, YYYY")}
              </h2>
              {events[date].map((event, index) => (
                <div key={event.id} className="event-item">
                  {/* Left bullet with index */}
                  <div className="event-bullet">{index + 1}</div>

                  <div className="event-details">
                    <h3>{event.title}</h3>
                    <p className="event-time">
                      {event.date} {event.startTime} - {event.endTime}
                    </p>

                    {/* Notes label & textarea */}
                    <label
                      className="notes-label"
                      htmlFor={`notes-${event.id}`}
                    >
                      Notes:
                    </label>
                    <textarea
                      id={`notes-${event.id}`}
                      className="notes-textarea"
                      placeholder="Add notes, links, etc. here..."
                      value={notesState[event.id] || ""}
                      onChange={(e) =>
                        handleNotesChange(event.id, e.target.value)
                      }
                      // When user clicks away, auto-save
                      onBlur={() => handleSaveNotes(event.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AllEvents;
