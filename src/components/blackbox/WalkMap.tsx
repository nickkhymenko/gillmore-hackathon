"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";

/**
 * The owner's own walk map (Leaflet + OpenStreetMap). The route is drawn from points held in this browser only;
 * map tiles load from OpenStreetMap, the route itself is never uploaded.
 */
export function WalkMap({ points, live, className = "" }: { points: [number, number][]; live: boolean; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const line = useRef<Polyline | null>(null);
  const paw = useRef<Marker | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const Lf = mod.default ?? mod;
      L.current = Lf;
      const m = Lf.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView(points[0] ?? [52.3912, -1.5226], 15);
      Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(m);
      line.current = Lf.polyline([], { color: "#141414", weight: 4, opacity: 0.85, lineCap: "round", lineJoin: "round" }).addTo(m);
      paw.current = Lf.marker(points[0] ?? [52.3912, -1.5226], {
        icon: Lf.divIcon({
          className: "",
          html: `<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:var(--accent);border:2px solid #141414" aria-hidden="true"><svg width="16" height="16" viewBox="-10 -12 20 22" fill="#141414"><path d="M0 0 C-5 0 -7.5 4 -6.5 6.5 C-5.5 9 -2 8 0 8 C2 8 5.5 9 6.5 6.5 C7.5 4 5 0 0 0 Z"/><ellipse cx="-6.8" cy="-3" rx="2" ry="2.8"/><ellipse cx="-2.4" cy="-6.6" rx="2" ry="2.9"/><ellipse cx="2.4" cy="-6.6" rx="2" ry="2.9"/><ellipse cx="6.8" cy="-3" rx="2" ry="2.8"/></svg></span>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
        keyboard: false,
      }).addTo(m);
      map.current = m;
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // Create once; updates happen below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !line.current || !paw.current) return;
    line.current.setLatLngs(points);
    const last = points.at(-1);
    if (last) {
      paw.current.setLatLng(last);
      if (live) m.panTo(last, { animate: true, duration: 0.4 });
    }
    if (!live && points.length > 1) m.fitBounds(line.current.getBounds(), { padding: [24, 24] });
  }, [points, live]);

  return <div ref={el} className={`z-0 h-72 w-full overflow-hidden rounded-brand border border-line sm:h-96 ${className}`} role="img" aria-label="Map of this walk, visible only to you" />;
}

/** A static route thumbnail drawn as SVG: no map tiles, nothing loaded from anywhere. */
export function RouteThumb({ points, size = 120 }: { points: [number, number][]; size?: number }) {
  if (points.length < 2) return null;
  const lats = points.map((p) => p[0]), lons = points.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const span = Math.max(maxLat - minLat, (maxLon - minLon) * Math.cos((minLat * Math.PI) / 180), 1e-6);
  const pad = 10, s = size - pad * 2;
  const xy = points.map(([la, lo]) => [pad + (((lo - minLon) * Math.cos((minLat * Math.PI) / 180)) / span) * s, pad + ((maxLat - la) / span) * s]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 rounded-brand border border-line bg-white/60" role="img" aria-label="Route shape">
      <path d={d} fill="none" stroke="#141414" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xy[0][0]} cy={xy[0][1]} r={4} fill="var(--accent)" stroke="#141414" strokeWidth={1.5} />
    </svg>
  );
}
