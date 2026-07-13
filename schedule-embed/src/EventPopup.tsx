import { useEffect, useId, useState } from "react";
import {
  formatWhenRange,
  googleCalendarUrl,
  mailtoInviteUrl,
  mapsDirectionsUrl,
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

export function EventPopup({ show, onClose }: { show: ScheduleShow; onClose: () => void }) {
  const titleId = useId();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const description = (show.description || "").trim();
  const long = description.length > 220;
  const pageUrl = typeof window !== "undefined" ? window.location.href.split("#")[0] : "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${pageUrl}#${show.id}`);
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
          <h2 id={titleId} className="jf-popup-title">
            {show.title}
          </h2>
          {show.url ? (
            <a className="jf-show-details" href={show.url} target="_blank" rel="noopener noreferrer">
              Show details
            </a>
          ) : null}
        </div>

        <div className="jf-popup-media">
          <img src={show.image} alt="" />
        </div>

        <div className="jf-popup-tags">
          <span className="jf-popup-tag">{show.city}</span>
          {show.booth ? <span className="jf-popup-tag">Booth {show.booth}</span> : null}
        </div>

        {description ? (
          <div className="jf-popup-desc">
            <p className={expanded || !long ? "" : "jf-clamp"}>{description}</p>
            {long ? (
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
          <p className="jf-popup-row-body">{formatWhenRange(show.start, show.end)}</p>
          <a className="jf-popup-link" href={googleCalendarUrl(show)} target="_blank" rel="noopener noreferrer">
            Add to Calendar
          </a>
        </div>

        <div className="jf-popup-row">
          <div className="jf-popup-row-title">
            <PinIcon />
            <span>Where</span>
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
          <a className="jf-popup-link" href={mapsDirectionsUrl(show)} target="_blank" rel="noopener noreferrer">
            Get Directions
          </a>
        </div>

        <div className="jf-popup-row">
          <div className="jf-popup-row-title">
            <span>Share</span>
          </div>
          <div className="jf-share-actions">
            <button type="button" className="jf-share-btn" onClick={copyLink}>
              {copied ? "Copied" : "Copy link"}
            </button>
            <a className="jf-share-btn" href={mailtoInviteUrl(show, `${pageUrl}#${show.id}`)}>
              Invite via email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
