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

        const formattedEvents = eventsResponse.data.data.map((event) => ({
          id: event._id,
          title: event.title,
          date: dayjs(event.date).format("YYYY-MM-DD"),
          startTime: dayjs(`${event.date} ${event.startTime}`).format("HH:mm"),
          endTime: dayjs(`${event.date} ${event.endTime}`).format("HH:mm"),
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
              <ul>
                {events[date].map((event) => (
                  <li key={event.id} className="event-item">
                    <div className="event-details">
                      <h3>{event.title}</h3>
                      <p>
                        Time: {event.startTime} - {event.endTime}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AllEvents;
