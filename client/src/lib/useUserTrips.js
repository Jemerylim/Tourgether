import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/client";
import { API_URL } from "../config";
import { apiErrorMessage } from "./apiError";
import { withCoverImages } from "./trips";
import { getToken, clearToken } from "../api/session";

// Loads the signed-in user, their trips (with cover photos) and the invitations waiting on
// their answer, for Dashboard and My Trips. A missing or expired session sends the visitor
// to /login.
export default function useUserTrips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchTrips = async () => {
      setLoading(true);
      setError("");

      const authToken = getToken();
      if (!authToken) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/trips/mine`);
        const { user: me, trips: mine = [], invitations: waiting = [] } = response.data.data || {};
        const withImages = await withCoverImages(mine);
        if (!cancelled) {
          setUser(me || null);
          setTrips(withImages);
          setInvitations(waiting);
        }
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 401) {
          clearToken();
          navigate("/login", { replace: true });
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

  const removeInvitation = useCallback(
    (tripId) => setInvitations((prev) => prev.filter((invitation) => invitation._id !== tripId)),
    []
  );

  return { trips, invitations, user, userId: user?._id ?? null, loading, error, reload, removeTrip, removeInvitation };
}
