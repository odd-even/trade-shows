import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  calendarProviderLabel,
  downloadIcs,
  formatWhenRange,
  formatEodWhenRange,
  googleCalendarUrl,
  kindLabel,
  mailtoInviteUrl,
  mapsDirectionsUrl,
  office365CalendarUrl,
  outlookCalendarUrl,
  parseDiscountOffer,
  preferredCalendarProviders,
  publicEventShareUrl,
  showKind,
  yahooCalendarUrl,
  type CalendarProvider,
  type ScheduleShow,
} from "./types";

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.212 6l4.537 4.537a.857.857 0 0 1-1.212 1.212L6 7.212 1.463 11.75a.857.857 0 1 1-1.212-1.212L4.788 6 .25 1.463A.857.857 0 1 1 1.463.251L6 4.788 10.537.25a.857.857 0 0 1 1.212 1.212L7.212 6z"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 12A6 6 0 1 0 6 0a6 6 0 0 0 0 12zm.75-9a.75.75 0 0 0-1.5 0v3.19l2.03 2.03a.75.75 0 1 0 1.06-1.06L6.75 5.69V3z"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
    </svg>
  );
}

function calendarHref(provider: CalendarProvider, show: ScheduleShow): string | null {
  switch (provider) {
    case "google":
      return googleCalendarUrl(show);
    case "outlook":
      return outlookCalendarUrl(show);
    case "office365":
      return office365CalendarUrl(show);
    case "yahoo":
      return yahooCalendarUrl(show);
    case "apple":
    case "ics":
      return null;
  }
}

export function EventPopup({ show, onClose }: { show: ScheduleShow; onClose: () => void }) {
  const titleId = useId();
  const calendarMenuId = useId();
  const calendarWrapRef = useRef<HTMLDivElement | null>(null);
  const descRef = useRef<HTMLParagraphElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const [copied, setCopied] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const description = (show.description || "").trim();
  const shareUrl = publicEventShareUrl(show.id);
  const isDiscount = showKind(show) === "eod";
  const discount = isDiscount ? parseDiscountOffer(show.title) : null;
  const calendarProviders = useMemo(() => preferredCalendarProviders(), []);

  useLayoutEffect(() => {
    setExpanded(false);
    setNeedsToggle(false);
  }, [show.id]);

  useLayoutEffect(() => {
    if (expanded) return;
    const el = descRef.current;
    if (!el || !description) {
      setNeedsToggle(false);
      return;
    }

    const measure = () => {
      setNeedsToggle(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [description, expanded, show.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (calendarOpen) setCalendarOpen(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, calendarOpen]);

  useEffect(() => {
    if (!calendarOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!calendarWrapRef.current?.contains(e.target as Node)) setCalendarOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [calendarOpen]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="jf-popup" role="presentation" onClick={onClose}>
      <div
        className="jf-popup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="jf-popup-close" aria-label="Close popup" onClick={onClose}>
          <CloseIcon />
        </button>

        <div className="jf-popup-header">
          {discount ? (
            <div className="jf-popup-discount-head">
              <div className="jf-discount-layout jf-discount-layout-popup">
                <div className="jf-discount-offer" aria-hidden="true">
                  <span className="jf-discount-percent">{discount.percent}</span>
                  <span className="jf-discount-off">DISCOUNT</span>
                </div>
                <div className="jf-discount-copy">
                  <h2 id={titleId} className="jf-popup-title jf-discount-product">
                    {discount.product || show.title}
                  </h2>
                </div>
              </div>
            </div>
          ) : (
            <h2 id={titleId} className="jf-popup-title">
              {show.title}
            </h2>
          )}
          {show.url ? (
            <a className="jf-show-details" href={show.url} target="_blank" rel="noopener noreferrer">
              {isDiscount ? "Order now" : "Show details"}
            </a>
          ) : null}
        </div>

        <div className="jf-popup-media">
          <img src={show.image} alt="" />
        </div>

        <div className="jf-popup-tags">
          <span className={`jf-popup-tag jf-popup-kind jf-kind-${showKind(show) === "eod" ? "eod" : "trade"}`}>
            {kindLabel(showKind(show))}
          </span>
          {show.tag && show.tag.toUpperCase() !== "TRADE SHOW" ? (
            <span className="jf-popup-tag">{show.tag}</span>
          ) : null}
          <span className="jf-popup-tag">{show.city}</span>
          {show.booth ? <span className="jf-popup-tag">Booth {show.booth}</span> : null}
        </div>

        {description ? (
          <div className="jf-popup-desc">
            <p ref={descRef} className={expanded ? "" : "jf-clamp"}>
              {description}
            </p>
            {needsToggle ? (
              <button type="button" className="jf-read-more" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Show Less" : "Show More"}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="jf-popup-row">
          <div className="jf-popup-row-title">
            <ClockIcon />
            <span>When</span>
          </div>
          <p className="jf-popup-row-body">
            {isDiscount ? formatEodWhenRange(show) : formatWhenRange(show.start, show.end)}
          </p>
          <div className="jf-calendar-wrap" ref={calendarWrapRef}>
            <button
              type="button"
              className="jf-popup-pill jf-calendar-toggle"
              aria-expanded={calendarOpen}
              aria-controls={calendarMenuId}
              onClick={() => setCalendarOpen((v) => !v)}
            >
              Add to Calendar
            </button>
            {calendarOpen ? (
              <div id={calendarMenuId} className="jf-calendar-menu" role="menu">
                {calendarProviders.map((provider) => {
                  const href = calendarHref(provider, show);
                  if (href) {
                    return (
                      <a
                        key={provider}
                        className="jf-calendar-option"
                        role="menuitem"
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setCalendarOpen(false)}
                      >
                        {calendarProviderLabel(provider)}
                      </a>
                    );
                  }
                  return (
                    <button
                      key={provider}
                      type="button"
                      className="jf-calendar-option"
                      role="menuitem"
                      onClick={() => {
                        downloadIcs(show);
                        setCalendarOpen(false);
                      }}
                    >
                      {calendarProviderLabel(provider)}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="jf-popup-row">
          <div className="jf-popup-row-title">
            {isDiscount ? null : <PinIcon />}
            <span>{isDiscount ? "Shop Online" : "Where"}</span>
          </div>
          <p className="jf-popup-row-body">
            {show.url ? (
              <a href={show.url} target="_blank" rel="noopener noreferrer">
                {show.venue}
              </a>
            ) : (
              show.venue
            )}
          </p>
          {show.address && show.address !== show.venue ? <p className="jf-popup-address">{show.address}</p> : null}
          {show.address || showKind(show) === "tradeShow" || show.boothMap ? (
            <div className="jf-popup-actions">
              {show.address || showKind(show) === "tradeShow" ? (
                <a className="jf-popup-pill" href={mapsDirectionsUrl(show)} target="_blank" rel="noopener noreferrer">
                  Get Directions
                </a>
              ) : null}
              {show.boothMap ? (
                <a className="jf-popup-pill" href={show.boothMap} target="_blank" rel="noopener noreferrer">
                  Exhibitor Map
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="jf-popup-row">
          <div className="jf-popup-row-title">
            <span>Share</span>
          </div>
          <div className="jf-share-actions">
            <button type="button" className="jf-share-btn" onClick={copyLink}>
              {copied ? "Copied" : "Copy link"}
            </button>
            <a className="jf-share-btn" href={mailtoInviteUrl(show, shareUrl)}>
              Invite via email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
