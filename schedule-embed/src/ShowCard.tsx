import { useEffect, useState, type CSSProperties } from "react";
import { formatDateParts, type ScheduleShow } from "./types";

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
    </svg>
  );
}

/** Sample the image and return a darkened average tint for the card wash. */
function accentFromImage(img: HTMLImageElement): { hex: string; rgb: string } | null {
  try {
    const w = 64;
    const h = 64;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !img.naturalWidth) return null;

    // Prefer the lower half — that's where the tint lives
    ctx.drawImage(
      img,
      0,
      img.naturalHeight * 0.4,
      img.naturalWidth,
      img.naturalHeight * 0.6,
      0,
      0,
      w,
      h
    );

    const { data } = ctx.getImageData(0, 0, w, h);
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;

    for (let i = 0; i < data.length; i += 4) {
      const pr = data[i];
      const pg = data[i + 1];
      const pb = data[i + 2];
      const a = data[i + 3];
      if (a < 200) continue;
      const max = Math.max(pr, pg, pb);
      const min = Math.min(pr, pg, pb);
      // Skip blown-out whites / pure blacks
      if (max > 248 && min > 230) continue;
      if (max < 12) continue;
      r += pr;
      g += pg;
      b += pb;
      n += 1;
    }

    if (!n) return null;
    r /= n;
    g /= n;
    b /= n;

    // Keep the average hue; darken enough for white text, but stay colorful
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const target = 72; // aim for a readable mid-dark tint
    const scale = luminance > 1 ? Math.min(0.72, target / luminance) : 0.55;
    r = Math.round(r * scale);
    g = Math.round(g * scale);
    b = Math.round(b * scale);

    const clamp = (v: number) => Math.max(16, Math.min(140, v));
    r = clamp(r);
    g = clamp(g);
    b = clamp(b);

    const toHex = (v: number) => v.toString(16).padStart(2, "0");
    return {
      hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
      rgb: `${r}, ${g}, ${b}`,
    };
  } catch {
    return null;
  }
}

function hexToRgbChannels(hex: string): string {
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (h.length >= 6) {
    return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
  }
  return "21, 36, 56";
}

export function ShowCard({ show, onOpen }: { show: ScheduleShow; onOpen: (show: ScheduleShow) => void }) {
  const start = formatDateParts(show.start);
  const end = formatDateParts(show.end);
  const sameDay = show.start === show.end;
  const [accent, setAccent] = useState(show.accent);
  const [accentRgb, setAccentRgb] = useState(() => hexToRgbChannels(show.accent));

  useEffect(() => {
    setAccent(show.accent);
    setAccentRgb(hexToRgbChannels(show.accent));
  }, [show.accent, show.image]);

  const style = {
    "--accent": accent,
    "--accent-rgb": accentRgb,
  } as CSSProperties;

  return (
    <button
      type="button"
      className="jf-card"
      style={style}
      onClick={() => onOpen(show)}
      aria-label={`Event: ${show.title}`}
    >
      <div className="jf-card-media" aria-hidden="true">
        <img
          className="jf-card-photo"
          src={show.image}
          alt=""
          loading="lazy"
          crossOrigin="anonymous"
          onLoad={(e) => {
            const extracted = accentFromImage(e.currentTarget);
            if (extracted) {
              setAccent(extracted.hex);
              setAccentRgb(extracted.rgb);
            }
          }}
          onError={() => {
            setAccent(show.accent);
            setAccentRgb(hexToRgbChannels(show.accent));
          }}
        />
        <div className="jf-card-blur" />
      </div>
      <div className="jf-card-tint" aria-hidden="true" />
      <div className="jf-card-shade" aria-hidden="true" />

      <div className="jf-date-badge" aria-label={`Event dates: ${start.month} ${start.day}${sameDay ? "" : ` - ${end.month} ${end.day}`}`}>
        <div className="jf-date-half jf-date-start">
          <span className="jf-date-month">{start.month}</span>
          <span className="jf-date-day">{start.day}</span>
        </div>
        {!sameDay && (
          <>
            <span className="jf-date-dash" aria-hidden="true" />
            <div className="jf-date-half jf-date-end">
              <span className="jf-date-month">{end.month}</span>
              <span className="jf-date-day">{end.day}</span>
            </div>
          </>
        )}
      </div>

      <div className="jf-card-body">
        <h3 className="jf-card-title">{show.title}</h3>
        <div className="jf-card-meta">
          <p className="jf-card-city">{show.city}</p>
          {show.booth ? <span className="jf-meta-tag">Booth {show.booth}</span> : null}
        </div>
        <div className="jf-venue">
          <PinIcon />
          <span>{show.venue}</span>
        </div>
      </div>
    </button>
  );
}
