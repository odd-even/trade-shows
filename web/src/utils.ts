import type { CanvasShow, CanvasTask, CompletedMap, TaskDueDatesMap, TaskOwnerOverridesMap } from "./types";

export const TODAY = new Date().toISOString().slice(0, 10);

export const SHIP_OPEN_COLOR = "#D97706";
export const SHIP_CLOSE_COLOR = "#DC2626";
export const FREIGHT_DEPART_COLOR = "#2563EB";

export const SHOW_PALETTE: Record<string, string> = {
  cultivate: "#04BB84",
  "gcc-expo": "#0894FF",
  cgc: "#8800FF",
  "green-industry": "#5AD67A",
  "quebec-vert": "#B55EFF",
  horteast: "#FF593B",
  "mid-ohio-growers-meeting": "#FF40B1",
  "gulf-states-expo": "#F4B942",
  mants: "#4A9EFF",
  "crop-expo": "#E84D8A",
};

export const OWNER_COLORS: Record<string, string> = {
  All: "#B55EFF",
  Graphics: "#8800FF",
  Debbie: "#FF40B1",
  Michael: "#FF593B",
  Peter: "#04BB84",
  Mailroom: "#CEFF87",
  "On-site reps": "#0894FF",
  Unassigned: "#9CA3AF",
};

export function ownerPillTextColor(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? "#141414" : "#FFFFFF";
}

export const SECTION_LABELS: Record<string, string> = {
  show_purchase: "Show purchase",
  personnel: "Personnel",
  booth_setup: "Booth setup",
  freight: "Freight",
  literature: "Literature",
  on_site: "On site",
  post_show_review: "Post-show review",
};

export function showHex(showId: string, shows: CanvasShow[]): string {
  if (SHOW_PALETTE[showId]) return SHOW_PALETTE[showId];
  const idx = shows.findIndex((s) => s.id === showId);
  const cycle = Object.values(SHOW_PALETTE);
  return cycle[(idx === -1 ? 0 : idx) % cycle.length];
}

export function daysFromToday(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso + "T12:00:00").getTime() - new Date(TODAY + "T12:00:00").getTime();
  return Math.round(ms / 86400000);
}

export function parseEmbeddedDate(text: string | undefined): string | null {
  if (!text) return null;
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : null;
}

export function isShippingDateTask(task: CanvasTask): boolean {
  const n = task.task.trim().toLowerCase();
  return (
    n.includes("advance shipping opens") ||
    n.includes("advance shipping closes") ||
    n === "freight departure date"
  );
}

export function taskBuiltInDate(task: CanvasTask): string | null {
  if (task.dueDate) return task.dueDate;
  if (isShippingDateTask(task)) return parseEmbeddedDate(task.info);
  return null;
}

export function taskDueDate(task: CanvasTask, dueDates: TaskDueDatesMap): string | null {
  if (task.id in dueDates) {
    const v = dueDates[task.id];
    return v || null;
  }
  return taskBuiltInDate(task);
}

export const UNASSIGNED_FILTER = "unassigned";
export const UNASSIGNED_OWNER = "—";

export function isUnassignedOwner(owner: string | null | undefined): boolean {
  if (!owner) return true;
  const trimmed = owner.trim();
  return trimmed === "" || trimmed === "—" || trimmed === "-" || trimmed.toLowerCase() === "unassigned";
}

export function taskOwner(task: CanvasTask, ownerOverrides: TaskOwnerOverridesMap): string {
  return ownerOverrides[task.id] ?? task.owner;
}

export function matchesOwnerFilter(
  task: CanvasTask,
  ownerFilter: string,
  ownerOverrides: TaskOwnerOverridesMap
): boolean {
  const owner = taskOwner(task, ownerOverrides);
  if (ownerFilter === "all") return true;
  if (ownerFilter === UNASSIGNED_FILTER) return isUnassignedOwner(owner);
  return owner === ownerFilter;
}

export function isTaskCompleted(completed: CompletedMap, id: string): boolean {
  return id in completed && completed[id] !== false && completed[id] !== "";
}

export function extractShippingWindow(tasks: CanvasTask[], dueDates: TaskDueDatesMap = {}) {
  let open: string | null = null;
  let close: string | null = null;
  let warehouse: string | null = null;
  for (const t of tasks) {
    const n = t.task.trim().toLowerCase();
    if (n.includes("advance shipping opens")) open = taskDueDate(t, dueDates);
    if (n.includes("advance shipping closes")) close = taskDueDate(t, dueDates);
    if (n === "delivery location" && t.info) warehouse = t.info;
  }
  return { open, close, warehouse };
}

export function extractFreightDeparture(tasks: CanvasTask[], dueDates: TaskDueDatesMap = {}): string | null {
  for (const t of tasks) {
    if (t.task.trim().toLowerCase() === "freight departure date") {
      return taskDueDate(t, dueDates);
    }
  }
  return null;
}

export function shippingCountdownLabel(iso: string | null, type: "close" | "ship"): string | null {
  if (!iso) return null;
  const days = daysFromToday(iso);
  if (days === null) return null;
  if (type === "close") {
    if (days < 0) return `${Math.abs(days)}d past warehouse close`;
    if (days === 0) return "warehouse closes today";
    return `${days}d to warehouse close`;
  }
  if (days < 0) return `${Math.abs(days)}d past ship date`;
  if (days === 0) return "product ships today";
  return `${days}d until product ships`;
}

export function shippingCountdownTone(iso: string | null): "danger" | "warning" | "info" {
  const days = daysFromToday(iso);
  if (days === null) return "info";
  if (days < 0 || days <= 7) return "danger";
  if (days <= 21) return "warning";
  return "info";
}

export function isAdvanceShipmentShow(show: CanvasShow): boolean {
  return show.tasks.some((t) => t.task.toLowerCase().includes("advance shipping opens"));
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "Dates TBD";
  const fmt = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return end && end !== start ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}

export function dueDateCountdownLabel(iso: string): string {
  const days = daysFromToday(iso);
  if (days === null) return "";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "due today";
  return `${days}d left`;
}

export function taskDetailPreview(task: CanvasTask, dueDates: TaskDueDatesMap): string {
  const parts = [task.info, task.notes].filter(Boolean);
  const date = taskDueDate(task, dueDates);
  if (date && !parts.some((p) => p?.includes(date))) parts.unshift(date);
  return parts.join(" · ").slice(0, 200);
}

export function countOpenByOwner(
  shows: CanvasShow[],
  completed: CompletedMap,
  ownerOverrides: TaskOwnerOverridesMap
): Record<string, number> {
  const counts: Record<string, number> = {};
  let unassigned = 0;
  for (const show of shows) {
    for (const t of show.tasks) {
      if (isTaskCompleted(completed, t.id)) continue;
      const owner = taskOwner(t, ownerOverrides);
      if (isUnassignedOwner(owner)) {
        unassigned += 1;
        continue;
      }
      counts[owner] = (counts[owner] ?? 0) + 1;
    }
  }
  counts[UNASSIGNED_FILTER] = unassigned;
  return counts;
}

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}
