import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plane, Plus } from "lucide-react";
import Card from "../../components/Cards/Card";
import PageLayout from "../../components/PageLayout/PageLayout";
import { EmptyState, ErrorState, LoadingState } from "../../components/PageState/PageState";
import registerImage from "../../assets/Register.png";
import useUserTrips from "../../lib/useUserTrips";
import { countdownLabel, formatDate, splitTrips } from "../../lib/trips";

// What's coming up: the next trip up front, then the rest of the upcoming ones.
// Past trips live on My Trips.
const Dashboard = () => {
  const navigate = useNavigate();
  const { trips, loading, error, reload } = useUserTrips();
  const { upcoming, past } = splitTrips(trips);
  const [next, ...others] = upcoming;

  const tripCard = (trip) => (
    <Card
      key={trip._id}
      title={trip.name}
      start={formatDate(trip.startDate)}
      end={formatDate(trip.endDate)}
      imageUrl={trip.imageUrl}
      badge={countdownLabel(trip)}
      onClick={() => navigate(`/trip/${trip._id}`)}
    />
  );

  const addTrip = (
    <button className="btn-primary" onClick={() => navigate("/create-trip")}>
      <Plus size={18} aria-hidden="true" />
      Add trip
    </button>
  );

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
          <button className="btn-primary" onClick={() => navigate("/create-trip")}>
            Create your first trip
          </button>
        }
        secondary={
          <Link to="/quiz" className="btn-ghost">
            Help me pick a place
          </Link>
        }
      />
    );
  } else if (upcoming.length === 0) {
    content = (
      <EmptyState
        icon={Plane}
        title="Nothing booked yet"
        image={registerImage}
        text={`Your last trip was ${past[0].name}. Plan the next one.`}
        action={
          <button className="btn-primary" onClick={() => navigate("/create-trip")}>
            Plan a trip
          </button>
        }
        secondary={
          <Link to="/my-trips" className="btn-ghost">
            See past trips
          </Link>
        }
      />
    );
  } else {
    content = (
      <>
        <p className="mb-3 text-sm font-extrabold text-ink-soft">Next trip</p>
        {tripCard(next)}

        {others.length > 0 && (
          <>
            <h2 className="mb-6 mt-14 font-display text-2xl text-ink">Also coming up</h2>
            <div className="grid gap-8 xl:grid-cols-2">{others.map(tripCard)}</div>
          </>
        )}

        {past.length > 0 && (
          <Link to="/my-trips" className="btn-ghost mt-12">
            See all trips ({past.length} past)
          </Link>
        )}
      </>
    );
  }

  return (
    <PageLayout
      title="Your trips"
      subtitle="What's coming up, and who's coming with you."
      actions={!loading && !error && trips.length > 0 ? addTrip : null}
    >
      {content}
    </PageLayout>
  );
};

export default Dashboard;
