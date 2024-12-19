import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar/Navbar";
import "./MyTrips.css";

const MyTrips = () => {
    const [trips, setTrips] = useState([]); // Default state as an empty array
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserTrips = async () => {
            const authToken = localStorage.getItem("authToken");
            if (!authToken) {
                setError("Authorization token is missing. Please log in again.");
                setLoading(false);
                return;
            }

            try {
                // Fetch user profile to get userId
                const userResponse = await axios.get("http://localhost:5000/api/users/profile", {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                });
                const userId = userResponse.data.user._id || userResponse.data.user.id;

                // Fetch trips for the user
                const tripsResponse = await axios.get(`http://localhost:5000/api/trips/user/${userId}`, {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                });
                setTrips(tripsResponse.data.data || []); // Safely access trips data
            } catch (err) {
                console.error("Error fetching trips:", err);
                setError("Failed to fetch trips. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserTrips();
    }, []);

    if (loading) {
        return <div className="loading-message">Loading your trips...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="my-trips-container">
            <Navbar />
            <h1 className="page-title">My Trips</h1>
            <div className="trips-list">
                {trips.length > 0 ? (
                    trips.map((trip) => (
                        <div
                            key={trip._id}
                            className="trip-card"
                            onClick={() => navigate(`/trip/${trip._id}`)}
                        >
                            <h2 className="trip-name">{trip.name}</h2>
                            <p className="trip-dates">
                                {trip.startDate
                                    ? new Date(trip.startDate).toLocaleDateString()
                                    : "Start date: TBD"}{" "}
                                -{" "}
                                {trip.endDate
                                    ? new Date(trip.endDate).toLocaleDateString()
                                    : "End date: TBD"}
                            </p>
                            <p className="trip-description">{trip.description || "No description available."}</p>
                        </div>
                    ))
                ) : (
                    <p className="no-trips-message">You have no trips yet.</p>
                )}
            </div>
        </div>
    );
};

export default MyTrips;
