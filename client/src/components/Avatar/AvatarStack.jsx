import React from "react";
import Avatar from "./Avatar";
import { assetUrl } from "../../config";

// Overlapping photos of the first `max` people, then "+N" for everyone else.
const AvatarStack = ({ people, max = 6, label = "Trip members" }) => (
  <div className="flex items-center gap-2">
    <ul className="flex -space-x-1.5" aria-label={label}>
      {people.slice(0, max).map((person) => (
        <li key={person._id} title={person.name}>
          <Avatar src={assetUrl(person.profilePicture)} name={person.name} size="sm" className="ring-2 ring-white" />
        </li>
      ))}
    </ul>
    {people.length > max && <span className="text-sm font-bold text-ink-soft">+{people.length - max}</span>}
  </div>
);

export default AvatarStack;
