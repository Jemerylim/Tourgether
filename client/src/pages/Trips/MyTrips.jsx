import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Plane, Plus } from "lucide-react";
import Card from "../../components/Cards/Card";
import ConfirmDialog from "../../components/Modal/ConfirmDialog";
import NewTripTile from "../../components/NewTripTile/NewTripTile";
import PageLayout from "../../components/PageLayout/PageLayout";
import { EmptyState, ErrorState, LoadingState } from "../../components/PageState/PageState";
import { useToast } from "../../components/Toast/Toast";
import registerImage from "../../assets/Register.png";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import useUserTrips from "../../lib/useUserTrips";
import { countdownLabel, formatDate, splitTrips } from "../../lib/trips";
import { fromHere } from "../../lib/navigation";

// Every trip, split into upcoming and past.
const MyTrips = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { trips, userId, loading, error, reload, removeTrip } = useUserTrips();
  const { upcoming, past } = splitTrips(trips);
  const [tripToDelete, setTripToDelete] = useState(null);

  const handleDeleteTrip = async () => {
    const trip = tripToDelete;
    setTripToDelete(null);
    try {
      await axios.delete(`${API_URL}/api/trips/${trip._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      removeTrip(trip._id);
      showToast(`"${trip.name}" deleted`, "success");
    } catch (err) {
      showToast(apiErrorMessage(err, "Couldn't delete that trip"), "error");
    }
  };

  const tripCard = (trip, { isPast = false } = {}) => (
    <Card
      key={trip._id}
      title={trip.name}
      start={formatDate(trip.startDate)}
      end={formatDate(trip.endDate)}
      imageUrl={trip.imageUrl}
      badge={isPast ? "Completed" : countdownLabel(trip)}
      muted={isPast}
      onClick={() => navigate(`/trip/${trip._id}`, { state: fromHere(location, "My trips") })}
      onDelete={trip.createdBy?._id === userId ? () => setTripToDelete(trip) : undefined}
    />
  );

  const createTrip = () => navigate("/create-trip", { state: fromHere(location, "My trips") });

  let content;
  if (loading) {
    content = <LoadingState message="Loading your trips..." />;
  } else if (error) {
    content = <ErrorState message={error} onRetry={reload} />;
  } else if (trips.length === 0) {
    content = (
      <EmptyState
        icon={Plane}
        title="No trips yet"
        image={registerImage}
        text="Create a trip, then invite the people you want to travel with."
        action={
          <button className="btn-primary" onClick={createTrip}>
            Create your first trip
          </button>
        }
      />
    );
  } else {
    content = (
      <>
        <section aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="mb-6 font-display text-2xl text-ink">
            Upcoming
          </h2>
          {upcoming.length > 0 ? (
            <div className="grid gap-8 xl:grid-cols-2">
              {upcoming.map((trip) => tripCard(trip))}
              <NewTripTile state={fromHere(location, "My trips")} />
            </div>
          ) : (
            <p className="text-ink-soft">
              No upcoming trips.{" "}
              <Link to="/create-trip" state={fromHere(location, "My trips")} className="font-extrabold text-plum underline hover:text-plum">
                Plan a trip
              </Link>
            </p>
          )}
        </section>

        {past.length > 0 && (
          <section aria-labelledby="past-heading" className="mt-14">
            <h2 id="past-heading" className="mb-6 font-display text-2xl text-ink">
              Past trips
            </h2>
            <div className="grid gap-8 xl:grid-cols-2">{past.map((trip) => tripCard(trip, { isPast: true }))}</div>
          </section>
        )}
      </>
    );
  }

  return (
    <PageLayout
      title="My trips"
      subtitle="Every trip you've planned, past and future."
      actions={
            !loading && !error && trips.length > 0 ? (
              <button className="btn-primary" onClick={createTrip}>
                <Plus size={18} aria-hidden="true" />
                Add trip
              </button>
            ) : null
        }
    >
      {content}

      <ConfirmDialog
        open={Boolean(tripToDelete)}
        title="Delete this trip?"
        message={`"${tripToDelete?.name}" will be deleted for everyone on it, along with its events, polls and availability. This can't be undone.`}
        confirmLabel="Delete trip"
        onCancel={() => setTripToDelete(null)}
        onConfirm={handleDeleteTrip}
      />
    </PageLayout>
  );
};

export default MyTrips;
