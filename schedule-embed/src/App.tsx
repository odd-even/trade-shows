import { useEffect, useMemo, useState } from "react";
import { EventPopup } from "./EventPopup";
import { loadSchedule } from "./loadSchedule";
import { ShowCard } from "./ShowCard";
import type { ScheduleData, ScheduleShow } from "./types";
import "./styles.css";

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

export default function App() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ScheduleShow | null>(null);

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
    const match = data.shows.find((s) => s.id === hash && s.published !== false);
    if (match) setActive(match);
  }, [data]);

  useEffect(() => {
    const postHeight = () => {
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
  }, [data, active]);

  const groups = useMemo(() => {
    if (!data) return [];
    return groupShowsByYear(data.shows.filter((s) => s.published !== false));
  }, [data]);

  if (error) {
    return <div className="jf-schedule jf-error">Unable to load trade show schedule.</div>;
  }

  if (!data) {
    return <div className="jf-schedule jf-loading" aria-busy="true" />;
  }

  return (
    <div className="jf-schedule">
      {groups.map((group) => (
        <section key={group.year} className="jf-year-group">
          <header className="jf-year">{group.year}</header>
          <div className="jf-grid">
            {group.shows.map((show) => (
              <ShowCard key={show.id} show={show} onOpen={setActive} />
            ))}
          </div>
        </section>
      ))}
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
