/**
 * Today's walking conditions from Open-Meteo (free, no key). The request goes straight from the browser
 * to Open-Meteo; location is never sent to Prevently. Default location: Coventry (CV4 7AL).
 */
export const DEFAULT_PLACE = { name: "Coventry", lat: 52.38, lon: -1.56 };

export type Hour = { time: string; hour: number; temp: number; rain: number };
export type Weather = { place: string; now: number; max: number; sunrise: string; sunset: string; hours: Hour[] };

export async function fetchWeather(lat: number, lon: number, place: string, signal?: AbortSignal): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}` +
    "&current=temperature_2m&hourly=temperature_2m,precipitation_probability&daily=sunrise,sunset,temperature_2m_max&timezone=auto&forecast_days=1";
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`weather ${r.status}`);
  const d = await r.json();
  const hours: Hour[] = d.hourly.time.map((t: string, i: number) => ({
    time: t,
    hour: Number(t.slice(11, 13)),
    temp: d.hourly.temperature_2m[i],
    rain: d.hourly.precipitation_probability?.[i] ?? 0,
  }));
  return { place, now: d.current.temperature_2m, max: d.daily.temperature_2m_max[0], sunrise: d.daily.sunrise[0], sunset: d.daily.sunset[0], hours };
}

export type HeatLevel = "none" | "caution" | "high";

/** Heat guidance: caution from about 20°C, stronger for flat-faced, overweight and senior dogs. */
export function heatLevel(maxTemp: number, vulnerable: boolean): HeatLevel {
  if (maxTemp >= 25) return "high";
  if (maxTemp >= 20) return vulnerable ? "high" : "caution";
  return "none";
}

const fmtHour = (h: number) => (h === 0 ? "midnight" : h === 12 ? "noon" : h < 12 ? `${h}am` : `${h - 12}pm`);

/** The best one-hour daylight window: dry first, then cool on warm days or mild on cold ones. */
export function bestWindow(w: Weather): { from: string; to: string; temp: number; rain: number } | null {
  const rise = Number(w.sunrise.slice(11, 13)) + 1;
  const set = Number(w.sunset.slice(11, 13));
  const day = w.hours.filter((h) => h.hour >= Math.max(6, rise) && h.hour < Math.max(rise + 1, set));
  if (!day.length) return null;
  const warm = w.max >= 18;
  const score = (h: Hour) => h.rain * 1.5 + (warm ? Math.max(0, h.temp - 14) * 6 : Math.max(0, 12 - h.temp) * 2);
  const best = [...day].sort((a, b) => score(a) - score(b) || a.hour - b.hour)[0];
  return { from: fmtHour(best.hour), to: fmtHour(best.hour + 1), temp: Math.round(best.temp), rain: best.rain };
}

export const sunsetTime = (w: Weather) => w.sunset.slice(11, 16);
