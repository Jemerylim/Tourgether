import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar/Navbar";
import { Plane, Plus } from "lucide-react";
import Card from "../../components/Cards/Card";
import { API_URL } from "../../config";

const Dashboard = () => {
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
        const userResponse = await axios.get(`${API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
  
        const userId = userResponse.data.user?._id || userResponse.data.user?.id;

        if (!userId) {
          console.error("Failed to retrieve user ID.");
          setError("Error: Failed to retrieve user ID. Please log in again.");
          localStorage.removeItem("authToken"); // Clear token if user ID is missing
          navigate("/login");
          setLoading(false);
          return;
        }
  
        console.log("Fetched userId:", userId);
  
        // Fetch trips for the user
        const tripsResponse = await axios.get(`${API_URL}/api/trips/user/${userId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
  
        setTrips(tripsResponse.data.data || []);
      } catch (err) {
        console.error("Error fetching trips:", err);
        if (err.response?.status === 401) {
          localStorage.removeItem("authToken");
          navigate("/login");
        } else if (err.response?.status === 400) {
          setError("Invalid user ID format.");
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
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <p role="status" className="py-24 text-ink-soft">Loading your trips...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <p role="alert" className="py-24 font-bold text-red-700">{error}</p>
      </div>
    );
  }

  const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : "TBD");

  return (
    <div className="min-h-screen bg-paper text-left">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-4xl text-ink sm:text-5xl">Your trips</h1>
          <button className="btn-primary" onClick={() => navigate("/create-trip")}>
            <Plus size={18} aria-hidden="true" />
            Add trip
          </button>
        </div>

        {trips.length > 0 ? (
          <div className="mt-10 grid gap-8 xl:grid-cols-2">
            {trips.map((trip) => (
              <Card
                key={trip._id}
                title={trip.name}
                start={formatDate(trip.startDate)}
                end={formatDate(trip.endDate)}
                imageUrl={trip.imageUrl}
                onClick={() => navigate(`/trip/${trip._id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-start rounded-3xl bg-lagoon-light p-8 sm:p-12">
            <Plane size={32} className="text-ink" aria-hidden="true" />
            <h2 className="mt-4 font-display text-3xl text-ink">No trips yet</h2>
            <p className="mt-2 max-w-sm text-ink-soft">
              Create a trip, then invite the people you want to travel with.
            </p>
            <button className="btn-primary mt-6" onClick={() => navigate("/create-trip")}>
              Create your first trip
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
