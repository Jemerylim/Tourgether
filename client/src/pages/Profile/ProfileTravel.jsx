import React from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { Plane, Stamp as StampIcon } from "lucide-react";
import Avatar from "../../components/Avatar/Avatar";
import Reveal from "../../components/Reveal/Reveal";
import { assetUrl } from "../../config";
import { countdownLabel, splitTrips, tripLength } from "../../lib/trips";
import { cn } from "../../lib/utils";

// Ink colours and tilts for the stamps, cycled so a page of them looks hand-pressed
const INKS = ["border-plum text-plum", "border-lagoon text-lagoon", "border-orange text-orange"];
const TILTS = [-4, 3, -2, 5, -5, 2];

const Stat = ({ value, label }) => (
  <div className="rounded-2xl bg-white p-4 drop-shadow-ticket sm:p-5">
    <p className="font-display text-3xl leading-none text-ink sm:text-4xl">{value}</p>
    <p className="mt-2 text-sm font-bold text-ink-soft">{label}</p>
  </div>
);

// A finished trip as a passport stamp; one still to come is an unstamped dashed outline
const Stamp = ({ trip, index, upcoming }) => {
  const days = tripLength(trip);
  const when = trip.startDate ? dayjs(trip.endDate || trip.startDate).format("MMM YYYY").toUpperCase() : "DATES TBD";

  return (
    <Reveal as="li" delay={index * 70}>
      <div
        style={{ transform: `rotate(${TILTS[index % TILTS.length]}deg)` }}
        className={cn(
          "relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-[2rem] border-4 p-4 text-center",
          upcoming ? "border-dashed border-ink/25 bg-white/50 text-ink-soft" : `border-double bg-white ${INKS[index % INKS.length]}`
        )}
      >
        {!upcoming && trip.imageUrl && (
          <img
            src={trip.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-15 mix-blend-multiply grayscale"
          />
        )}
        <span className="relative text-[10px] font-extrabold uppercase tracking-[0.25em]">{upcoming ? "Coming up" : when}</span>
        <span className="relative mt-1 line-clamp-3 font-display text-xl leading-tight">{trip.name}</span>
        <span className="relative mt-2 text-xs font-extrabold">
          {upcoming ? countdownLabel(trip) : days ? `${days} ${days === 1 ? "day" : "days"}` : "Completed"}
        </span>
      </div>
    </Reveal>
  );
};

// Everyone who has shared a trip with `userId`, most trips together first
const travelBuddies = (trips, userId) => {
  const buddies = new Map();
  trips.forEach((trip) => {
    const people = [trip.createdBy, ...trip.members].filter((person) => person && person._id !== userId);
    new Set(people.map((person) => person._id)).forEach((id) => {
      const entry = buddies.get(id) || { person: people.find((person) => person._id === id), count: 0 };
      buddies.set(id, { ...entry, count: entry.count + 1 });
    });
  });
  return [...buddies.values()].sort((a, b) => b.count - a.count || a.person.name.localeCompare(b.person.name));
};

// What the profile says about how someone travels: a few numbers, a passport of stamps for
// their finished trips and the people they travel with. All of it comes from their trips.
const ProfileTravel = ({ trips, userId }) => {
  const { upcoming, past } = splitTrips(trips);
  const daysAway = past.reduce((sum, trip) => sum + (tripLength(trip) || 0), 0);
  const buddies = travelBuddies(trips, userId);
  const stamps = [...past.map((trip) => ({ trip, upcoming: false })), ...upcoming.map((trip) => ({ trip, upcoming: true }))];

  return (
    <div className="mt-10">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
        <Stat value={past.length} label={past.length === 1 ? "trip taken" : "trips taken"} />
        <Stat value={daysAway} label={daysAway === 1 ? "day away" : "days away"} />
        <Stat value={buddies.length} label={buddies.length === 1 ? "travel buddy" : "travel buddies"} />
        <Stat value={upcoming.length} label="coming up" />
      </div>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-labelledby="passport-heading">
          <h2 id="passport-heading" className="mb-5 font-display text-2xl text-ink">
            Passport
          </h2>
          {stamps.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-ink/20 bg-white/50 p-8">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mustard text-ink">
                <StampIcon size={24} aria-hidden="true" />
              </span>
              <p className="mt-4 font-display text-2xl text-ink">Your first stamp is waiting</p>
              <p className="mt-1 max-w-sm text-ink-soft">Every finished trip earns a stamp here.</p>
              <Link to="/create-trip" className="btn-primary mt-5">
                <Plane size={18} aria-hidden="true" />
                Plan a trip
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              {stamps.map(({ trip, upcoming: isUpcoming }, index) => (
                <Stamp key={trip._id} trip={trip} index={index} upcoming={isUpcoming} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="buddies-heading" className="rounded-3xl bg-white p-6 drop-shadow-ticket">
          <h2 id="buddies-heading" className="font-display text-2xl text-ink">
            Travel buddies
          </h2>
          {buddies.length === 0 ? (
            <p className="mt-3 text-ink-soft">Invite people to a trip and they'll show up here.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {buddies.slice(0, 6).map(({ person, count }) => (
                <li key={person._id} className="flex items-center gap-3">
                  <Avatar src={assetUrl(person.profilePicture)} name={person.name} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-ink">{person.name}</span>
                    <span className="block text-sm text-ink-soft">
                      {count} {count === 1 ? "trip" : "trips"} together
                    </span>
                  </span>
                </li>
              ))}
              {buddies.length > 6 && <li className="text-sm font-bold text-ink-soft">and {buddies.length - 6} more</li>}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProfileTravel;
