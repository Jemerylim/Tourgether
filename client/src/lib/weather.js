import axios from "../api/client";
import dayjs from "dayjs";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from "lucide-react";

// Daily forecasts from Open-Meteo (free, no key). It only looks 16 days ahead, so
// days further out get nothing.
const FORECAST_DAYS = 16;

// WMO weather codes, grouped into what the icon shows
const KINDS = [
  [[0], Sun, "Clear"],
  [[1, 2], CloudSun, "Partly cloudy"],
  [[3], Cloud, "Cloudy"],
  [[45, 48], CloudFog, "Fog"],
  [[51, 53, 55, 56, 57], CloudDrizzle, "Drizzle"],
  [[61, 63, 65, 66, 67, 80, 81, 82], CloudRain, "Rain"],
  [[71, 73, 75, 77, 85, 86], CloudSnow, "Snow"],
  [[95, 96, 99], CloudLightning, "Thunderstorms"],
];

const kindOf = (code) => KINDS.find(([codes]) => codes.includes(code)) || KINDS[2];

// date -> { icon, label, high, low, rain } for the days between `from` and `to`
// (YYYY-MM-DD) that are close enough to forecast
export const dailyForecast = async ({ lat, lng }, from, to) => {
  const today = dayjs().format("YYYY-MM-DD");
  const lastForecast = dayjs().add(FORECAST_DAYS - 1, "day").format("YYYY-MM-DD");
  const start = from > today ? from : today;
  const end = to < lastForecast ? to : lastForecast;
  if (start > end) return new Map();

  const { data } = await axios.get("https://api.open-meteo.com/v1/forecast", {
    params: {
      latitude: lat.toFixed(3),
      longitude: lng.toFixed(3),
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "auto",
      start_date: start,
      end_date: end,
    },
    timeout: 10000,
  });
  const daily = data.daily || {};
  return new Map(
    (daily.time || []).map((date, index) => {
      const [, icon, label] = kindOf(daily.weather_code[index]);
      return [
        date,
        {
          icon,
          label,
          high: Math.round(daily.temperature_2m_max[index]),
          low: Math.round(daily.temperature_2m_min[index]),
          rain: daily.precipitation_probability_max[index] ?? null,
        },
      ];
    })
  );
};
