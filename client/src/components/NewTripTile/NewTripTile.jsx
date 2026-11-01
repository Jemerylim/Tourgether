import React from "react";
import { Link } from "react-router-dom";
import { Compass, Plus } from "lucide-react";

// A dashed "boarding pass" that closes a grid of trips: start another one, or let the
// quiz pick the place. `state` is the router state for the create-trip link.
const NewTripTile = ({ state, className = "" }) => (
  <div
    className={`flex min-h-[10rem] flex-col items-start justify-center gap-4 rounded-3xl border-2 border-dashed border-ink/20 bg-white/50 p-6 ${className}`}
  >
    <div>
      <p className="font-display text-2xl text-ink">Where next?</p>
      <p className="mt-1 max-w-xs text-ink-soft">Start a new trip, or answer five questions and we'll suggest a place.</p>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <Link to="/create-trip" state={state} className="btn-primary">
        <Plus size={18} aria-hidden="true" />
        Plan a trip
      </Link>
      <Link to="/quiz" className="btn-ghost">
        <Compass size={18} aria-hidden="true" />
        Help me pick
      </Link>
    </div>
  </div>
);

export default NewTripTile;
