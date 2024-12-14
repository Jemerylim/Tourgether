import React, { useState,useEffect  } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar/Navbar";
import "./Trip.css";

const TripDetails = () => {
    const { id } = useParams(); // Extract trip ID from the route
    const navigate = useNavigate();
    const [trip, setTrip] = useState(null);
    const [error, setError] = useState("");

    // Fetch trip details
    useEffect(() => {
        const fetchTripDetails = async () => {
            const authToken = localStorage.getItem("authToken");
            if (!authToken) {
                setError("Authorization token is missing. Please log in again.");
                return;
            }

            try {
                const response = await axios.get(`http://localhost:5000/api/trips/${id}`, {
                    headers: {
                        Authorization: `Bearer ${authToken}`, // Include token in headers
                    },
                });
                setTrip(response.data.data);
            } catch (err) {
                console.error("Error fetching trip details:", err);
                setError(
                    err.response?.data?.message || "Failed to fetch trip details. Please try again later."
                );
            }
        };

        fetchTripDetails();
    }, [id]);

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    if (!trip) {
        return <div className="loading-message">Loading trip details...</div>;
    }

    return (
        <div className="trip-details-container">
            <Navbar />
            <div className="trip-card">
                <h1 className="trip-title">{trip.name}</h1>
                <div className="trip-info">
                    <p>
                        <strong>Start Date:</strong>{" "}
                        {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : "To be decided"}
                    </p>
                    <p>
                        <strong>End Date:</strong>{" "}
                        {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : "To be decided"}
                    </p>
                    <p>
                        <strong>Picking Dates Through Vote:</strong>{" "}
                        {trip.startDate === "" && trip.endDate === "" ? "Yes" : "No"}
                    </p>
                    <p>
                        <strong>Group Members:</strong>
                    </p>
                    <ul className="member-list">
                        {trip.members.map((member) => (
                            <li key={member.id}>
                                {member.name} ({member.email})
                            </li>
                        ))}
                    </ul>
                </div>
                <button
                    className="button"
                    onClick={() => navigate("/trips")} // Redirect to the trips list page
                >
                    Back to Trips
                </button>
            </div>
        </div>
    );
};

export default TripDetails;
