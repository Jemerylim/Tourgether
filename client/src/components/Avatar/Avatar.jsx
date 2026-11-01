// Adapted from https://21st.dev/@SubframeApp/components/avatar-2
import React, { useState } from "react";
import { cn } from "../../lib/utils";

const sizes = {
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-36 w-36 text-5xl",
};

const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

// Brand-coloured backgrounds for the initials, picked from the name so a person always
// gets the same one
const TONES = [
  "bg-mustard text-ink",
  "bg-lagoon text-white",
  "bg-plum text-white",
  "bg-orange text-white",
  "bg-sky text-ink",
  "bg-ink text-white",
];
const toneOf = (name = "") => TONES[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONES.length];

// Accounts without an upload all point at the same grey placeholder file; initials look
// friendlier than a row of identical silhouettes
const isPlaceholder = (src) => /(^|\/)profile-pic\.jpg$/.test(src || "");

// Photo when there is one (and it loads), otherwise the person's initials.
const Avatar = ({ src, name, size = "md", className }) => {
  const [failed, setFailed] = useState(false);
  const showPhoto = src && !failed && !(isPlaceholder(src) && name);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold",
        showPhoto ? "bg-mustard text-ink" : toneOf(name),
        sizes[size],
        className
      )}
    >
      {showPhoto ? (
        <img src={src} alt={name ? `${name}'s photo` : ""} onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden={Boolean(name)}>{initialsOf(name)}</span>
      )}
    </span>
  );
};

export default Avatar;
