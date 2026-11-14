/** A weekly calendar reminder (.ics) for the check-in. Runs fully in the browser. */
export function weeklyReminderIcs(petName: string, start: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const end = new Date(start.getTime() + 10 * 60 * 1000);
  const safe = petName.replace(/[\\;,\n]/g, " ");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Prevently//Weekly check-in//EN",
    "BEGIN:VEVENT",
    `UID:prevently-${start.getTime()}@prevently.app`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    "RRULE:FREQ=WEEKLY",
    `SUMMARY:${safe}'s weekly Prevently check-in`,
    `DESCRIPTION:One minute: how is ${safe} this week? Each check-in counts towards your premium discount.`,
    "BEGIN:VALARM",
    "TRIGGER:-PT0M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${safe}'s check-in`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(petName: string, start: Date) {
  const blob = new Blob([weeklyReminderIcs(petName, start)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${petName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "pet"}-weekly-check-in.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Next occurrence of the same weekday, at 9am local time, one week after the given date. */
export function nextWeekSameDay(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + 7);
  d.setHours(9, 0, 0, 0);
  return d;
}
