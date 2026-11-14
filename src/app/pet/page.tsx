"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearAll, loadCheckins, loadPet, type StoredCheckin } from "@/lib/store";
import type { Pet } from "@/lib/types";

const DOT = { green: "#059669", amber: "#f59e0b", red: "#dc2626" } as const;

const REWARDS = [
  { cost: 100, t: "£5 off next insurance premium", by: "Insurer partner" },
  { cost: 150, t: "Free nurse health check", by: "Vet group partner" },
  { cost: 80, t: "15% off dental chews", by: "Retail partner" },
  { cost: 200, t: "At-home urine test kit", by: "Lab partner" },
];

function TrendChart({ data }: { data: StoredCheckin[] }) {
  const W = 600, H = 200, P = 24, MIN = 40;
  if (data.length < 2) return <p className="text-sm text-teal-900/60">Two or more check-ins needed for a trend.</p>;
  const x = (i: number) => P + (i * (W - 2 * P)) / (data.length - 1);
  const y = (s: number) => H - P - ((Math.max(MIN, s) - MIN) / (100 - MIN)) * (H - 2 * P);
  const path = data.map((c, i) => `${i ? "L" : "M"}${x(i)},${y(c.healthScore)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Health score over time">
      <rect x={P} y={y(100)} width={W - 2 * P} height={y(70) - y(100)} fill="#ecfdf5" />
      <line x1={P} x2={W - P} y1={y(70)} y2={y(70)} stroke="#f59e0b" strokeDasharray="4 4" />
      <text x={P + 4} y={y(70) + 14} textAnchor="start" fontSize="10" fill="#b45309">amber threshold</text>
      <path d={path} fill="none" stroke="#0f766e" strokeWidth="2.5" />
      {data.map((c, i) => (
        <circle key={i} cx={x(i)} cy={y(c.healthScore)} r="5" fill={DOT[c.status]}>
          <title>{`${new Date(c.createdAt).toLocaleDateString("en-GB")}: ${c.healthScore}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export default function PetPage() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [log, setLog] = useState<StoredCheckin[]>([]);

  useEffect(() => {
    const p = loadPet();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setPet(p);
    setLog(loadCheckins().filter((c) => !p || c.petName === p.name));
  }, []);

  const credits = log.reduce((s, c) => s + c.creditsEarned, 0);
  const latest = log.at(-1);

  if (!pet) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
        <p>No pet yet.</p>
        <Link href="/checkin" className="mt-3 inline-block rounded-full bg-teal-700 px-4 py-2 font-semibold text-white">Do a first check-in</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{pet.name}</h1>
          <p className="text-sm text-teal-900/70">
            {pet.breed || pet.species} · {pet.ageYears} years{pet.weightKg ? ` · ${pet.weightKg} kg` : ""} · {log.length} check-ins
          </p>
        </div>
        <button
          onClick={() => {
            clearAll();
            setLog([]);
            setPet(null);
          }}
          className="text-xs text-teal-900/50 underline"
        >
          Reset demo data
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <div className="text-xs text-teal-900/60">Latest score</div>
          <div className="text-3xl font-bold text-teal-800">{latest?.healthScore ?? "N/A"}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <div className="text-xs text-teal-900/60">Streak</div>
          <div className="text-3xl font-bold text-teal-800">{log.length} wks</div>
        </div>
        <div className="rounded-2xl bg-teal-700 p-4 text-white shadow-sm">
          <div className="text-xs text-teal-100">Prevention Credits</div>
          <div className="text-3xl font-bold">{credits}</div>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
        <h2 className="font-semibold">Health trajectory (vs. own baseline)</h2>
        <TrendChart data={log} />
      </section>

      <section>
        <h2 className="font-semibold">Spend your credits</h2>
        <p className="text-sm text-teal-900/70">Funded by partners from the claims and emergency visits that prevention avoids.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {REWARDS.map((r) => (
            <div key={r.t} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
              <div>
                <div className="font-medium">{r.t}</div>
                <div className="text-xs text-teal-900/60">{r.by}</div>
              </div>
              <button
                disabled={credits < r.cost}
                className="rounded-full bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white disabled:bg-teal-900/20"
              >
                {r.cost}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
