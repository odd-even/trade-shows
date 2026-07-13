export type ScheduleKind = "tradeShow" | "eod";

export type ScheduleView = "all" | "trade-shows" | "eod";

export interface ScheduleShow {
  id: string;
  title: string;
  /** tradeShow = booth events; eod = early order / early pay deadlines */
  kind?: ScheduleKind;
  tag: string;
  start: string;
  end: string;
  city: string;
  booth: string | null;
  venue: string;
  address?: string | null;
  url?: string | null;
  boothMap?: string | null;
  image: string;
  accent: string;
  /** When true, keep schedule accent (don't sample the card photo). */
  lockAccent?: boolean;
  description?: string | null;
  published?: boolean;
  /** Discounts: expand across years. Default true for kind=eod. */
  repeatAnnually?: boolean;
}

export function showKind(show: ScheduleShow): ScheduleKind {
  if (show.kind === "eod") return "eod";
  if (show.kind === "tradeShow") return "tradeShow";
  // Fallback for older docs / Sanity entries without kind
  const tag = (show.tag || "").toUpperCase();
  if (tag.includes("EARLY") || tag.includes("EOD") || tag.includes("PREPAY") || tag.includes("DISCOUNT")) {
    return "eod";
  }
  return "tradeShow";
}

export function kindLabel(kind: ScheduleKind): string {
  return kind === "eod" ? "Discount" : "Trade Show";
}

/** Keep month+day (and short trailing words) from wrapping onto orphan lines. */
export function balanceWrapText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    // "November 1", "December 31", "January 15"
    .replace(/\b([A-Za-z]+)\s+(\d{1,2}(?:st|nd|rd|th)?)\b/g, "$1\u00A0$2")
    // Only glue a short/numeric last word (avoid locking "Prepayment Discount")
    .replace(/(\S+)\s+(\S+)$/u, (_, a: string, b: string) => {
      if (/^\d/.test(b) || b.length <= 3) return `${a}\u00A0${b}`;
      return `${a} ${b}`;
    });
}

/** Pull "10% OFF" (etc.) out of discount titles for a prominent card treatment. */
export function parseDiscountOffer(title: string): { offer: string; percent: string; product: string } {
  const cleaned = title.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^(\d+)\s*%\s*OFF\s*[—–-]?\s*(.*)$/i);
  if (match) {
    return {
      offer: `${match[1]}% OFF`,
      percent: `${match[1]}%`,
      product: (match[2] || "").trim(),
    };
  }
  return { offer: cleaned, percent: cleaned, product: "" };
}

/** Local calendar date as YYYY-MM-DD for comparisons. */
export function todayYmd(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return todayYmd(new Date(y, m - 1, d + days));
}

export function addMonthsYmd(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return todayYmd(new Date(y, m - 1 + months, d));
}

/** Calendar-day difference: to − from (can be negative). */
export function daysBetweenYmd(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86_400_000);
}

/** True while today falls within the event date range (inclusive). */
export function isLiveNow(show: ScheduleShow, today = todayYmd()): boolean {
  return show.start <= today && show.end >= today;
}

/** EOD countdown window: deadline day and the N days before it. */
export const EOD_COUNTDOWN_DAYS = 100; // TODO: restore to 15 after preview

export function isEodCountdownActive(show: ScheduleShow, today = todayYmd()): boolean {
  if (showKind(show) !== "eod") return false;
  const days = daysBetweenYmd(today, show.end);
  return days >= 0 && days <= EOD_COUNTDOWN_DAYS;
}

/** Label for EOD urgency pill, e.g. "7 days left". Null outside the countdown window. */
export function eodCountdownLabel(show: ScheduleShow, today = todayYmd()): string | null {
  if (!isEodCountdownActive(show, today)) return null;
  const days = daysBetweenYmd(today, show.end);
  if (days === 0) return "Last day";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

/** True while the event is ongoing, or overlaps today through the next 6 days. */
export function isLiveOrThisWeek(show: ScheduleShow, today = todayYmd()): boolean {
  if (show.end < today) return false;
  const weekEnd = addDaysYmd(today, 6);
  return show.start <= weekEnd;
}

/** Default visible window: today through +12 months. */
export const SCHEDULE_WINDOW_MONTHS = 12;
/** How far ahead we pre-expand / allow Show more to reach. */
export const SCHEDULE_MAX_WINDOW_MONTHS = 60;
/** Each Show more click extends by this many months. */
export const SCHEDULE_WINDOW_STEP_MONTHS = 12;

export function scheduleHorizon(today = todayYmd(), windowMonths = SCHEDULE_WINDOW_MONTHS): string {
  return addMonthsYmd(today, windowMonths);
}

function isValidYmd(ymd: string): boolean {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function templateBaseId(id: string): string {
  return id.replace(/-\d{4}$/, "");
}

function monthDay(iso: string): string {
  return iso.slice(5, 10);
}

function isAnnualDiscount(show: ScheduleShow): boolean {
  if (showKind(show) !== "eod") return false;
  return show.repeatAnnually !== false;
}

/**
 * Expand annual discounts into concrete years and keep events in
 * [today, today + windowMonths]. Trade shows are not repeated.
 */
export function expandScheduleShows(
  shows: ScheduleShow[],
  today = todayYmd(),
  windowMonths = SCHEDULE_MAX_WINDOW_MONTHS,
): ScheduleShow[] {
  const horizon = scheduleHorizon(today, windowMonths);
  const trade: ScheduleShow[] = [];
  const templates = new Map<string, ScheduleShow>();

  for (const show of shows) {
    if (show.published === false) continue;
    if (isAnnualDiscount(show)) {
      const md = monthDay(show.start);
      if (!/^\d{2}-\d{2}$/.test(md)) continue;
      const key = `${md}|${show.title}`;
      if (!templates.has(key)) {
        templates.set(key, { ...show, id: templateBaseId(show.id) });
      }
      continue;
    }
    // One-off discounts or trade shows (kept for filtering; may sit beyond default window)
    if (show.end >= today && show.start <= horizon) trade.push(show);
  }

  const expanded: ScheduleShow[] = [];
  const yStart = Number(today.slice(0, 4)) - 1;
  const yEnd = Number(horizon.slice(0, 4)) + 1;

  for (const template of templates.values()) {
    const md = monthDay(template.start);
    for (let year = yStart; year <= yEnd; year += 1) {
      const date = `${year}-${md}`;
      if (!isValidYmd(date)) continue;
      if (date < today || date > horizon) continue;
      expanded.push({
        ...template,
        id: `${templateBaseId(template.id)}-${year}`,
        start: date,
        end: date,
        kind: "eod",
        repeatAnnually: true,
      });
    }
  }

  return [...trade, ...expanded].sort((a, b) => {
    const byDate = a.start.localeCompare(b.start);
    if (byDate) return byDate;
    return a.title.localeCompare(b.title);
  });
}

/** Still visible on the end date; hidden the day after. */
export function isCurrentOrUpcoming(show: ScheduleShow, today = todayYmd()): boolean {
  return show.end >= today;
}

export function isWithinScheduleWindow(
  show: ScheduleShow,
  today = todayYmd(),
  windowMonths = SCHEDULE_WINDOW_MONTHS,
): boolean {
  const horizon = scheduleHorizon(today, windowMonths);
  return show.end >= today && show.start <= horizon;
}

export function filterShowsByView(
  shows: ScheduleShow[],
  view: ScheduleView,
  today = todayYmd(),
  windowMonths = SCHEDULE_WINDOW_MONTHS,
): ScheduleShow[] {
  return shows.filter((s) => {
    if (s.published === false) return false;
    if (!isWithinScheduleWindow(s, today, windowMonths)) return false;
    const kind = showKind(s);
    if (view === "trade-shows") return kind === "tradeShow";
    if (view === "eod") return kind === "eod";
    return true;
  });
}

/** True when more events exist beyond the current window (up to max). */
export function hasMoreInSchedule(
  shows: ScheduleShow[],
  view: ScheduleView,
  windowMonths: number,
  today = todayYmd(),
): boolean {
  if (windowMonths >= SCHEDULE_MAX_WINDOW_MONTHS) return false;
  const visible = filterShowsByView(shows, view, today, windowMonths);
  const farther = filterShowsByView(shows, view, today, SCHEDULE_MAX_WINDOW_MONTHS);
  return farther.length > visible.length;
}

export function parseScheduleView(raw: string | null | undefined): ScheduleView {
  const v = (raw || "").trim().toLowerCase();
  if (v === "trade-shows" || v === "tradeshows" || v === "trade" || v === "shows") return "trade-shows";
  if (v === "eod" || v === "early-order" || v === "discount" || v === "discounts") return "eod";
  if (v === "all") return "all";
  return "all";
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatLongDate(iso: string, withYear: boolean): string {
  const { y, m, d } = parseYmd(iso);
  const base = `${MONTHS_LONG[m - 1]} ${d}`;
  return withYear ? `${base}, ${y}` : base;
}

/**
 * EOD modal "When": from today (once on/after July 1 of the current year) through the
 * deadline. If today is past this occurrence's deadline, use next year's date.
 * Example: July 13 – November 1, 2026
 */
export function formatEodWhenRange(show: ScheduleShow, today = todayYmd()): string {
  const md = monthDay(show.end);
  let year = parseYmd(show.end).y;
  let end = `${year}-${md}`;

  if (today > end) {
    year += 1;
    end = `${year}-${md}`;
  }

  const { y: ty, m: tm } = parseYmd(today);
  let start: string;
  if (tm >= 7) {
    start = today;
  } else {
    const july1 = `${ty}-07-01`;
    // Fall deadlines: season opens July 1. Early-year deadlines still ahead: use today.
    start = end >= july1 ? july1 : today;
  }

  if (start > end) start = end;

  const sameYear = parseYmd(start).y === parseYmd(end).y;
  if (start === end) return formatLongDate(end, true);
  return `${formatLongDate(start, !sameYear)} - ${formatLongDate(end, true)}`;
}

function ymdCompact(iso: string): string {
  return iso.replace(/-/g, "");
}

/** Exclusive end date for all-day ICS (day after last inclusive day). */
function icsExclusiveEnd(endInclusive: string): string {
  const { y, m, d } = parseYmd(endInclusive);
  const next = new Date(y, m - 1, d + 1);
  const yy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const dd = String(next.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Google Calendar template URL (all-day). */
export function googleCalendarUrl(show: ScheduleShow): string {
  const start = ymdCompact(show.start);
  const end = icsExclusiveEnd(show.end);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: show.title.trim(),
    details: (show.description || "").trim(),
    dates: `${start}/${end}`,
    location: show.address || show.venue || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(show: ScheduleShow): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    startdt: show.start,
    enddt: show.end,
    allday: "true",
    subject: show.title.trim(),
    body: (show.description || "").trim(),
    location: show.address || show.venue || "",
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function office365CalendarUrl(show: ScheduleShow): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    startdt: show.start,
    enddt: show.end,
    allday: "true",
    subject: show.title.trim(),
    body: (show.description || "").trim(),
    location: show.address || show.venue || "",
  });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function yahooCalendarUrl(show: ScheduleShow): string {
  const params = new URLSearchParams({
    v: "60",
    title: show.title.trim(),
    desc: (show.description || "").trim(),
    st: ymdCompact(show.start),
    et: ymdCompact(show.end),
    dur: "allday",
    in_loc: show.address || show.venue || "",
  });
  return `https://calendar.yahoo.com/?${params.toString()}`;
}

export function buildIcs(show: ScheduleShow): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const uid = `${show.id}-${show.start}@jollyfarmer.com`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jolly Farmer//Trade Shows//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymdCompact(show.start)}`,
    `DTEND;VALUE=DATE:${icsExclusiveEnd(show.end)}`,
    `SUMMARY:${icsEscape(show.title.trim())}`,
    `DESCRIPTION:${icsEscape((show.description || "").trim())}`,
    `LOCATION:${icsEscape(show.address || show.venue || "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadIcs(show: ScheduleShow): void {
  const blob = new Blob([buildIcs(show)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${show.id || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type CalendarProvider = "apple" | "google" | "outlook" | "office365" | "yahoo" | "ics";

export function preferredCalendarProviders(): CalendarProvider[] {
  if (typeof navigator === "undefined") {
    return ["google", "apple", "outlook", "office365", "yahoo", "ics"];
  }
  const ua = navigator.userAgent || "";
  const isApple = /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  if (isApple) return ["apple", "google", "outlook", "office365", "yahoo", "ics"];
  if (isAndroid) return ["google", "outlook", "office365", "yahoo", "apple", "ics"];
  return ["google", "outlook", "office365", "apple", "yahoo", "ics"];
}

export function calendarProviderLabel(id: CalendarProvider): string {
  switch (id) {
    case "apple":
      return "Apple Calendar";
    case "google":
      return "Google Calendar";
    case "outlook":
      return "Outlook.com";
    case "office365":
      return "Outlook / Office 365";
    case "yahoo":
      return "Yahoo Calendar";
    case "ics":
      return "Download .ics";
  }
}

export function mapsDirectionsUrl(show: ScheduleShow): string {
  const q = encodeURIComponent(show.address || show.venue);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Canonical public schedule URL (never localhost / preview / iframe path). */
export const PUBLIC_SCHEDULE_URL = "https://jf-trade-shows.vercel.app";

export function publicEventShareUrl(showId: string): string {
  return `${PUBLIC_SCHEDULE_URL}/#${encodeURIComponent(showId)}`;
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
