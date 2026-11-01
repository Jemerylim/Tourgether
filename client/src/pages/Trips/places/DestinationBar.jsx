import React, { useState } from "react";
import { Compass } from "lucide-react";
import PlaceSearch from "../../../components/PlaceSearch/PlaceSearch";

// Where the trip is. Sets the map's starting view and where recommendations come from.
const DestinationBar = ({ destination, onChange }) => {
  const [editing, setEditing] = useState(false);
  const picking = editing || !destination;

  return (
    <div className="rounded-3xl bg-white p-5 drop-shadow-ticket">
      <div className="flex items-center gap-3">
        <Compass size={22} className="shrink-0 text-lagoon" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-ink">
          {destination ? (
            <>
              Exploring around <span className="font-extrabold">{destination.name}</span>
            </>
          ) : (
            <span className="font-extrabold">Where's this trip?</span>
          )}
        </p>
        {destination && (
          <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => setEditing((value) => !value)}>
            {editing ? "Cancel" : "Change"}
          </button>
        )}
      </div>
      {picking && (
        <>
          {!destination && (
            <p className="mt-1 text-sm text-ink-soft">Pick a city or region to centre the map and get recommended places.</p>
          )}
          <PlaceSearch
            className="mt-3"
            citiesOnly
            autoFocus={editing}
            label="Trip destination"
            placeholder="Search a city, island or country"
            onPick={async (place) => {
              if (await onChange({ name: place.name, lat: place.lat, lng: place.lng })) setEditing(false);
            }}
          />
        </>
      )}
    </div>
  );
};

export default DestinationBar;
