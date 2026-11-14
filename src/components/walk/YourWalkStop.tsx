"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, CloudRain, MapPin, Sun, SunHorizon, Thermometer, WarningCircle } from "@phosphor-icons/react";
import type { PetRecord, StoredCheckin } from "@/lib/store";
import { useNow } from "@/lib/usePets";
import { pronouns, walkPlan } from "@/lib/walkplan";
import { DEFAULT_PLACE, bestWindow, fetchWeather, heatLevel, sunsetTime, type Weather } from "@/lib/weather";

/** The big call to action that leads into the Black Box. */
export function CheaperCta({ name }: { name: string }) {
  return (
    <Link href="/blackbox" className="btn btn-primary min-h-14 px-6 text-lg sm:text-xl">
      Make my insurance cheaper today <ArrowUpRight size={20} weight="bold" aria-hidden />
      <span className="sr-only">with {name}&apos;s walks</span>
    </Link>
  );
}

function Conditions({ vulnerable, name, kind }: { vulnerable: boolean; name: string; kind: string }) {
  const [w, setW] = useState<Weather | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [place, setPlace] = useState(DEFAULT_PLACE);

  useEffect(() => {
    const ctl = new AbortController();
    fetchWeather(place.lat, place.lon, place.name, ctl.signal)
      .then((d) => {
        setW(d);
        setState("ready");
      })
      .catch((e) => {
        if (!ctl.signal.aborted) setState("error");
        void e;
      });
    return () => ctl.abort();
  }, [place]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) return;
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (p) => setPlace({ name: "your location", lat: p.coords.latitude, lon: p.coords.longitude }),
      () => setState(w ? "ready" : "error"),
      { maximumAge: 30 * 60 * 1000, timeout: 10_000 },
    );
  }

  if (state === "loading")
    return (
      <div className="space-y-2" aria-busy="true">
        <div className="shimmer h-6 w-2/3 rounded-[4px] bg-ink/10" />
        <div className="shimmer h-4 w-1/2 rounded-[4px] bg-ink/10" />
      </div>
    );
  if (state === "error" || !w) return <p className="text-sm text-muted">Today&apos;s weather is unavailable right now. On warm days, walk early or late and take water.</p>;

  const heat = heatLevel(w.max, vulnerable);
  const win = bestWindow(w);
  const rainLater = Math.max(...w.hours.map((h) => h.rain));

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="eyebrow flex items-center gap-1">
            <Thermometer size={13} aria-hidden /> Now
          </dt>
          <dd className="text-2xl font-semibold tracking-[-0.02em]">{Math.round(w.now)}°C</dd>
        </div>
        <div>
          <dt className="eyebrow flex items-center gap-1">
            <Sun size={13} aria-hidden /> High
          </dt>
          <dd className="text-2xl font-semibold tracking-[-0.02em]">{Math.round(w.max)}°C</dd>
        </div>
        <div>
          <dt className="eyebrow flex items-center gap-1">
            <CloudRain size={13} aria-hidden /> Rain
          </dt>
          <dd className="text-2xl font-semibold tracking-[-0.02em]">{rainLater}%</dd>
        </div>
        <div>
          <dt className="eyebrow flex items-center gap-1">
            <SunHorizon size={13} aria-hidden /> Sunset
          </dt>
          <dd className="text-2xl font-semibold tracking-[-0.02em]">{sunsetTime(w)}</dd>
        </div>
      </dl>
      {win && kind === "walks" && (
        <p className="text-lg">
          Best walk window today: <strong>{win.from} to {win.to}</strong>
          <span className="text-muted">
            {" "}
            ({win.temp}°C, {win.rain}% chance of rain)
          </span>
        </p>
      )}
      {heat !== "none" && kind !== "play" && (
        <p role="alert" className="flex items-start gap-3 rounded-brand p-4 text-sm font-medium" style={heat === "high" ? { background: "#F8DCD7", color: "#7A1A12" } : { background: "#FBEACB", color: "#6B3A00" }}>
          <WarningCircle size={20} weight="fill" aria-hidden className="mt-0.5 shrink-0" />
          <span>
            {heat === "high" ? `Heat warning: up to ${Math.round(w.max)}°C today. ` : `Warm today: up to ${Math.round(w.max)}°C. `}
            {vulnerable ? `${name} is more at risk in heat. ` : ""}
            Walk early or late, keep it shorter, choose shade and grass over pavements, and take water. Stop if {name} pants heavily or lags behind.
          </span>
        </p>
      )}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          Weather for {w.place} from Open-Meteo.
          {w.place !== "your location" && " Your location is never sent to Prevently."}
        </span>
        {w.place !== "your location" && (
          <button type="button" onClick={useMyLocation} className="link inline-flex min-h-11 items-center gap-1 text-ink">
            <MapPin size={13} aria-hidden /> Use my location
          </button>
        )}
      </p>
    </div>
  );
}

/** "Given {name}'s characteristics, here is their walk": written for this one pet. */
export function YourWalkStop({ rec, log }: { rec: PetRecord; log: StoredCheckin[] }) {
  const now = useNow();
  const { pet } = rec;
  const p = pronouns(pet);
  const plan = walkPlan(pet, rec.profile, log, now);
  const what = plan.kind === "play" ? "play plan" : plan.kind === "free-roam" ? "free-roam plan" : plan.kind === "turnout" ? "exercise plan" : "walk";

  return (
    <div className="space-y-10">
      <h3 className="display max-w-4xl text-[clamp(2rem,5vw,3.75rem)]">
        Given {pet.name}&apos;s characteristics, here is {p.possessive} <span className="accent-word">{what}.</span>
      </h3>

      {plan.rest && (
        <p className="flex max-w-2xl items-start gap-3 rounded-brand p-4 text-sm font-medium" style={{ background: "#FBEACB", color: "#6B3A00" }} role="status">
          <WarningCircle size={20} weight="fill" aria-hidden className="mt-0.5 shrink-0" />
          {plan.rest}
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-6">
          {plan.minutes !== null ? (
            <div>
              <p className="eyebrow">{plan.kind === "play" ? "Play today" : "Daily target"}</p>
              <p className="text-[clamp(3rem,8vw,5rem)] font-semibold leading-none tracking-[-0.05em]">
                {plan.minutes}
                <span className="text-2xl font-medium tracking-[-0.02em] text-muted"> minutes</span>
              </p>
              {plan.sessions.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {plan.sessions.map((s) => (
                    <li key={s.label} className="rounded-brand border border-line bg-white/60 px-3 py-2 text-sm">
                      <span className="font-semibold">{s.label}</span> {s.minutes} min
                    </li>
                  ))}
                </ul>
              )}
              {plan.category && (
                <p className="mt-3 text-sm text-muted">
                  Kennel Club exercise category: {plan.category.label}
                  {plan.category.estimated ? " (estimated for this breed or mix)" : ""}. Adjusted for {pet.name}&apos;s age, weight and this week&apos;s check-in.
                </p>
              )}
            </div>
          ) : (
            plan.kind === "walks" && <p className="text-2xl font-semibold tracking-[-0.03em]">No walk target today.</p>
          )}
          {plan.adjustments.length > 0 && (
            <ul className="space-y-1 text-sm">
              {plan.adjustments.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
          <dl className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <div>
              <dt className="eyebrow">Pace</dt>
              <dd className="mt-1">{plan.pace}</dd>
            </div>
            <div>
              <dt className="eyebrow">Where</dt>
              <dd className="mt-1">{plan.terrain}</dd>
            </div>
          </dl>
          <div>
            <p className="eyebrow">Ideas</p>
            <ul className="mt-2 space-y-1">
              {plan.enrichment.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-8 lg:col-span-6">
          <div>
            <p className="eyebrow mb-3">Today&apos;s conditions</p>
            <Conditions vulnerable={plan.vulnerableToHeat} name={pet.name} kind={plan.kind} />
          </div>
          <div>
            <p className="eyebrow">Watch for on {plan.kind === "walks" ? "walks" : "the day"}</p>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {plan.watch.map((w) => (
                <li key={w} className="py-2">
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6">
        <CheaperCta name={pet.name} />
        <span className="max-w-sm text-sm text-muted">
          Hit {pet.name}&apos;s personal target and {p.possessive} premium drops. It can only go down.
        </span>
      </div>
    </div>
  );
}
