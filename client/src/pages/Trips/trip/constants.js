import { Backpack, CalendarDays, CalendarRange, MapPin, Vote, Wallet } from "lucide-react";

export const SECTIONS = [
  { value: "calendar", label: "Calendar", icon: CalendarDays },
  { value: "dates", label: "Find dates", icon: CalendarRange },
  { value: "places", label: "Places", icon: MapPin },
  { value: "polls", label: "Polls", icon: Vote },
  { value: "expenses", label: "Expenses", icon: Wallet },
  { value: "lists", label: "Packing & to-dos", icon: Backpack },
];

// Header buttons sit on the destination photo, so they get a soft white backing
export const HEADER_BUTTON = "btn-ghost bg-white/80 hover:bg-white";
