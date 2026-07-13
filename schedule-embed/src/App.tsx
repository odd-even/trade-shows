import { useEffect, useMemo, useState } from "react";
import { EventPopup } from "./EventPopup";
import { loadSchedule } from "./loadSchedule";
import { ShowCard } from "./ShowCard";
import {
  filterShowsByView,
  hasMoreInSchedule,
  isWithinScheduleWindow,
  parseScheduleView,
  SCHEDULE_MAX_WINDOW_MONTHS,
  SCHEDULE_WINDOW_MONTHS,
  SCHEDULE_WINDOW_STEP_MONTHS,
  type ScheduleData,
  type ScheduleShow,
  type ScheduleView,
} from "./types";
import "./styles.css";

const TABS: Array<{ id: ScheduleView; label: string }> = [
  { id: "all", label: "All" },
  { id: "trade-shows", label: "Trade Shows" },
  { id: "eod", label: "Discounts" },
];

function yearOf(show: ScheduleShow): number {
  return Number(show.start.slice(0, 4));
}

function groupShowsByYear(shows: ScheduleShow[]): Array<{ year: number; shows: ScheduleShow[] }> {
  const map = new Map<number, ScheduleShow[]>();
  for (const show of shows) {
    const y = yearOf(show);
    const list = map.get(y) ?? [];
    list.push(show);
    map.set(y, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, yearShows]) => ({
      year,
      shows: [...yearShows].sort((a, b) => a.start.localeCompare(b.start)),
    }));
}

function initialView(): ScheduleView {
  if (typeof window === "undefined") return "all";
  const params = new URLSearchParams(window.location.search);
  return parseScheduleView(params.get("view"));
}

export default function App() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ScheduleShow | null>(null);
  const [view, setView] = useState<ScheduleView>(initialView);
  const [windowMonths, setWindowMonths] = useState(SCHEDULE_WINDOW_MONTHS);

  useEffect(() => {
    let cancelled = false;
    loadSchedule()
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const match = data.shows.find(
      (s) => s.id === hash && s.published !== false && isWithinScheduleWindow(s, undefined, windowMonths),
    );
    if (match) setActive(match);
  }, [data, windowMonths]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (view === "all") url.searchParams.delete("view");
    else url.searchParams.set("view", view);
    const next = url.pathname + url.search + url.hash;
    window.history.replaceState(null, "", next);
  }, [view]);

  useEffect(() => {
    const postHeight = () => {
      if (active) return;
      const height = Math.ceil(document.documentElement.scrollHeight);
      window.parent.postMessage({ type: "jf-trade-shows-resize", height }, "*");
    };
    postHeight();
    const ro = new ResizeObserver(postHeight);
    ro.observe(document.body);
    window.addEventListener("load", postHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener("load", postHeight);
    };
  }, [data, active, view, windowMonths]);

  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage({ type: "jf-trade-shows-modal", open: Boolean(active) }, "*");
    return () => {
      window.parent.postMessage({ type: "jf-trade-shows-modal", open: false }, "*");
    };
  }, [active]);

  const groups = useMemo(() => {
    if (!data) return [];
    return groupShowsByYear(filterShowsByView(data.shows, view, undefined, windowMonths));
  }, [data, view, windowMonths]);

  const canShowMore = useMemo(() => {
    if (!data) return false;
    return hasMoreInSchedule(data.shows, view, windowMonths);
  }, [data, view, windowMonths]);

  const canShowLess = windowMonths > SCHEDULE_WINDOW_MONTHS;

  if (error) {
    return <div className="jf-schedule jf-error">Unable to load schedule.</div>;
  }

  if (!data) {
    return <div className="jf-schedule jf-loading" aria-busy="true" />;
  }

  return (
    <div className="jf-schedule">
      <div className="jf-tabs" role="tablist" aria-label="Schedule filter">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            className={`jf-tab${view === tab.id ? " is-active" : ""}`}
            onClick={() => setView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="jf-empty">No events in this view.</p>
      ) : (
        groups.map((group) => (
          <section key={group.year} className="jf-year-group">
            <header className="jf-year">{group.year}</header>
            <div className="jf-grid">
              {group.shows.map((show) => (
                <ShowCard key={show.id} show={show} onOpen={setActive} />
              ))}
            </div>
          </section>
        ))
      )}

      {canShowMore || canShowLess ? (
        <div className="jf-more-row">
          {canShowMore ? (
            <button
              type="button"
              className="jf-more-icon-btn"
              aria-label="Show more"
              onClick={() =>
                setWindowMonths((m) => Math.min(SCHEDULE_MAX_WINDOW_MONTHS, m + SCHEDULE_WINDOW_STEP_MONTHS))
              }
            >
              <span className="jf-more-plus" aria-hidden="true">
                +
              </span>
              <span className="jf-more-label">Show more</span>
            </button>
          ) : null}
          {canShowLess ? (
            <button
              type="button"
              className="jf-more-icon-btn jf-more-icon-btn-secondary"
              aria-label="Show less"
              onClick={() => setWindowMonths(SCHEDULE_WINDOW_MONTHS)}
            >
              <span className="jf-more-plus" aria-hidden="true">
                −
              </span>
              <span className="jf-more-label">Show less</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {active ? (
        <EventPopup
          show={active}
          onClose={() => {
            setActive(null);
            if (window.location.hash) {
              history.replaceState(null, "", window.location.pathname + window.location.search);
            }
          }}
        />
      ) : null}
    </div>
  );
}
