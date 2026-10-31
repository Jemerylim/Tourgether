import React, { useState } from "react";
import axios from "axios";
import { Mail } from "lucide-react";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import { formatDate } from "../../lib/trips";
import { useToast } from "../../components/Toast/Toast";

const datesOf = (invitation) =>
  invitation.startDate ? `${formatDate(invitation.startDate)} – ${formatDate(invitation.endDate)}` : "Dates to be decided";

// Trips the user has been invited to and hasn't answered yet, with Accept and Decline.
// `onAccepted` reloads the trips so the new one appears; `onDeclined` drops the invite.
const Invitations = ({ invitations, onAccepted, onDeclined }) => {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(null); // ID of the trip being answered

  const answer = async (invitation, accept) => {
    setBusy(invitation._id);
    const headers = { Authorization: `Bearer ${localStorage.getItem("authToken")}` };
    try {
      if (accept) {
        await axios.post(`${API_URL}/api/trips/${invitation._id}/accept-invitation`, {}, { headers });
        showToast(`You're on "${invitation.name}"`, "success");
        onAccepted(invitation._id);
      } else {
        await axios.delete(`${API_URL}/api/trips/${invitation._id}/decline-invitation`, { headers });
        showToast(`Declined "${invitation.name}"`, "success");
        onDeclined(invitation._id);
      }
    } catch (error) {
      showToast(apiErrorMessage(error, accept ? "Couldn't accept the invitation" : "Couldn't decline the invitation"), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-label="Trip invitations" className="mb-10 space-y-3">
      {invitations.map((invitation) => (
        <div
          key={invitation._id}
          className="flex flex-col gap-4 rounded-3xl bg-white p-5 drop-shadow-ticket sm:flex-row sm:items-center"
        >
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mustard text-ink">
            <Mail size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">
              {invitation.organiser || "Someone"} invited you to <span className="font-extrabold">{invitation.name}</span>
            </p>
            <p className="text-sm text-ink-soft">
              {datesOf(invitation)} · {invitation.memberCount} going
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={busy === invitation._id} onClick={() => answer(invitation, true)}>
              Accept
            </button>
            <button className="btn-ghost" disabled={busy === invitation._id} onClick={() => answer(invitation, false)}>
              Decline
            </button>
          </div>
        </div>
      ))}
    </section>
  );
};

export default Invitations;
