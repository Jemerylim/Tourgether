import axios from "../api/client";

// Place search and recommendations from OpenStreetMap, so no API key is needed:
//  - Photon (komoot) for search-as-you-type
//  - Overpass for well-known sights near the trip, with photos from Wikipedia, and
//    Wikipedia's own geosearch when Overpass is down (it often is)
// These are free shared services with fair-use limits, so searches are debounced by the
// caller and recommendations are cached for the browser session.
const PHOTON_URL = "https://photon.komoot.io/api/";
// Overpass queries go over GET: the main server turns some POSTs away with a 406
const OVERPASS_URLS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

const titleCase = (text = "") => {
  const words = text.replace(/_/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "";
};

const joinParts = (parts) => [...new Set(parts.filter(Boolean))].join(", ");

// Photon feature -> { sourceId, name, address, category, lat, lng }
const fromPhoton = ({ geometry, properties: p }) => {
  const street = p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street;
  const name = p.name || street;
  return {
    sourceId: `${(p.osm_type || "").toUpperCase()}${p.osm_id}`,
    name,
    address: joinParts([street, p.district, p.city, p.state, p.country].filter((part) => part !== name)),
    category: titleCase(p.osm_value),
    lat: geometry.coordinates[1],
    lng: geometry.coordinates[0],
  };
};

// Search places by name. `near` ({ lat, lng }) ranks nearby results first.
// `citiesOnly` limits results to towns, regions and countries, for picking a destination.
export const searchPlaces = async (query, { near, citiesOnly = false, signal } = {}) => {
  const params = new URLSearchParams({ q: query, limit: "6", lang: "en" });
  if (near) {
    params.set("lat", near.lat);
    params.set("lon", near.lng);
    // Without these the bias is too weak and a cafe on the other side of the world wins
    params.set("zoom", "12");
    params.set("location_bias_scale", "0.5");
  }
  if (citiesOnly) params.set("osm_tag", "place");
  const { data } = await axios.get(`${PHOTON_URL}?${params}`, { signal });
  return data.features
    .filter((feature) => feature.properties.name || feature.properties.street)
    .map(fromPhoton)
    // Photon can list one place twice, once per address it's mapped to
    .filter((place, index, all) => all.findIndex((other) => other.sourceId === place.sourceId) === index);
};

const readCache = (key) => {
  try {
    return JSON.parse(sessionStorage.getItem(key));
  } catch {
    return null;
  }
};

const writeCache = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private windows); recommendations just aren't cached.
  }
};

// Sights, museums, viewpoints, beaches and landmarks with a Wikipedia or Wikidata entry,
// which keeps it to places people have heard of.
const sightsQuery = ({ lat, lng }, radius) => `
[out:json][timeout:25];
(
  nwr["tourism"~"^(attraction|museum|viewpoint|zoo|theme_park|gallery|aquarium)$"]["name"]["wikidata"](around:${radius},${lat},${lng});
  nwr["natural"~"^(beach|peak|waterfall|volcano)$"]["name"]["wikidata"](around:${radius},${lat},${lng});
  nwr["historic"]["name"]["wikipedia"](around:${radius},${lat},${lng});
  nwr["leisure"~"^(park|nature_reserve)$"]["name"]["wikipedia"](around:${radius},${lat},${lng});
);
out center 150;`;

const KIND_KEYS = ["tourism", "natural", "historic", "leisure"];

// Lead photo and one-line description from the Wikipedia page a tag like "en:Tanah Lot" names
const wikipediaSummary = async (tag) => {
  const [lang, ...rest] = tag.split(":");
  const title = rest.join(":");
  if (!title || !/^[a-z-]{2,12}$/.test(lang)) return {};
  try {
    const { data } = await axios.get(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`
    );
    return { imageUrl: data.thumbnail?.source || "", description: data.description || "" };
  } catch {
    return {};
  }
};

// Up to `limit` well-known places within `radius` metres of `center`, those with a
// Wikipedia article first. Asks every Overpass server at once and takes the first answer.
const fromOverpass = async (center, radius, limit) => {
  const controller = new AbortController();
  const { data } = await Promise.any(
    OVERPASS_URLS.map((url) =>
      axios.get(url, { params: { data: sightsQuery(center, radius) }, timeout: 10000, signal: controller.signal })
    )
  ).finally(() => controller.abort());

  const seen = new Set();
  const picks = data.elements
    .map((element) => {
      const tags = element.tags || {};
      const kind = KIND_KEYS.map((key) => tags[key]).find((value) => value && value !== "yes");
      return {
        sourceId: `${element.type[0].toUpperCase()}${element.id}`,
        name: tags["name:en"] || tags.name,
        address: joinParts([tags["addr:street"], tags["addr:city"]]),
        category: titleCase(kind),
        lat: element.lat ?? element.center?.lat,
        lng: element.lon ?? element.center?.lon,
        wikipedia: tags.wikipedia,
      };
    })
    .filter((place) => place.name && place.lat != null && !seen.has(place.name) && seen.add(place.name))
    .sort((a, b) => Number(Boolean(b.wikipedia)) - Number(Boolean(a.wikipedia)))
    .slice(0, limit);

  return Promise.all(
    picks.map(async ({ wikipedia, ...place }) => ({
      ...place,
      ...(wikipedia ? await wikipediaSummary(wikipedia) : {}),
    }))
  );
};

// Words in a Wikipedia short description ("Rock formation off the coast of Bali") that
// mark a sight rather than a village, school or company
const SIGHT_WORDS =
  /\b(museum|temple|beach|monument|memorial|park|palace|waterfalls?|falls|mountain|volcano|lake|island|market|garden|zoo|aquarium|cathedral|church|mosque|shrine|pagoda|castle|fort|fortress|tower|bridge|gallery|square|rock|cave|cliff|bay|viewpoint|reserve|landmark|statue|ruins?|heritage|attraction)\b/i;

// Fallback when Overpass is down: geotagged English Wikipedia articles within 10 km
// (the API's limit), nearest first, kept to sights by their short description
const fromWikipedia = async ({ lat, lng }, limit) => {
  const { data } = await axios.get("https://en.wikipedia.org/w/api.php", {
    params: {
      action: "query",
      format: "json",
      formatversion: 2,
      origin: "*",
      generator: "geosearch",
      ggscoord: `${lat}|${lng}`,
      ggsradius: 10000,
      ggslimit: 50,
      prop: "coordinates|pageimages|description",
      colimit: 50,
      piprop: "thumbnail",
      pithumbsize: 240,
    },
    timeout: 12000,
  });
  return (data.query?.pages || [])
    .filter((page) => page.coordinates && SIGHT_WORDS.test(page.description || ""))
    .sort((a, b) => a.index - b.index)
    .slice(0, limit)
    .map((page) => ({
      sourceId: `wiki:${page.pageid}`,
      name: page.title,
      address: "",
      category: "",
      description: page.description,
      lat: page.coordinates[0].lat,
      lng: page.coordinates[0].lon,
      imageUrl: page.thumbnail?.source || "",
    }));
};

// Up to `limit` well-known places around `center`, from OpenStreetMap or, when that's
// unavailable or finds nothing, Wikipedia
export const recommendedPlaces = async (center, { limit = 12, radius = 25000 } = {}) => {
  const cacheKey = `recs:${center.lat.toFixed(2)},${center.lng.toFixed(2)}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  let places = [];
  try {
    places = await fromOverpass(center, radius, limit);
  } catch (error) {
    console.warn("Falling back to Wikipedia for recommendations:", error.message);
  }
  if (places.length === 0) places = await fromWikipedia(center, limit);
  if (places.length) writeCache(cacheKey, places);
  return places;
};

// Middle of a set of places, for centring recommendations when no destination is set
export const centreOf = (places) =>
  places.length
    ? {
        lat: places.reduce((sum, place) => sum + place.lat, 0) / places.length,
        lng: places.reduce((sum, place) => sum + place.lng, 0) / places.length,
      }
    : null;

// Pin colour for each list, in order. Repeats after eight lists.
export const LIST_COLOURS = ["#E4761B", "#0A7C84", "#6B0A44", "#2F6FDE", "#D9A43A", "#2E9E5B", "#C2410C", "#7C3AED"];
export const listColour = (index) => LIST_COLOURS[index % LIST_COLOURS.length];
