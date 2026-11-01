import { useEffect, useState } from "react";
import { walkingRoute } from "../../../lib/places";

const stopsKey = (stops) => stops.map((stop) => `${stop.lat.toFixed(5)},${stop.lng.toFixed(5)}`).join(">");

// Walking route through each group's stops in order. `groups`: [{ id, stops: [{ lat, lng }] }].
// Returns { [id]: { line, legs } }. Only refetches when a group's stops change, and a
// route is dropped as soon as its stops change so legs never line up with the wrong
// stops. A group that fails (or is too spread out to walk) just has no route.
const useWalkingRoutes = (groups) => {
  const [routes, setRoutes] = useState({});
  const keys = Object.fromEntries(groups.map((group) => [group.id, stopsKey(group.stops.slice(0, 25))]));
  const key = JSON.stringify(keys);

  useEffect(() => {
    const controller = new AbortController();
    groups.forEach(({ id, stops }) => {
      // The routing server takes up to 25 stops at a time
      const points = stops.slice(0, 25);
      if (points.length < 2) return;
      walkingRoute(points, { signal: controller.signal })
        .then((route) => route && setRoutes((prev) => ({ ...prev, [id]: { ...route, key: stopsKey(points) } })))
        .catch(() => {});
    });
    return () => controller.abort();
    // `key` stands in for `groups`, which is rebuilt every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return Object.fromEntries(
    Object.entries(routes).filter(([id, route]) => keys[id] !== undefined && route.key === keys[id])
  );
};

export default useWalkingRoutes;
