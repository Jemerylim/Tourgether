import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar/Navbar";
import CalendarComponent from "../../components/Calendar/Calendar";
import "./Trip.css";

const Trip = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trip, setTrip] = useState(null);
    const [error, setError] = useState("");
    const [selectedDates, setSelectedDates] = useState([]);
    const [userId, setUserId] = useState(null);
    const [submissionError, setSubmissionError] = useState("");


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
            } catch (err) {
                console.error("Error fetching trip or user details:", err);
                setError(
                    err.response?.data?.message || "Failed to fetch details. Please try again later."
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
            return; // Block submission
        }
    
        setSubmissionError(""); // Clear any previous error message
    
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

            {trip.startDate === null && trip.endDate === null && (
                <div className="calendar-section">
                    <h2>Vote for Your Available Dates</h2>
                    <CalendarComponent
                        initialEvents={selectedDates}
                        onEventAdd={handleEventAdd}
                        onDatesChange={handleDatesChange} // Track all changes to selected dates
                    />
                    <button className="button submit-button" onClick={submitAvailability}>
                        Submit Availability
                    </button>
                    {submissionError && <p className="error-message">{submissionError}</p>}
                </div>
            )}
        </div>
    );
};

export default Trip;
