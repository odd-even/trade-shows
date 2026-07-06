#!/usr/bin/env python3
"""Regenerate embedded show data in the command center canvas from data/shows.json.

Run after import_spreadsheet.py:
  python3 scripts/generate_canvas.py
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "shows.json"
RESOURCES = ROOT / "data" / "show-resources.json"
CANVAS = Path.home() / ".cursor/projects/Users-ernest-Documents-GitHub-JF-Trade-Shows/canvases/trade-show-command-center.canvas.tsx"
WEB_DATA = ROOT / "web" / "public" / "app-data.json"

LINK_LABELS: dict[str, str] = {
    "website": "Show website",
    "exhibitorPortal": "Exhibitor portal",
    "boothMap": "Booth map",
    "floorPlanPdf": "Floor plan (PDF)",
    "exhibitorManual": "Exhibitor manual",
    "shippingLabels": "Advance shipping labels",
    "showDecorator": "Show decorator",
    "gesOrdering": "GES ordering",
    "gesFindShow": "GES — find your show",
    "exhibitorInfo": "Exhibitor info",
    "exhibitorRegister": "Exhibitor registration",
    "venueServices": "Venue services",
    "shepardKit": "Shepard kit login",
    "shippingHelp": "Shipping labels help",
    "contact": "Contact",
    "venue": "Venue",
}


def task_for_canvas(task: dict) -> dict:
    out: dict = {
        "id": task["id"],
        "task": task["task"],
        "owner": task.get("owner") or "—",
        "section": task.get("section", ""),
    }
    if task.get("dueDate"):
        out["dueDate"] = task["dueDate"]
    if task.get("priority"):
        out["priority"] = task["priority"]
    if task.get("info"):
        out["info"] = task["info"]
    if task.get("notes"):
        out["notes"] = task["notes"]
    return out


def resources_for_show(show_id: str, resources: dict | None) -> tuple[list[dict], str | None]:
    if not resources:
        return [], None
    entry = resources.get("shows", {}).get(show_id)
    if not entry:
        return [], None
    links: list[dict] = []
    for key, label in LINK_LABELS.items():
        url = entry.get(key)
        if url:
            links.append({"label": label, "url": url, "kind": key})
    notes = entry.get("notes")
    return links, notes if isinstance(notes, str) else None


def build_shows(data: dict, resources: dict | None = None) -> list[dict]:
    shows_out: list[dict] = []
    for show in data["shows"]:
        if show.get("status") == "cancelled":
            continue
        pending = [t for t in show["tasks"] if t["status"] == "pending"]
        if not pending and not show.get("dates", {}).get("start"):
            continue
        links, resource_notes = resources_for_show(show["id"], resources)
        portal = show.get("exhibitorPortal")
        if not portal and links:
            portal = next((l["url"] for l in links if l["kind"] == "exhibitorPortal"), None)
        item: dict = {
            "id": show["id"],
            "name": show["name"].replace("\n", " "),
            "dates": show.get("dates", {}),
            "location": (show.get("location") or "").split("\n")[0],
            "booth": show.get("booth"),
            "exhibitorPortal": portal,
            "status": show.get("status", "upcoming"),
            "tasks": [task_for_canvas(t) for t in pending],
        }
        if links:
            item["links"] = links
        if resource_notes:
            item["resourceNotes"] = resource_notes
        shows_out.append(item)
    return shows_out


def patch_canvas(content: str, shows_out: list[dict], owners: list[str], owner_counts: dict[str, int]) -> str:
    # Use lambda replacements — re.sub interprets backslashes in replacement strings,
    # which would turn json.dumps \n escapes into literal newlines and break the TSX.
    shows_block = f"const SHOWS: CanvasShow[] = {json.dumps(shows_out, indent=2)};"
    owners_block = f"const OWNERS: string[] = {json.dumps(owners)};"
    counts_block = f"const OWNER_COUNTS: Record<string, number> = {json.dumps(owner_counts)};"

    content = re.sub(
        r"const SHOWS: CanvasShow\[\] = \[.*?\n\];",
        lambda _: shows_block,
        content,
        count=1,
        flags=re.DOTALL,
    )
    content = re.sub(
        r"const OWNERS: string\[\] = \[.*?\];",
        lambda _: owners_block,
        content,
        count=1,
    )
    content = re.sub(
        r"const OWNER_COUNTS: Record<string, number> = \{.*?\};",
        lambda _: counts_block,
        content,
        count=1,
    )
    return content


def main() -> None:
    if not DATA.exists():
        raise SystemExit(f"Missing {DATA}")
    if not CANVAS.exists():
        raise SystemExit(f"Missing {CANVAS} — open the project in Cursor first so the canvas exists")

    data = json.loads(DATA.read_text())
    resources = json.loads(RESOURCES.read_text()) if RESOURCES.exists() else None
    shows_out = build_shows(data, resources)
    owners = sorted({t["owner"] for s in shows_out for t in s["tasks"] if t["owner"] != "—"})
    owner_counts = dict(Counter(t["owner"] for s in shows_out for t in s["tasks"]).most_common())

    content = patch_canvas(CANVAS.read_text(), shows_out, owners, owner_counts)
    CANVAS.write_text(content)

    web_payload = {
        "year": data.get("year", 2026),
        "lastUpdated": data.get("lastUpdated"),
        "teams": data.get("teams", {}),
        "shows": shows_out,
        "owners": owners,
        "ownerCounts": owner_counts,
    }
    WEB_DATA.parent.mkdir(parents=True, exist_ok=True)
    WEB_DATA.write_text(json.dumps(web_payload, indent=2))

    open_count = sum(len(s["tasks"]) for s in shows_out)
    with_info = sum(1 for s in shows_out for t in s["tasks"] if t.get("info"))
    print(f"Updated {CANVAS.name}")
    print(f"Updated {WEB_DATA.relative_to(ROOT)}")
    print(f"  Shows: {len(shows_out)} · Open tasks: {open_count} · With details: {with_info}")


if __name__ == "__main__":
    main()
