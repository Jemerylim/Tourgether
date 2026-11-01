import React from "react";
import { X } from "lucide-react";
import Avatar from "../../../components/Avatar/Avatar";
import Modal from "../../../components/Modal/Modal";
import InviteLink from "../InviteLink";
import { assetUrl } from "../../../config";

// Who's on the trip. The organiser can invite people, change roles and remove members.
const MembersModal = ({ open, onClose, trip, members, isOrganiser, onInvite, onRemove, onChangeRole }) => {
  const roleOf = (member) =>
    member._id === trip.createdBy._id
      ? "owner"
      : trip.memberRoles?.find((entry) => entry.user === member._id)?.role || "editor";

  return (
    <Modal open={open} onClose={onClose} title="Members" className="max-w-lg">
          <p className="text-sm text-ink-soft">
            Organised by <span className="font-bold text-ink">{trip.createdBy.name}</span>
          </p>
  
          <ul className="mt-4 space-y-3">
            {members.map((member) => (
              <li key={member._id} className="flex items-center gap-3">
                <Avatar src={assetUrl(member.profilePicture)} name={member.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{member.name}</p>
                  <p className="truncate text-sm text-ink-soft">{member.email}</p>
                </div>
                {member._id === trip.createdBy._id ? (
                  <span className="rounded-full bg-mustard px-2.5 py-1 text-xs font-extrabold text-ink">Organiser</span>
                ) : isOrganiser ? (
                  <>
                    <select
                      aria-label={`Role for ${member.name}`}
                      value={roleOf(member)}
                      onChange={(e) => onChangeRole(member, e.target.value)}
                      className="rounded-full border-0 bg-lagoon-light px-3 py-1.5 text-sm font-extrabold text-ink"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      type="button"
                      aria-label={`Remove ${member.name}`}
                      onClick={() => onRemove(member._id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-lagoon-light"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <span className="rounded-full bg-lagoon-light px-2.5 py-1 text-xs font-extrabold capitalize text-ink">
                    {roleOf(member)}
                  </span>
                )}
              </li>
            ))}
          </ul>
  
          {isOrganiser && (
            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                onInvite(e.target.email.value);
                e.target.reset();
              }}
            >
              <label htmlFor="invite-email" className="field-label">
                Invite by email
              </label>
              <div className="flex gap-2">
                <input
                  id="invite-email"
                  type="email"
                  name="email"
                  placeholder="friend@example.com"
                  autoComplete="off"
                  required
                  className="field"
                />
                <button type="submit" className="btn-dark shrink-0">
                  Send invite
                </button>
              </div>
            </form>
          )}
  
          {isOrganiser && <InviteLink tripId={trip._id} tripName={trip.name} />}
  
          <div className="mt-6 flex justify-end">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Done
            </button>
          </div>
        </Modal>
  );
};

export default MembersModal;
