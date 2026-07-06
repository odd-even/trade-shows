import { useEffect, useMemo, useState } from "react";
import type { AppData, CanvasShow, CanvasTask, CompletedMap, TaskDueDatesMap, TaskOwnerOverridesMap } from "./types";
import {
  TODAY,
  SHIP_OPEN_COLOR,
  SHIP_CLOSE_COLOR,
  FREIGHT_DEPART_COLOR,
  OWNER_COLORS,
  SECTION_LABELS,
  showHex,
  daysFromToday,
  taskDueDate,
  taskOwner,
  isTaskCompleted,
  extractShippingWindow,
  extractFreightDeparture,
  shippingCountdownLabel,
  shippingCountdownTone,
  isAdvanceShipmentShow,
  formatDateRange,
  dueDateCountdownLabel,
  taskDetailPreview,
  countOpenByOwner,
  loadJson,
  saveJson,
} from "./utils";
import "./styles.css";

const STORAGE = {
  completed: "jf-tsc-completed",
  dueDates: "jf-tsc-due-dates",
  owners: "jf-tsc-owner-overrides",
};

function Pill({
  label,
  color,
  active,
  count,
  onClick,
}: {
  label: string;
  color: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`pill ${active ? "pill-active" : ""}`}
      style={{ background: color, borderColor: color }}
      onClick={onClick}
    >
      {label}
      {count !== undefined && <span className="pill-count">{count}</span>}
    </Tag>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`stat stat-${tone ?? "default"}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function ShowResources({ show }: { show: CanvasShow }) {
  if (!show.links?.length && !show.resourceNotes) return null;
  return (
    <div className="resources">
      {show.links && (
        <div className="resource-links">
          {show.links.map((link) => (
            <a key={link.kind ?? link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="resource-link">
              {link.label} ↗
            </a>
          ))}
        </div>
      )}
      {show.resourceNotes && <p className="muted">{show.resourceNotes}</p>}
    </div>
  );
}

function ShippingBanner({ show, tasks, dueDates }: { show: CanvasShow; tasks: CanvasTask[]; dueDates: TaskDueDatesMap }) {
  const { open, close, warehouse } = extractShippingWindow(tasks, dueDates);
  const freightDepart = extractFreightDeparture(tasks, dueDates);
  if (!open && !close && !freightDepart) return null;

  const closeLabel = shippingCountdownLabel(close, "close");
  const shipLabel = shippingCountdownLabel(freightDepart, "ship");
  const tone = [close, freightDepart]
    .map((d) => (d ? shippingCountdownTone(d) : "info"))
    .includes("danger")
    ? "danger"
    : [close, freightDepart].map((d) => (d ? shippingCountdownTone(d) : "info")).includes("warning")
      ? "warning"
      : "info";

  return (
    <div className={`callout callout-${tone}`}>
      <strong>Shipping deadlines — {show.name}</strong>
      <div className="shipping-row">
        {open && (
          <span>
            <span style={{ color: SHIP_OPEN_COLOR, fontWeight: 700 }}>Warehouse opens</span> {open}
          </span>
        )}
        {close && (
          <span>
            <span style={{ color: SHIP_CLOSE_COLOR, fontWeight: 700 }}>Warehouse closes</span> {close}
            {closeLabel && <strong style={{ color: SHIP_CLOSE_COLOR }}> · {closeLabel}</strong>}
          </span>
        )}
        {freightDepart && (
          <span>
            <span style={{ color: FREIGHT_DEPART_COLOR, fontWeight: 700 }}>Product ships</span> {freightDepart}
            {shipLabel && <strong style={{ color: FREIGHT_DEPART_COLOR }}> · {shipLabel}</strong>}
          </span>
        )}
      </div>
      {warehouse && <p className="muted prewrap">Ship to: {warehouse}</p>}
    </div>
  );
}

function CalendarCountdowns({ tasks, dueDates }: { tasks: CanvasTask[]; dueDates: TaskDueDatesMap }) {
  const { close } = extractShippingWindow(tasks, dueDates);
  const freightDepart = extractFreightDeparture(tasks, dueDates);
  const closeLabel = shippingCountdownLabel(close, "close");
  const shipLabel = shippingCountdownLabel(freightDepart, "ship");
  if (!closeLabel && !shipLabel) return null;
  return (
    <div className="stat-grid">
      {closeLabel && <Stat label="Advance warehouse closes" value={closeLabel} tone={shippingCountdownTone(close)} />}
      {shipLabel && <Stat label="JF truck / product ships" value={shipLabel} tone={shippingCountdownTone(freightDepart)} />}
    </div>
  );
}

function MiniCalendar({ show, tasks, dueDates }: { show: CanvasShow; tasks: CanvasTask[]; dueDates: TaskDueDatesMap }) {
  const hex = showHex(show.id, [show]);
  const { close: advanceClose } = extractShippingWindow(tasks, dueDates);
  const freightDepart = extractFreightDeparture(tasks, dueDates);

  const dates = [
    show.dates.start,
    show.dates.end,
    advanceClose,
    freightDepart,
    ...tasks.map((t) => taskDueDate(t, dueDates)).filter(Boolean),
  ].filter(Boolean) as string[];

  if (dates.length === 0) return <p className="muted">No dates for this show yet.</p>;

  dates.sort();
  const start = new Date(dates[0] + "T12:00:00");
  start.setDate(1);
  start.setMonth(start.getMonth() - 1);
  const end = new Date(dates[dates.length - 1] + "T12:00:00");
  end.setMonth(end.getMonth() + 2);
  end.setDate(0);

  const months: Array<{ year: number; month: number }> = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= endMonth) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const inRange = (iso: string, from: string | null, to: string | null) =>
    from && to && iso >= from && iso <= to;

  return (
    <div className="calendar">
      <CalendarCountdowns tasks={tasks} dueDates={dueDates} />
      {months.map(({ year, month }) => {
        const first = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const label = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const cells = [];
        for (let i = 0; i < first.getDay(); i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          cells.push(iso);
        }

        return (
          <div key={`${year}-${month}`} className="month">
            <h3>{label}</h3>
            <div className="weekdays">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="days">
              {cells.map((iso, i) => {
                if (!iso) return <span key={`e-${i}`} className="day empty" />;
                const isToday = iso === TODAY;
                const shipping =
                  advanceClose && inRange(iso, extractShippingWindow(tasks, dueDates).open, advanceClose);
                const showDay =
                  show.dates.start &&
                  inRange(iso, show.dates.start, show.dates.end ?? show.dates.start);
                const freight = freightDepart && iso === freightDepart;
                const closeLabel = isToday && advanceClose ? shippingCountdownLabel(advanceClose, "close") : null;
                const shipLabel = isToday && freightDepart ? shippingCountdownLabel(freightDepart, "ship") : null;
                return (
                  <div
                    key={iso}
                    className={`day ${isToday ? "today" : ""} ${showDay ? "show-day" : ""} ${shipping ? "ship-day" : ""} ${freight ? "freight-day" : ""}`}
                    style={isToday ? { borderColor: hex } : undefined}
                  >
                    <span className="day-num">{parseInt(iso.slice(8), 10)}</span>
                    {closeLabel && <span className="day-badge close">{closeLabel}</span>}
                    {shipLabel && <span className="day-badge ship">{shipLabel}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [completed, setCompleted] = useState<CompletedMap>(() => loadJson(STORAGE.completed, {}));
  const [dueDates, setDueDates] = useState<TaskDueDatesMap>(() => loadJson(STORAGE.dueDates, {}));
  const [ownerOverrides, setOwnerOverrides] = useState<TaskOwnerOverridesMap>(() => loadJson(STORAGE.owners, {}));

  useEffect(() => {
    saveJson(STORAGE.completed, completed);
  }, [completed]);
  useEffect(() => {
    saveJson(STORAGE.dueDates, dueDates);
  }, [dueDates]);
  useEffect(() => {
    saveJson(STORAGE.owners, ownerOverrides);
  }, [ownerOverrides]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}app-data.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load data (${r.status})`);
        return r.json();
      })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  const shows = data?.shows ?? [];
  const activeShow = showFilter === "all" ? null : shows.find((s) => s.id === showFilter) ?? null;
  const ownerOpenCounts = useMemo(
    () => countOpenByOwner(shows, completed, ownerOverrides),
    [shows, completed, ownerOverrides]
  );
  const totalOpen = useMemo(
    () => shows.flatMap((s) => s.tasks).filter((t) => !isTaskCompleted(completed, t.id)).length,
    [shows, completed]
  );

  const matchesOwner = (t: CanvasTask) => ownerFilter === "all" || taskOwner(t, ownerOverrides) === ownerFilter;
  const visibleShows = shows.filter((s) => showFilter === "all" || s.id === showFilter);

  const toggleComplete = (id: string) => {
    setCompleted((prev) => {
      const next = { ...prev };
      if (id in next) delete next[id];
      else next[id] = TODAY;
      return next;
    });
  };

  const setTaskDueDate = (taskId: string, date: string | null) => {
    setDueDates((prev) => {
      const next = { ...prev };
      if (!date) delete next[taskId];
      else next[taskId] = date;
      return next;
    });
  };

  const setTaskOwnerOverride = (taskId: string, owner: string) => {
    setOwnerOverrides((prev) => ({ ...prev, [taskId]: owner }));
  };

  if (error) {
    return (
      <div className="page">
        <h1>Trade Show Command Center</h1>
        <p className="error">Could not load show data: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <h1>Trade Show Command Center</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  const advanceRows = shows
    .filter(isAdvanceShipmentShow)
    .map((show) => {
      const { open, close, warehouse } = extractShippingWindow(show.tasks, dueDates);
      return { show, open, close, warehouse, daysToClose: close ? daysFromToday(close) : null };
    })
    .sort((a, b) => (a.show.dates.start ?? "9999").localeCompare(b.show.dates.start ?? "9999"));

  return (
    <div className="page">
      <header className="header">
        <h1>Trade Show Command Center {data.year}</h1>
        <p className="muted">
          Jolly Farmer · {totalOpen} open tasks · Today {TODAY}
          {data.lastUpdated ? ` · Data updated ${data.lastUpdated}` : ""}
        </p>
      </header>

      <section className="card">
        <h2>Shows</h2>
        <div className="pill-row">
          <Pill label="All shows" color="#6B7280" active={showFilter === "all"} onClick={() => setShowFilter("all")} />
          {shows.map((show) => (
            <Pill
              key={show.id}
              label={show.name}
              color={showHex(show.id, shows)}
              active={showFilter === show.id}
              onClick={() => setShowFilter((prev) => (prev === show.id ? "all" : show.id))}
            />
          ))}
        </div>
      </section>

      <div className="stat-grid">
        <Stat label="Open tasks" value={String(totalOpen)} />
        <Stat
          label="Due in 21 days"
          value={String(
            shows
              .flatMap((s) => s.tasks)
              .filter((t) => !isTaskCompleted(completed, t.id))
              .filter((t) => {
                const d = daysFromToday(taskDueDate(t, dueDates));
                return d !== null && d >= 0 && d <= 21;
              }).length
          )}
          tone="warning"
        />
        <Stat
          label="Overdue"
          value={String(
            shows
              .flatMap((s) => s.tasks)
              .filter((t) => !isTaskCompleted(completed, t.id))
              .filter((t) => {
                const d = daysFromToday(taskDueDate(t, dueDates));
                return d !== null && d < 0;
              }).length
          )}
          tone="danger"
        />
      </div>

      {activeShow && (
        <>
          <section className="card">
            <h2>Show resources — {activeShow.name}</h2>
            <ShowResources show={activeShow} />
          </section>
          <ShippingBanner show={activeShow} tasks={activeShow.tasks.filter(matchesOwner)} dueDates={dueDates} />
          <section className="card">
            <h2>
              {activeShow.name} — calendar
              <span className="muted-inline">{formatDateRange(activeShow.dates.start, activeShow.dates.end)}</span>
            </h2>
            <MiniCalendar show={activeShow} tasks={activeShow.tasks.filter(matchesOwner)} dueDates={dueDates} />
          </section>
        </>
      )}

      <section className="card">
        <h2>Advance shipping lookup</h2>
        <p className="muted">Enter warehouse open/close dates per show. Countdowns update on the calendar.</p>
        <div className="advance-list">
          {advanceRows.map(({ show, open, close, warehouse, daysToClose }) => (
            <div key={show.id} className="advance-card">
              <div className="advance-head">
                <Pill label={show.name} color={showHex(show.id, shows)} onClick={() => setShowFilter(show.id)} />
                <span className="muted">{formatDateRange(show.dates.start, show.dates.end)}</span>
                {daysToClose !== null && close && (
                  <strong style={{ color: daysToClose <= 7 ? SHIP_CLOSE_COLOR : SHIP_OPEN_COLOR }}>
                    {shippingCountdownLabel(close, "close")}
                  </strong>
                )}
              </div>
              {warehouse && <p className="muted prewrap">Ship to: {warehouse}</p>}
              <ShowResources show={show} />
              <div className="date-inputs">
                {show.tasks
                  .filter((t) => t.task.toLowerCase().includes("advance shipping"))
                  .map((t) => (
                    <label key={t.id}>
                      <span>{t.task}</span>
                      <input
                        type="date"
                        value={taskDueDate(t, dueDates) ?? ""}
                        onChange={(e) => setTaskDueDate(t.id, e.target.value || null)}
                      />
                    </label>
                  ))}
              </div>
              {!open && !close && <p className="warn">Dates not set — look up in exhibitor manual / GES portal.</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Filter by person</h2>
        <div className="pill-row">
          <Pill label="All" color={OWNER_COLORS.All} count={totalOpen} active={ownerFilter === "all"} onClick={() => setOwnerFilter("all")} />
          {data.owners.map((o) => (
            <Pill
              key={o}
              label={o}
              color={OWNER_COLORS[o] ?? "#888"}
              count={ownerOpenCounts[o] ?? 0}
              active={ownerFilter === o}
              onClick={() => setOwnerFilter(o)}
            />
          ))}
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
          Show completed tasks
        </label>
      </section>

      {visibleShows.map((show) => {
        const tasks = show.tasks.filter(matchesOwner).filter((t) => showCompleted || !isTaskCompleted(completed, t.id));
        if (tasks.length === 0) return null;
        const sections = [...new Set(tasks.map((t) => t.section))];
        return (
          <section key={show.id} className="card">
            <h2>
              {show.name}
              <span className="muted-inline">{formatDateRange(show.dates.start, show.dates.end)} · {show.location}</span>
            </h2>
            {sections.map((section) => (
              <div key={section} className="section">
                <h3>{SECTION_LABELS[section] ?? section}</h3>
                <ul className="task-list">
                  {tasks
                    .filter((t) => t.section === section)
                    .map((t) => {
                      const date = taskDueDate(t, dueDates);
                      const done = isTaskCompleted(completed, t.id);
                      const isShipClose = t.task.toLowerCase().includes("advance shipping closes");
                      const isFreight = t.task.toLowerCase() === "freight departure date";
                      return (
                        <li key={t.id} className={`task ${done ? "done" : ""}`}>
                          <label className="task-check">
                            <input type="checkbox" checked={done} onChange={() => toggleComplete(t.id)} />
                            <span className={isShipClose || isFreight ? "task-critical" : ""}>{t.task}</span>
                          </label>
                          <div className="task-meta">
                            <select
                              value={taskOwner(t, ownerOverrides)}
                              onChange={(e) => setTaskOwnerOverride(t.id, e.target.value)}
                            >
                              {data.owners.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={date ?? ""}
                              onChange={(e) => setTaskDueDate(t.id, e.target.value || null)}
                            />
                            {date && (
                              <span
                                className={
                                  daysFromToday(date) !== null && daysFromToday(date)! < 0
                                    ? "countdown danger"
                                    : daysFromToday(date)! <= 7
                                      ? "countdown warn"
                                      : "countdown"
                                }
                              >
                                {dueDateCountdownLabel(date)}
                              </span>
                            )}
                          </div>
                          {taskDetailPreview(t, dueDates) && <p className="task-detail">{taskDetailPreview(t, dueDates)}</p>}
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </section>
        );
      })}

      <footer className="footer muted">
        Progress saves in this browser only. Source: Trade Show Master 2026.xlsx
      </footer>
    </div>
  );
}
