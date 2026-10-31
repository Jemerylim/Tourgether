import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";
import { apiErrorMessage } from "./apiError";
import { withCoverImages } from "./trips";

// Loads the signed-in user's trips (profile -> trips -> cover photos) for Dashboard and
// My Trips. A missing or expired session sends the visitor to /login.
export default function useUserTrips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchTrips = async () => {
      setLoading(true);
      setError("");

      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        navigate("/login");
        return;
      }
      const headers = { Authorization: `Bearer ${authToken}` };

      try {
        const userResponse = await axios.get(`${API_URL}/api/users/profile`, { headers });
        const id = userResponse.data.user?._id || userResponse.data.user?.id;
        if (!id) {
          localStorage.removeItem("authToken");
          navigate("/login");
          return;
        }

        const tripsResponse = await axios.get(`${API_URL}/api/trips/user/${id}`, { headers });
        const withImages = await withCoverImages(tripsResponse.data.data || []);
        if (!cancelled) {
          setUserId(id);
          setTrips(withImages);
        }
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setTrips([]); // No trips yet
        } else if (err.response?.status === 401) {
          localStorage.removeItem("authToken");
          navigate("/login");
        } else if (err.response?.status === 400) {
          setError("Your account ID looks invalid. Log out and back in, then try again.");
        } else {
          setError(apiErrorMessage(err, "Couldn't load your trips"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrips();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const removeTrip = useCallback((tripId) => setTrips((prev) => prev.filter((trip) => trip._id !== tripId)), []);

  return { trips, userId, loading, error, reload, removeTrip };
}
