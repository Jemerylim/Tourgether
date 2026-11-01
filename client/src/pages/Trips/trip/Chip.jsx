import React from "react";

// Small pill of trip facts in the header
const Chip = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-sm font-extrabold text-ink shadow-float">
    <Icon size={14} aria-hidden="true" />
    {children}
  </span>
);

export default Chip;
