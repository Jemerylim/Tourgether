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

// Photo when there is one (and it loads), otherwise the person's initials.
const Avatar = ({ src, name, size = "md", className }) => {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-mustard font-extrabold text-ink",
        sizes[size],
        className
      )}
    >
      {src && !failed ? (
        <img src={src} alt={name ? `${name}'s photo` : ""} onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden={Boolean(name)}>{initialsOf(name)}</span>
      )}
    </span>
  );
};

export default Avatar;
