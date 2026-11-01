import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "../../api/client";
import { CalendarDays, Users } from "lucide-react";
import Navbar from "../../components/Navbar/Navbar";
import Scene from "../../components/Scene/Scene";
import Ticket from "../../components/Ticket/Ticket";
import { LoadingState } from "../../components/PageState/PageState";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import { formatDate } from "../../lib/trips";
import { getToken, clearToken } from "../../api/session";

// Landing page for a shareable invite link (/join/:token). Shows what the trip is, then
// joins it, sending visitors who aren't signed in to log in or register first.
const JoinTrip = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const signedIn = Boolean(getToken());
  const redirect = `?redirect=${encodeURIComponent(`/join/${token}`)}`;

  useEffect(() => {
    axios
      .get(`${API_URL}/api/trips/join/${token}`)
      .then(({ data }) => setPreview(data.data))
      .catch((err) => setError(apiErrorMessage(err, "Couldn't open this invite link")))
      .finally(() => setLoading(false));
  }, [token]);

  const join = async () => {
    setJoining(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/trips/join/${token}`, {});
      navigate(`/trip/${data.data.tripId}`, { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        clearToken();
        navigate(`/login${redirect}`, { replace: true });
        return;
      }
      setError(apiErrorMessage(err, "Couldn't join the trip"));
      setJoining(false);
    }
  };

  let main;
  let stub;
  if (error) {
    main = (
      <>
        <h1 className="font-display text-4xl text-ink">This link didn't work</h1>
        <p role="alert" className="mt-3 font-bold text-red-700">{error}</p>
      </>
    );
    stub = (
      <Link to={signedIn ? "/my-trips" : "/"} className="btn-dark">
        {signedIn ? "See my trips" : "Go to Tourgether"}
      </Link>
    );
  } else if (preview) {
    main = (
      <>
        <p className="text-sm font-extrabold uppercase tracking-wide text-lagoon">You're invited</p>
        <h1 className="mt-1 font-display text-4xl text-ink">{preview.name}</h1>
        <p className="mt-2 text-ink-soft">
          {preview.organiser ? `${preview.organiser} invited you to plan this trip together on Tourgether.` : "You've been invited to plan this trip together on Tourgether."}
        </p>
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-ink-soft" aria-hidden="true" />
            <dt className="sr-only">Dates</dt>
            <dd className="font-bold text-ink">
              {preview.startDate ? `${formatDate(preview.startDate)} to ${formatDate(preview.endDate)}` : "Dates to be decided"}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-ink-soft" aria-hidden="true" />
            <dt className="sr-only">Travellers</dt>
            <dd className="font-bold text-ink">
              {preview.memberCount} {preview.memberCount === 1 ? "traveller" : "travellers"} so far
            </dd>
          </div>
        </dl>
      </>
    );
    stub = signedIn ? (
      <button type="button" className="btn-dark" onClick={join} disabled={joining}>
        {joining ? "Joining..." : "Join trip"}
      </button>
    ) : (
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/login${redirect}`} className="btn-dark">Log in to join</Link>
        <Link to={`/register${redirect}`} className="btn-ghost">Create an account</Link>
      </div>
    );
  }

  return (
    <div className="text-left">
      <Navbar overlay />
      <Scene className="-mt-[76px] min-h-screen pt-[76px]" sunClassName="right-[14%] top-[24%] h-72 w-72">
        <main className="relative z-10 flex min-h-[calc(100vh-76px)] items-center justify-center px-4 py-10">
          {loading ? (
            <LoadingState message="Opening your invite..." />
          ) : (
            <Ticket
              stacked
              className="w-full max-w-md"
              main={<div className="p-2 sm:p-4">{main}</div>}
              stubClassName="bg-mustard px-6 py-5"
              stub={stub}
            />
          )}
        </main>
      </Scene>
    </div>
  );
};

export default JoinTrip;
