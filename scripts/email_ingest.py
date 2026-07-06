#!/usr/bin/env python3
"""Poll an email inbox and save new messages into inbox/ for Cursor to process.

Usage:
  cp .env.example .env   # fill in credentials
  pip install python-dotenv
  python scripts/email_ingest.py              # poll once
  python scripts/email_ingest.py --watch      # poll every POLL_INTERVAL_SECONDS
  python scripts/email_ingest.py --dry-run    # list what would be saved

Saves:
  inbox/emails/YYYY-MM-DD_<subject-slug>_<uid>.eml
  inbox/attachments/ or inbox/packages/<show-guess>/ for PDFs
"""

from __future__ import annotations

import argparse
import email
import imaplib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from email.header import decode_header
from email.message import Message
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INBOX_EMAILS = ROOT / "inbox" / "emails"
INBOX_ATTACHMENTS = ROOT / "inbox" / "attachments"
INBOX_PACKAGES = ROOT / "inbox" / "packages"
STATE_FILE = ROOT / "inbox" / ".email-state.json"

SHOW_KEYWORDS = {
    "mants": "mants",
    "cultivate": "cultivate-2026",
    "americanhort": "cultivate-2026",
    "green industry": "gisc-2026",
    "gisc": "gisc-2026",
    "garden center show": "garden-center-show-2026",
    "gardencenterconference": "gcc-expo-2026",
    "shepard": "general",
    "fern exposition": "cultivate-2026",
}


def load_dotenv() -> None:
    try:
        from dotenv import load_dotenv as _load
    except ImportError:
        return
    env_path = ROOT / ".env"
    if env_path.exists():
        _load(env_path)


def env(key: str, default: str = "") -> str:
    return os.environ.get(key, default).strip()


def slugify(text: str, max_len: int = 60) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return (text[:max_len] or "no-subject").strip("-")


def decode_mime_header(value: str | None) -> str:
    if not value:
        return ""
    parts: list[str] = []
    for chunk, charset in decode_header(value):
        if isinstance(chunk, bytes):
            parts.append(chunk.decode(charset or "utf-8", errors="replace"))
        else:
            parts.append(chunk)
    return "".join(parts).strip()


def guess_show_folder(subject: str, from_addr: str) -> str | None:
    haystack = f"{subject} {from_addr}".lower()
    for keyword, folder in SHOW_KEYWORDS.items():
        if keyword in haystack:
            return folder
    return None


def load_state() -> set[str]:
    if not STATE_FILE.exists():
        return set()
    try:
        data = json.loads(STATE_FILE.read_text())
        return set(data.get("processedUids", []))
    except (json.JSONDecodeError, OSError):
        return set()


def save_state(processed: set[str]) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(
        json.dumps(
            {
                "processedUids": sorted(processed),
                "lastRun": datetime.now(timezone.utc).isoformat(),
            },
            indent=2,
        )
        + "\n"
    )


def connect_imap() -> imaplib.IMAP4_SSL:
    host = env("IMAP_HOST")
    user = env("IMAP_USER")
    password = env("IMAP_PASSWORD")
    port = int(env("IMAP_PORT", "993"))

    if not host or not user or not password:
        raise SystemExit(
            "Missing IMAP credentials. Copy .env.example to .env and set "
            "IMAP_HOST, IMAP_USER, IMAP_PASSWORD."
        )

    client = imaplib.IMAP4_SSL(host, port)
    client.login(user, password)
    folder = env("IMAP_FOLDER", "INBOX")
    status, _ = client.select(folder)
    if status != "OK":
        raise SystemExit(f"Could not open folder: {folder}")
    return client


def save_attachment(part: Message, dest_dir: Path, base_name: str) -> Path | None:
    filename = part.get_filename()
    if filename:
        filename = decode_mime_header(filename)
    else:
        filename = base_name

    filename = re.sub(r'[<>:"/\\|?*]', "-", filename)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / filename
    if dest.exists():
        stem, suffix = dest.stem, dest.suffix
        dest = dest_dir / f"{stem}_{int(time.time())}{suffix}"

    payload = part.get_payload(decode=True)
    if not payload:
        return None
    dest.write_bytes(payload)
    return dest


def process_message(raw: bytes, uid: str, dry_run: bool) -> list[str]:
    msg = email.message_from_bytes(raw)
    subject = decode_mime_header(msg.get("Subject")) or "no-subject"
    from_addr = decode_mime_header(msg.get("From"))
    date_hdr = msg.get("Date", "")
    try:
        msg_date = email.utils.parsedate_to_datetime(date_hdr)
        date_prefix = msg_date.strftime("%Y-%m-%d")
    except (TypeError, ValueError, OverflowError):
        date_prefix = datetime.now().strftime("%Y-%m-%d")

    slug = slugify(subject)
    eml_name = f"{date_prefix}_{slug}_{uid}.eml"
    eml_path = INBOX_EMAILS / eml_name
    saved: list[str] = []

    if dry_run:
        saved.append(f"[dry-run] would save {eml_path}")
    else:
        INBOX_EMAILS.mkdir(parents=True, exist_ok=True)
        eml_path.write_bytes(raw)
        saved.append(str(eml_path.relative_to(ROOT)))

    show_folder = guess_show_folder(subject, from_addr)

    if msg.is_multipart():
        att_idx = 0
        for part in msg.walk():
            if part.get_content_maintype() == "multipart":
                continue
            disp = (part.get("Content-Disposition") or "").lower()
            if "attachment" not in disp and part.get_filename() is None:
                continue
            att_idx += 1
            filename = decode_mime_header(part.get_filename()) or f"attachment-{att_idx}"
            is_pdf = filename.lower().endswith(".pdf")
            if is_pdf and show_folder:
                dest_dir = INBOX_PACKAGES / show_folder
            else:
                dest_dir = INBOX_ATTACHMENTS

            if dry_run:
                saved.append(f"[dry-run] would save attachment → {dest_dir / filename}")
            else:
                path = save_attachment(part, dest_dir, f"attachment-{att_idx}")
                if path:
                    saved.append(str(path.relative_to(ROOT)))

    return saved


def poll_once(dry_run: bool = False) -> int:
    processed = load_state()
    client = connect_imap()
    try:
        status, data = client.uid("search", None, "UNSEEN")
        if status != "OK":
            print("Search failed")
            return 0

        uids = data[0].split() if data[0] else []
        if not uids:
            print("No new messages.")
            return 0

        count = 0
        for uid_b in uids:
            uid = uid_b.decode()
            uid_key = f"{env('IMAP_USER')}:{uid}"
            if uid_key in processed:
                continue

            status, fetched = client.uid("fetch", uid_b, "(RFC822)")
            if status != "OK" or not fetched or not fetched[0]:
                continue

            raw = fetched[0][1]
            if not isinstance(raw, bytes):
                continue

            paths = process_message(raw, uid, dry_run)
            for p in paths:
                print(f"  + {p}")
            count += 1

            if not dry_run:
                processed.add(uid_key)
                client.uid("store", uid_b, "+FLAGS", "\\Seen")

        if not dry_run:
            save_state(processed)
        print(f"Processed {count} message(s).")
        return count
    finally:
        try:
            client.logout()
        except imaplib.IMAP4.error:
            pass


def watch(interval: int, dry_run: bool) -> None:
    print(f"Watching inbox every {interval}s — Ctrl+C to stop")
    while True:
        try:
            poll_once(dry_run=dry_run)
        except KeyboardInterrupt:
            print("\nStopped.")
            return
        except Exception as exc:  # noqa: BLE001 — keep daemon alive
            print(f"Error: {exc}", file=sys.stderr)
        time.sleep(interval)


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(description="Ingest trade show emails into inbox/")
    parser.add_argument("--watch", action="store_true", help="Poll continuously")
    parser.add_argument("--dry-run", action="store_true", help="Show actions without saving")
    args = parser.parse_args()

    interval = int(env("POLL_INTERVAL_SECONDS", "300"))
    if args.watch:
        watch(interval, args.dry_run)
    else:
        poll_once(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
