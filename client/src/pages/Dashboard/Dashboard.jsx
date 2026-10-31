import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { CalendarDays, Clock, Plane, Plus } from "lucide-react";
import Card from "../../components/Cards/Card";
import AvatarStack from "../../components/Avatar/AvatarStack";
import Progress from "../../components/Progress/Progress";
import PageLayout from "../../components/PageLayout/PageLayout";
import { EmptyState, ErrorState, LoadingState } from "../../components/PageState/PageState";
import registerImage from "../../assets/Register.png";
import useUserTrips from "../../lib/useUserTrips";
import { countdownLabel, dayOfTrip, formatDate, isHappeningNow, splitTrips, tripLength } from "../../lib/trips";
import { fromHere } from "../../lib/navigation";
import { formatMoney } from "../Trips/expenseMath";
import Invitations from "./Invitations";
import useTripSpotlight, {
  checklistProgress,
  isOver,
  latestExpenses,
  nextEvent,
  payerOf,
  todaysEvents,
  whenLabel,
} from "./useTripSpotlight";

// Organiser first, then everyone else on the trip (deleted accounts come back as null)
const peopleOn = (trip) => [
  trip.createdBy,
  ...trip.members.filter((member) => member && member._id !== trip.createdBy?._id),
].filter(Boolean);

// Who's going, how long for, how packed the user is and what's next. Sits inside the
// trip's ticket, so nothing here is clickable.
const TripDetails = ({ trip, userId, events, checklist, showNext }) => {
  const people = peopleOn(trip);
  const days = tripLength(trip);
  const progress = checklist && checklistProgress(checklist, userId);
  const next = showNext && events && nextEvent(events);

  return (
    <div className="mt-5 space-y-4 border-t border-dashed border-ink/15 pt-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-bold text-ink-soft">
        <span className="flex items-center gap-2">
          <AvatarStack people={people} max={5} />
          {people.length === 1 ? "Just you" : `${people.length} going`}
        </span>
        {days && (
          <span className="flex items-center gap-1.5">
            <CalendarDays size={16} aria-hidden="true" />
            {days === 1 ? "1 day" : `${days} days`}
          </span>
        )}
      </div>

      {progress && (
        <div className="max-w-sm">
          <p className="mb-1.5 flex justify-between text-xs font-extrabold text-ink-soft">
            <span>{progress.word === "packed" ? "Packing list" : "To-do list"}</span>
            <span>
              {progress.done} of {progress.total} {progress.word}
            </span>
          </p>
          <Progress value={progress.done} max={progress.total} label={`${progress.done} of ${progress.total} ${progress.word}`} />
        </div>
      )}

      {next && (
        <p className="flex items-center gap-2 text-sm text-ink">
          <Clock size={16} className="shrink-0 text-lagoon" aria-hidden="true" />
          <span>
            <span className="font-extrabold">
              {whenLabel(next)}, {next.startTime}
            </span>{" "}
            · {next.title}
          </span>
        </p>
      )}
    </div>
  );
};

const Panel = ({ title, link, children }) => (
  <section className="flex flex-col rounded-3xl bg-white p-6 drop-shadow-ticket">
    <h2 className="font-display text-2xl text-ink">{title}</h2>
    <div className="mt-4 flex-1">{children}</div>
    {link}
  </section>
);

// While a trip is under way: today's plan and the latest spending, in place of a countdown
const TodayPanels = ({ trip, userId, events, expenses }) => {
  const location = useLocation();
  const sectionLink = (section, text) => (
    <Link
      to={`/trip/${trip._id}?section=${section}`}
      state={fromHere(location, "Dashboard")}
      className="mt-5 text-sm font-extrabold text-lagoon hover:underline"
    >
      {text}
    </Link>
  );
  const today = events ? todaysEvents(events) : [];
  const spending = expenses ? latestExpenses(expenses) : [];

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <Panel title={`Today, ${dayjs().format("D MMM")}`} link={sectionLink("calendar", "Open the calendar")}>
        {today.length === 0 ? (
          <p className="text-ink-soft">{events ? "Nothing on the calendar today." : "Loading today's plan..."}</p>
        ) : (
          <ul className="space-y-3">
            {today.map((event) => (
              <li key={event._id} className={`flex gap-4 ${isOver(event) ? "opacity-50" : ""}`}>
                <span className="w-24 shrink-0 text-sm font-extrabold text-ink-soft">
                  {event.startTime}–{event.endTime}
                </span>
                <span className={`font-bold text-ink ${isOver(event) ? "line-through" : ""}`}>{event.title}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Latest spending" link={sectionLink("expenses", "Add an expense")}>
        {spending.length === 0 ? (
          <p className="text-ink-soft">{expenses ? "No expenses yet." : "Loading expenses..."}</p>
        ) : (
          <ul className="space-y-3">
            {spending.map((expense) => (
              <li key={expense._id} className="flex items-baseline justify-between gap-4">
                <span className="min-w-0">
                  <span className="block truncate font-bold text-ink">{expense.description}</span>
                  <span className="block text-sm text-ink-soft">
                    {payerOf(expense, userId)} paid · {dayjs(expense.date).format("D MMM")}
                  </span>
                </span>
                <span className="shrink-0 font-extrabold text-ink">{formatMoney(expense.amount, expense.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

// What's coming up: pending invitations, the next trip (or the one under way) up front,
// then the rest of the upcoming ones. Past trips live on My Trips.
const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trips, invitations, userId, loading, error, reload, removeInvitation } = useUserTrips();
  const { upcoming, past } = splitTrips(trips);
  const [next, ...others] = upcoming;
  const live = Boolean(next) && isHappeningNow(next);
  const { events, checklist, expenses } = useTripSpotlight(next?._id, { withExpenses: live });

  const tripCard = (trip, details) => (
    <Card
      key={trip._id}
      title={trip.name}
      start={formatDate(trip.startDate)}
      end={formatDate(trip.endDate)}
      imageUrl={trip.imageUrl}
      badge={isHappeningNow(trip) ? "Happening now" : countdownLabel(trip)}
      onClick={() => navigate(`/trip/${trip._id}`, { state: fromHere(location, "Dashboard") })}
    >
      {details}
    </Card>
  );

  const createTrip = (label) => (
    <button className="btn-primary" onClick={() => navigate("/create-trip", { state: fromHere(location, "Dashboard") })}>
      {label}
    </button>
  );

  const addTrip = (
    <button className="btn-primary" onClick={() => navigate("/create-trip", { state: fromHere(location, "Dashboard") })}>
      <Plus size={18} aria-hidden="true" />
      Add trip
    </button>
  );

  const days = next && tripLength(next);

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
        action={createTrip("Create your first trip")}
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
        action={createTrip("Plan a trip")}
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
        <p className="mb-3 text-sm font-extrabold text-ink-soft">
          {live ? `Happening now · Day ${dayOfTrip(next)}${days ? ` of ${days}` : ""}` : "Next trip"}
        </p>
        {tripCard(
          next,
          <TripDetails trip={next} userId={userId} events={events} checklist={checklist} showNext={!live} />
        )}
        {live && <TodayPanels trip={next} userId={userId} events={events} expenses={expenses} />}

        {others.length > 0 && (
          <>
            <h2 className="mb-6 mt-14 font-display text-2xl text-ink">Also coming up</h2>
            <div className="grid gap-8 xl:grid-cols-2">{others.map((trip) => tripCard(trip))}</div>
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
      {!loading && !error && invitations.length > 0 && (
        <Invitations invitations={invitations} onAccepted={reload} onDeclined={removeInvitation} />
      )}
      {content}
    </PageLayout>
  );
};

export default Dashboard;
