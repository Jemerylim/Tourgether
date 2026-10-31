// Adapted from https://21st.dev/@shugar/components/progress
import React from "react";
import { cn } from "../../lib/utils";

// A native <progress> bar in the lagoon colours, so screen readers announce the value.
const Progress = ({ value, max = 100, label, className }) => (
  <progress
    value={value}
    max={max}
    aria-label={label}
    className={cn(
      "h-2.5 w-full appearance-none overflow-hidden rounded-full border-none bg-lagoon-light",
      "[&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-lagoon-light",
      "[&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-lagoon [&::-webkit-progress-value]:transition-all",
      "[&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-lagoon",
      className
    )}
  />
);

export default Progress;
