import React, { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const WORLD = { center: [20, 0], zoom: 2 };
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// Teardrop pin with the place's number in its list (styled by .trip-pin in index.css)
const pinIcon = (colour, number, active) =>
  L.divIcon({
    className: "",
    html: `<div class="trip-pin${active ? " is-active" : ""}" style="background:${colour}"><span>${escapeHtml(number)}</span></div>`,
    iconSize: [28, 28],
    // The point of the drop sits at the bottom-left corner before the -45deg turn
    iconAnchor: [14, 34],
    tooltipAnchor: [0, -30],
  });

// Fit the view to every pin when the set of places changes, or centre on the
// destination when nothing is saved yet
const FitToPins = ({ pins, destination }) => {
  const map = useMap();
  const key = pins.map((pin) => pin._id).join(",");
  useEffect(() => {
    if (pins.length > 1) {
      map.fitBounds(L.latLngBounds(pins.map((pin) => [pin.lat, pin.lng])), { padding: [48, 48], maxZoom: 15 });
    } else if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 14);
    } else if (destination) {
      map.setView([destination.lat, destination.lng], 10);
    }
    // Only refit when places are added or removed, not when one is highlighted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, destination?.lat, destination?.lng, map]);
  return null;
};

// Glide to a place picked in the list
const FlyTo = ({ pin }) => {
  const map = useMap();
  useEffect(() => {
    if (!pin) return;
    const zoom = Math.max(map.getZoom(), 15);
    if (reducedMotion()) map.setView([pin.lat, pin.lng], zoom);
    else map.flyTo([pin.lat, pin.lng], zoom, { duration: 0.8 });
  }, [pin, map]);
  return null;
};

// Map of the trip's places. `pins`: [{ _id, lat, lng, name, number, colour }].
// `activeId` is enlarged and drawn on top; `onPinClick(id)` fires when a pin is clicked.
const TripMap = ({ pins, routes = [], destination, activeId, focusPin, onPinClick, onPinHover }) => {
  const icons = useMemo(
    () => new Map(pins.map((pin) => [pin._id, pinIcon(pin.colour, pin.number, pin._id === activeId)])),
    [pins, activeId]
  );

  return (
    // `isolate` keeps Leaflet's own z-indexes (up to 1000) below the navbar and dialogs
    <div className="isolate h-full w-full overflow-hidden rounded-3xl bg-sky drop-shadow-ticket">
      <MapContainer
        center={destination ? [destination.lat, destination.lng] : WORLD.center}
        zoom={destination ? 10 : WORLD.zoom}
        scrollWheelZoom
        worldCopyJump
        className="h-full w-full"
      >
        {/* OpenStreetMap's own tiles: free without a key, but the attribution is required
            and heavy production traffic should move to a paid tile provider */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {routes.map((route) => (
          <Polyline key={route.id} positions={route.line} pathOptions={{ color: route.colour, weight: 4, opacity: 0.7, dashArray: "2 8", lineCap: "round" }} />
        ))}
        {pins.map((pin) => (
          <Marker
            key={pin._id}
            position={[pin.lat, pin.lng]}
            icon={icons.get(pin._id)}
            zIndexOffset={pin._id === activeId ? 1000 : 0}
            title={pin.name}
            eventHandlers={{
              click: () => onPinClick?.(pin._id),
              mouseover: () => onPinHover?.(pin._id),
              mouseout: () => onPinHover?.(null),
            }}
          >
            <Tooltip direction="top">{pin.name}</Tooltip>
          </Marker>
        ))}
        <FitToPins pins={pins} destination={destination} />
        <FlyTo pin={focusPin} />
      </MapContainer>
    </div>
  );
};

export default TripMap;
