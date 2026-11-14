import Link from "next/link";

const LOOP = [
  { n: "1", t: "60-second weekly check-in", d: "9 tap answers plus an optional photo. Multimodal AI reads both." },
  { n: "2", t: "Compared with your pet's own baseline", d: "Not a population average. Slow drift is caught weeks earlier." },
  { n: "3", t: "Routed to the right care", d: "Green: keep going. Amber: online consult. Red: vet now. Vet gets a ready-made brief." },
  { n: "4", t: "Prevention Credits", d: "Every check-in earns credits funded by insurers and vet groups from the claims they avoid." },
];

const STATS = [
  { v: "+75%", l: "UK vet prices in 10 years, twice inflation" },
  { v: "£685", l: "average UK pet insurance claim (2024)" },
  { v: "4,900", l: "pet insurance claims every day" },
  { v: "£1,900+", l: "annual spend per pet" },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-teal-800 to-teal-600 px-6 py-10 text-white sm:px-10">
        <p className="text-sm font-medium uppercase tracking-widest text-teal-100">Pet healthcare in the AI era</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">Prevention that pays.</h1>
        <p className="mt-4 max-w-2xl text-teal-50 sm:text-lg">
          Prevently turns a 60-second weekly AI check-in into early detection for pets, a pre-triaged brief for vets, and lower
          claims for insurers. The savings are shared back with owners as Prevention Credits.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/checkin" className="rounded-full bg-white px-5 py-2.5 font-semibold text-teal-800 hover:bg-teal-50">
            Try a check-in
          </Link>
          <Link href="/partner" className="rounded-full border border-white/60 px-5 py-2.5 font-semibold hover:bg-white/10">
            Partner ROI model
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.l} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
            <div className="text-2xl font-bold text-teal-800">{s.v}</div>
            <div className="mt-1 text-xs text-teal-900/70">{s.l}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-xl font-semibold">How it works</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {LOOP.map((s) => (
            <div key={s.n} className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-teal-900/5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-100 font-bold text-teal-800">{s.n}</span>
              <div>
                <h3 className="font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-teal-900/70">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-teal-900/50">Sources: Gillmore Hackathon 2026 Participant Reading Guide.</p>
    </div>
  );
}
