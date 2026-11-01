import React, { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { Plane } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Ticket from "../../components/Ticket/Ticket";
import PageLayout from "../../components/PageLayout/PageLayout";
import DateRangePicker from "../../components/DateRangePicker/DateRangePicker";
import EmailChipsInput from "../../components/EmailChipsInput/EmailChipsInput";
import { useToast } from "../../components/Toast/Toast";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import { coverPhoto } from "../../lib/trips";
import { fireConfetti } from "../../lib/confetti";

const formatShort = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const CreateTrip = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [groupName, setGroupName] = useState(location.state?.tripName || ""); // prefilled from the quiz
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupEmails, setGroupEmails] = useState([]);
  const [inviteNames, setInviteNames] = useState({}); // email -> name, for the chips
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Leave the dates open: the group marks the days they're free and the organiser locks
  // the best ones from the trip's "Find dates" section.
  const [pickLater, setPickLater] = useState(false);
  // Destination photo for the trip name being typed, the same one its ticket will show
  const [preview, setPreview] = useState();

  useEffect(() => {
    const name = groupName.trim();
    setPreview(undefined);
    if (name.length < 3) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      coverPhoto(name, `cover:draft:${name.toLowerCase()}`).then((url) => {
        if (!cancelled) setPreview(url);
      });
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [groupName]);

  // Look up an invited person by email or by name. Returns a message to reject them (not
  // registered, ambiguous name, yourself) or `{ email }` with their real email address.
  const validateInvite = async (query) => {
    const authToken = localStorage.getItem("authToken");
    try {
      const response = await axios.get(`${API_URL}/api/users/lookup`, {
        params: { q: query },
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const { name, email } = response.data.user;
      if (email.toLowerCase() === (localStorage.getItem("userEmail") || "").toLowerCase()) {
        return "You're already on the trip, so you can't invite yourself.";
      }
      setInviteNames((prev) => ({ ...prev, [email]: name }));
      return { email };
    } catch (err) {
      if (err.response?.status === 404 && query.includes("@")) {
        return `${query} doesn't have a Tourgether account yet.`;
      }
      return apiErrorMessage(err, "Couldn't look that person up");
    }
  };

  const handleSubmit = async () => {
    const today = new Date().setHours(0, 0, 0, 0); // Today at midnight
    if (!groupName.trim()) {
      setError("Give your trip a name.");
      return;
    }
    if (!pickLater) {
      if (!startDate) {
        setError("Pick the day you leave.");
        return;
      }
      if (new Date(startDate) < today) {
        setError("Start date cannot be before today.");
        return;
      }
      if (!endDate) {
        setError("Pick the day you return.");
        return;
      }
      if (new Date(endDate) < today) {
        setError("End date cannot be before today.");
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setError("End date cannot be earlier than start date.");
        return;
      }
    }

    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      setError("You're signed out. Log in again to create a trip.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      // Map emails to user IDs (nothing to look up for a solo trip)
      let userIds = [];
      if (groupEmails.length > 0) {
        const response = await axios.post(
          `${API_URL}/api/users/get-ids-by-emails`,
          { emails: groupEmails },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        userIds = response.data.userIds; // Expecting { userIds: [...] }
      }

      const tripDetails = {
        name: groupName,
        members: userIds,
        description: "",
        startDate: pickLater ? undefined : startDate,
        endDate: pickLater ? undefined : endDate,
      };

      const tripResponse = await axios.post(`${API_URL}/api/trips/create-trip`, tripDetails, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (tripResponse.data.emailsFailed > 0) {
        showToast("Trip created, but the invitation emails couldn't be sent. Let your group know it's ready.", "info");
      }
      fireConfetti();
      // Replace the form in history, and hand on where it was opened from, so the new
      // trip's back link (and the browser's Back) skip the finished form.
      navigate(`/trip/${tripResponse.data.data._id}`, {
        replace: true,
        state: location.state?.from ? { from: location.state.from } : undefined,
      });
    } catch (err) {
      console.error("Error creating trip:", err.response?.data?.message || err.message);
      setError(apiErrorMessage(err, "Couldn't create the trip"));
      setSubmitting(false);
    }
  };

  const summary = [
    { label: "Trip", value: groupName.trim() || "Not named yet" },
    {
      label: "Dates",
      value: pickLater
        ? "To be decided"
        : startDate && endDate
          ? `${formatShort(startDate)} to ${formatShort(endDate)} · ${dayjs(endDate).diff(startDate, "day") + 1} days`
          : "Not picked yet",
    },
    {
      label: "Travellers",
      value:
        groupEmails.length === 0
          ? "Just you"
          : `You and ${groupEmails.length} ${groupEmails.length === 1 ? "friend" : "friends"}`,
    },
  ];

  return (
    <PageLayout
      back={location.state?.from || { to: "/my-trips", label: "My trips" }}
      title="Create a new trip"
      subtitle="Name it, pick the dates (or decide them later) and invite the people coming along."
    >

        <Ticket
          mainClassName="p-6 sm:p-8"
          main={
            <form
              id="create-trip-form"
              className="space-y-8"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
              noValidate
            >
              <div>
                <label htmlFor="groupName" className="field-label">
                  Trip name
                </label>
                <input
                  id="groupName"
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="field"
                  placeholder="Summer in Lisbon"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="field-label !mb-0">Dates</p>
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={pickLater}
                      onChange={(e) => {
                        setPickLater(e.target.checked);
                        setError("");
                      }}
                      className="h-4 w-4 accent-lagoon"
                    />
                    Pick dates later
                  </label>
                </div>
                {pickLater ? (
                  <p className="mt-2 rounded-2xl bg-lagoon-light px-4 py-5 text-ink-soft">
                    No dates yet. Once everyone marks the days they're free, the trip's Find dates section shows the
                    best stretch and you can lock it in.
                  </p>
                ) : (
                  <DateRangePicker
                    start={startDate}
                    end={endDate}
                    onChange={(start, end) => {
                      setStartDate(start);
                      setEndDate(end);
                      setError("");
                    }}
                  />
                )}
              </div>

              <EmailChipsInput
                emails={groupEmails}
                onChange={(next) => {
                  setGroupEmails(next);
                  setError("");
                }}
                validate={validateInvite}
                labels={inviteNames}
                label="Invite travellers (optional)"
              />
            </form>
          }
          stubClassName="flex flex-col justify-between gap-6 bg-mustard p-6 sm:w-72 sm:p-8"
          stub={
            <>
              <div className="relative -mx-1 -mt-1 flex h-32 items-center justify-center overflow-hidden rounded-2xl bg-white/40 text-ink">
                {preview ? (
                  <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <Plane size={32} aria-hidden="true" />
                )}
              </div>
              <dl className="space-y-4">
                {summary.map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs font-extrabold text-ink/70">{label}</dt>
                    <dd className="break-words font-display text-xl leading-tight text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <div>
                {error && (
                  <p role="alert" className="mb-3 text-sm font-bold text-plum">
                    {error}
                  </p>
                )}
                <button type="submit" form="create-trip-form" className="btn-dark w-full" disabled={submitting}>
                  {submitting ? "Creating..." : "Create trip"}
                </button>
              </div>
            </>
          }
        />
    </PageLayout>
  );
};

export default CreateTrip;
