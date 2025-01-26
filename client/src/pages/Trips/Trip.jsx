import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar/Navbar";
// import CalendarComponent from "../../components/Calendar/Calendar";
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import {
  createViewDay,
  createViewWeek,
  createViewMonthGrid,
  createViewMonthAgenda,
} from "@schedule-x/calendar";
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop'
import "@schedule-x/theme-default/dist/index.css";
import "./Trip.css";

const Trip = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trip, setTrip] = useState(null);
    const [error, setError] = useState("");
    const [selectedDates, setSelectedDates] = useState([]);
    const [allAvailabilities, setAllAvailabilities] = useState([]);
    const [userId, setUserId] = useState(null);
    const [submissionError, setSubmissionError] = useState("");

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
    
      const calendar = useCalendarApp({
        views: [createViewDay(), createViewWeek(), createViewMonthGrid(), createViewMonthAgenda()],
        events: mockEvents,
        plugins: [createDragAndDropPlugin()],
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
                const tripResponse = await axios.get(`http://localhost:5000/api/trips/${id}`, {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                });
                setTrip(tripResponse.data.data);
    
                // Fetch user details
                const userResponse = await axios.get("http://localhost:5000/api/users/profile", {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                });
                if (userResponse.data.user) {
                    setUserId(userResponse.data.user._id || userResponse.data.user.id);
                } else {
                    setError("User information could not be retrieved. Please log in again.");
                }
    
                // Fetch all availabilities for the trip
                const availabilityResponse = await axios.get(`http://localhost:5000/api/usertripdate/trip/${id}`, {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                });
    
                // Log the raw availability data
                console.log("Raw availability data:", availabilityResponse.data);
    
                // Flatten availabilities for all users
                const availabilities = availabilityResponse.data.map((availability) =>
                    availability.availDates.map((date) => ({
                        id: availability.userId._id,
                        title: `${availability.userId.name}'s availability`,
                        start: new Date(date), // Convert to Date object
                        end: new Date(date), // Assuming single-day events
                    }))
                ).flat(); // Flatten nested arrays into a single array
    
                console.log("Processed availabilities for calendar:", availabilities);
    
                setAllAvailabilities(availabilities);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError(
                    err.response?.data?.message || "Failed to fetch data. Please try again later."
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

    const submitAvailability = async () => {
        if (selectedDates.length === 0) {
            setSubmissionError("Please select at least one date before submitting.");
            return;
        }

        setSubmissionError("");

        const authToken = localStorage.getItem("authToken");
        if (!authToken) {
            setError("Authorization token is missing. Please log in again.");
            return;
        }

        try {
            await axios.put(
                `http://localhost:5000/api/usertripdate/trip/${id}/user/${userId}`,
                { availDates: selectedDates.map((event) => event.start) },
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                }
            );
            alert("Your availability has been submitted!");
        } catch (err) {
            console.error("Error submitting availability:", err);
            setSubmissionError("Failed to submit availability. Please try again later.");
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
            <button className="back-button" onClick={() => navigate("/my-trips")}>
                Back to Trips
            </button>
            <h1 className="trip-title">{trip.name}</h1>
            <div className="divider"></div>

            <div className="calendar-section">
                <h2>Trip Calendar</h2>
                <ScheduleXCalendar calendarApp={calendar} />
            </div>

            {/* For future date voting 
            <div className="calendar-section">
                <h2>All Users' Availabilities</h2>
                <CalendarComponent
                    initialEvents={allAvailabilities}
                    onEventAdd={handleEventAdd}
                    onDatesChange={handleDatesChange}
                />
                {trip.startDate === null && trip.endDate === null && (
                    <>
                        <h2>Your Available Dates</h2>
                        <button className="button submit-button" onClick={submitAvailability}>
                            Submit Availability
                        </button>
                        {submissionError && <p className="error-message">{submissionError}</p>}
                    </>
                )}
            </div> */}
        </div>
    );
};

export default Trip;
