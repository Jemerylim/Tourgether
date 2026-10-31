// Data for the "where should we go?" quiz. Each answer adds tags; each destination is
// scored by how many of the chosen tags it has. Keep tags to the keys in `reasons`.

export const questions = [
  {
    question: "What does a perfect day away look like?",
    options: [
      { label: "Lying on a beach with nowhere to be", tags: ["beach", "relax"] },
      { label: "Wandering a big city and its neighbourhoods", tags: ["city", "culture"] },
      { label: "Hiking somewhere with a view at the top", tags: ["nature", "adventure"] },
      { label: "Eating my way through markets and street stalls", tags: ["food", "culture"] },
    ],
  },
  {
    question: "What weather are you hoping for?",
    options: [
      { label: "Hot and sunny", tags: ["warm"] },
      { label: "Mild, a light jacket at night", tags: ["mild"] },
      { label: "Crisp and cold, maybe snow", tags: ["cold"] },
      { label: "I don't mind", tags: [] },
    ],
  },
  {
    question: "How packed should the days be?",
    options: [
      { label: "Slow, with plenty of downtime", tags: ["relax"] },
      { label: "A bit of both", tags: [] },
      { label: "Busy from morning till night", tags: ["adventure", "city"] },
    ],
  },
  {
    question: "What's the budget like?",
    options: [
      { label: "Keeping it cheap", tags: ["budget"] },
      { label: "Comfortable, nothing fancy", tags: ["mid"] },
      { label: "Let's treat ourselves", tags: ["luxury"] },
    ],
  },
  {
    question: "Who's coming along?",
    options: [
      { label: "Just me", tags: ["solo"] },
      { label: "My partner", tags: ["couple"] },
      { label: "A group of friends", tags: ["friends"] },
      { label: "Family, kids included", tags: ["family"] },
    ],
  },
];

// Shown under "Why it fits" for each tag a destination shares with the answers.
export const reasons = {
  beach: "Beaches you can spend whole days on",
  relax: "Easy to slow down and do very little",
  city: "A big, walkable city to explore",
  culture: "Temples, museums and old streets to wander",
  nature: "Mountains and trails close at hand",
  adventure: "Plenty to fill busy days",
  food: "Famous for what you can eat",
  warm: "Warm weather most of the year",
  mild: "Mild weather, comfortable for walking",
  cold: "Cold, crisp air and snowy seasons",
  budget: "Your money goes a long way",
  mid: "Good value without roughing it",
  luxury: "Great places to splash out",
  solo: "Easy and friendly to travel alone",
  couple: "Made for a trip for two",
  friends: "Lots to do as a group",
  family: "Works well with kids",
};

export const destinations = [
  { name: "Kyoto", country: "Japan", blurb: "Temples, gardens and quiet lanes, with Osaka's food a short train ride away.", tags: ["culture", "food", "mild", "relax", "mid", "solo", "couple"] },
  { name: "Tokyo", country: "Japan", blurb: "A city that never runs out of neighbourhoods, ramen counters and late nights.", tags: ["city", "food", "culture", "adventure", "mild", "mid", "solo", "friends"] },
  { name: "Bali", country: "Indonesia", blurb: "Surf beaches, rice terraces and long, slow afternoons.", tags: ["beach", "relax", "nature", "warm", "budget", "mid", "couple", "friends"] },
  { name: "Lisbon", country: "Portugal", blurb: "Hilly streets, pastel tiles and seafood by the river.", tags: ["city", "food", "culture", "mild", "mid", "couple", "friends"] },
  { name: "Reykjavík", country: "Iceland", blurb: "The base for glaciers, waterfalls and, with luck, the northern lights.", tags: ["nature", "adventure", "cold", "luxury", "couple", "friends"] },
  { name: "Queenstown", country: "New Zealand", blurb: "Lakes, mountains and every adrenaline sport you can name.", tags: ["nature", "adventure", "mild", "mid", "luxury", "friends", "couple"] },
  { name: "Hanoi", country: "Vietnam", blurb: "Street food on every corner and Ha Long Bay a day trip away.", tags: ["food", "city", "culture", "adventure", "warm", "budget", "solo", "friends"] },
  { name: "Chiang Mai", country: "Thailand", blurb: "Old-city temples, night markets and jungle just outside town.", tags: ["culture", "food", "nature", "relax", "warm", "budget", "solo"] },
  { name: "The Maldives", country: "Maldives", blurb: "Clear water, overwater villas and nothing on the schedule.", tags: ["beach", "relax", "warm", "luxury", "couple"] },
  { name: "Interlaken", country: "Switzerland", blurb: "Alpine lakes and peaks, with trains up into the snow.", tags: ["nature", "adventure", "cold", "luxury", "family", "couple"] },
  { name: "Cape Town", country: "South Africa", blurb: "Table Mountain, wine country and beaches in one trip.", tags: ["nature", "beach", "city", "food", "warm", "mid", "friends", "couple"] },
  { name: "Seoul", country: "South Korea", blurb: "Palaces, night markets and a café on every street.", tags: ["city", "food", "culture", "adventure", "cold", "mid", "friends", "solo"] },
  { name: "Barcelona", country: "Spain", blurb: "Gaudí, tapas and a city beach to finish the day.", tags: ["city", "beach", "food", "culture", "warm", "mid", "friends"] },
  { name: "Banff", country: "Canada", blurb: "Turquoise lakes and Rocky Mountain trails, snowy in winter.", tags: ["nature", "adventure", "cold", "mid", "family"] },
  { name: "Penang", country: "Malaysia", blurb: "Hawker food, street art and colonial shophouses.", tags: ["food", "culture", "warm", "budget", "family", "solo"] },
  { name: "Hokkaido", country: "Japan", blurb: "Powder snow, hot springs and some of Japan's best seafood.", tags: ["nature", "food", "cold", "relax", "mid", "family", "couple"] },
  { name: "Paris", country: "France", blurb: "Museums, bistros and long walks along the Seine.", tags: ["city", "culture", "food", "mild", "luxury", "couple"] },
  { name: "Marrakech", country: "Morocco", blurb: "Souks, riads and day trips out to the Atlas Mountains.", tags: ["culture", "food", "adventure", "warm", "budget", "friends"] },
];

// Rank destinations against the chosen answers (one option index per question).
// Ties keep the list order above, so the result is stable for the same answers.
export const recommend = (answers) => {
  const chosen = answers.flatMap((optionIndex, q) => questions[q]?.options[optionIndex]?.tags ?? []);
  return destinations
    .map((destination, order) => {
      const matched = [...new Set(chosen.filter((tag) => destination.tags.includes(tag)))];
      const score = chosen.filter((tag) => destination.tags.includes(tag)).length;
      return { ...destination, matched, score, order };
    })
    .sort((a, b) => b.score - a.score || a.order - b.order);
};
