export interface ScheduleShow {
  id: string;
  title: string;
  tag: string;
  start: string;
  end: string;
  city: string;
  booth: string | null;
  venue: string;
  address?: string | null;
  url?: string | null;
  image: string;
  accent: string;
  description?: string | null;
  published?: boolean;
}

export interface ScheduleData {
  year: number;
  lastUpdated: string;
  title: string;
  shows: ScheduleShow[];
}

const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function parseYmd(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export function formatDateParts(iso: string): { month: string; day: string } {
  const { m, d } = parseYmd(iso);
  return { month: MONTHS_SHORT[m - 1], day: String(d) };
}

/** "July 11 - July 14" */
export function formatWhenRange(start: string, end: string): string {
  const s = parseYmd(start);
  const e = parseYmd(end);
  return `${MONTHS_LONG[s.m - 1]} ${s.d} - ${MONTHS_LONG[e.m - 1]} ${e.d}`;
}

/** Google Calendar template URL */
export function googleCalendarUrl(show: ScheduleShow): string {
  const s = parseYmd(show.start);
  const e = parseYmd(show.end);
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${pad(s.m)}/${pad(s.d)}/${s.y}`;
  const end = `${pad(e.m)}/${pad(e.d)}/${e.y}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    sf: "true",
    output: "xml",
    text: show.title.trim(),
    details: (show.description || "").trim(),
    dates: `${start}/${end}`,
    location: show.address || show.venue,
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

export function mapsDirectionsUrl(show: ScheduleShow): string {
  const q = encodeURIComponent(show.address || show.venue);
  return `https://www.google.com/maps/dir//${q}`;
}

export function mailtoInviteUrl(show: ScheduleShow, pageUrl: string): string {
  const when = formatWhenRange(show.start, show.end);
  const body = [
    `Event Name: ${show.title.trim()}`,
    `Event Date: ${when}`,
    show.venue ? `Venue: ${show.venue}` : "",
    show.booth ? `Booth: ${show.booth}` : "",
    `Event Link: ${pageUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
  return `mailto:?subject=${encodeURIComponent(show.title.trim())}&body=${encodeURIComponent(body)}`;
}
