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
        const userResponse = await axios.get("http://52.44.156.98:5000/api/users/profile", {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        const userId = userResponse.data.user._id || userResponse.data.user.id;

        // Fetch trips for the user
        const tripsResponse = await axios.get(`http://52.44.156.98:5000/api/trips/user/${userId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const fetchedTrips = tripsResponse.data.data || [];

        // Fetch images from Unsplash for trips without images
        const updatedTrips = await Promise.all(
          fetchedTrips.map(async (trip) => {
            if (!trip.imageUrl) {
              try {
                const unsplashResponse = await axios.get("https://api.unsplash.com/search/photos", {
                  params: {
                    query: trip.name,
                    client_id: "DDOKamLCV-2O-QX_nzSEnmYvoSFVw_2Eyp9H5dnUFR8",
                    per_page: 1,
                    orientation: "landscape",
                  },
                });

                if (unsplashResponse.data.results.length > 0) {
                  trip.imageUrl = unsplashResponse.data.results[0].urls.regular;
                } else {
                  trip.imageUrl = "../../assets/travel.jpg"; // Fallback default image
                }
              } catch (err) {
                console.error(`Error fetching image for trip "${trip.name}":`, err);
                trip.imageUrl = "../../assets/travel.jpg"; // Fallback default image
              }
            }
            return trip;
          })
        );

        setTrips(updatedTrips);
      } catch (err) {
        console.error("Error fetching trips:", err);
        if (err.response?.status === 404) {
          setTrips([]); // Handle case where no trips exist
        } else if (err.response?.status === 401) {
          console.log("Session expired or unauthorized. Redirecting to login.");
          localStorage.removeItem("authToken");
          navigate("/login");
        } else {
          setError("Failed to fetch trips. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserTrips();
  }, []);

  const handleCreateNewTrip = () => {
    navigate("/create-trip");
  };

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
      <button onClick={handleCreateNewTrip} className="create-trip-button">
        Create New Trip
      </button>
      <div className="trips-grid">
        {trips.length > 0 ? (
          trips.map((trip) => (
            <Card
              key={trip._id}
              title={trip.name}
              content={`${trip.startDate ? new Date(trip.startDate).toLocaleDateString() : "TBD"} - ${
                trip.endDate ? new Date(trip.endDate).toLocaleDateString() : "TBD"
              }`}
              imageUrl={trip.imageUrl}
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
