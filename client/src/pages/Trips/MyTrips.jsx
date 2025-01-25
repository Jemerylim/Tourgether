import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar/Navbar";
import Card from "../../components/Cards/Card"; // Assuming the Card component is created
import "./MyTrips.css";

const MyTrips = () => {
  const [trips, setTrips] = useState([]);
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
        setTrips(tripsResponse.data.data || []); // Safely set trips data
      } catch (err) {
        console.error("Error fetching trips:", err);
        if (err.response?.status === 404) {
          setTrips([]); // Handle case where no trips exist
        } else {
          setError("Failed to fetch trips. Please try again later.");
        }
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
      <div className="trips-grid">
        {trips.length > 0 ? (
          trips.map((trip) => (
            <Card
              key={trip._id}
              title={trip.name}
              content={`${trip.startDate ? new Date(trip.startDate).toLocaleDateString() : "TBD"} - ${
                trip.endDate ? new Date(trip.endDate).toLocaleDateString() : "TBD"
              }`}
              imageUrl={trip.imageUrl || "/path/to/default-image.jpg"} // Default image if none provided
              onClick={() => navigate(`/trip/${trip._id}`)}
            />
          ))
        ) : (
          <p className="no-trips-message">You have no trips yet. Create a trip to get started!</p>
        )}
      </div>
    </div>
  );
};

export default MyTrips;
