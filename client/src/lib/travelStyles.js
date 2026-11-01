import axios from "../api/client";
import { Building2, Coffee, Gem, Landmark, Mountain, PiggyBank, Tent, Umbrella, UtensilsCrossed } from "lucide-react";
import { API_URL } from "../config";
import { questions } from "../pages/Quiz/destinations";
import { getToken } from "../api/session";

// How someone likes to travel. The values double as quiz tags (see pages/Quiz/destinations.js)
// and match TRAVEL_STYLES in backend/models/User.js, so keep the three in step.
export const TRAVEL_STYLES = [
  { value: "beach", label: "Beach lover", icon: Umbrella },
  { value: "city", label: "City explorer", icon: Building2 },
  { value: "nature", label: "Nature & hikes", icon: Mountain },
  { value: "food", label: "Foodie", icon: UtensilsCrossed },
  { value: "culture", label: "Culture buff", icon: Landmark },
  { value: "adventure", label: "Adventurer", icon: Tent },
  { value: "relax", label: "Slow traveller", icon: Coffee },
  { value: "budget", label: "Budget-savvy", icon: PiggyBank },
  { value: "luxury", label: "Treat yourself", icon: Gem },
];

export const MAX_TRAVEL_STYLES = 6;

// Quiz answers (one option index per question) -> the styles they point to, most-chosen
// first. Tags that aren't styles (weather, who's coming) are ignored.
export const stylesFromAnswers = (answers, limit = 4) => {
  const counts = new Map();
  answers.forEach((optionIndex, q) => {
    (questions[q]?.options[optionIndex]?.tags ?? []).forEach((tag) => {
      if (TRAVEL_STYLES.some((style) => style.value === tag)) counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
};

// Adds `styles` to what the signed-in user already has (up to the maximum) and saves it.
// Resolves to the saved list.
export const saveTravelStyles = async (styles) => {
  const { data } = await axios.get(`${API_URL}/api/users/profile`);
  const merged = [...new Set([...(data.user.travelStyles || []), ...styles])].slice(0, MAX_TRAVEL_STYLES);
  const form = new FormData();
  form.append("travelStyles", JSON.stringify(merged));
  const saved = await axios.put(`${API_URL}/api/users/update-profile`, form);
  return saved.data.user.travelStyles;
};
