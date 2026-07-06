# Trade Show Inbox — How to feed emails & packages to Cursor

This folder is your **single intake point** for anything show-related that you want the agent to review.

## Quick workflow

1. **Save or forward** exhibitor emails, manuals, and invoices into the folders below.
2. **Open Cursor** in this `Trade Shows` project.
3. Start a chat and say: *"Review everything new in `inbox/` and update my command center."*
4. Or use the **Ask in chat** button on the [Trade Show Command Center canvas](/Users/ernest/.cursor/projects/Users-ernest-Documents-GitHub-JF-Trade-Shows/canvases/trade-show-command-center.canvas.tsx).

## Folder layout

| Folder | What goes here |
|--------|----------------|
| `emails/` | `.eml`, `.msg`, or `.txt` copies of organizer emails |
| `packages/` | Exhibitor manuals, service kits, floor plans (PDF) — one subfolder per show |
| `attachments/` | Loose files from emails (COI templates, badge forms, etc.) |

### Naming convention (recommended)

```
emails/2026-07-01_cultivate_badge-registration-deadline.eml
packages/mants-2027/MANTS-2027-Exhibitor-Manual.pdf
packages/cultivate-2026/Exhibitor-Service-Kit.pdf
```

## How to get emails into `inbox/`

### Option A — Dedicated email address (recommended)

Forward exhibitor emails to **`tradeshows@jollyfarmer.com`** (ask IT to create this shared mailbox).

Full setup: [docs/email-address-setup.md](../docs/email-address-setup.md)

- **Microsoft 365 + Power Automate:** saves `.eml` + PDF attachments to SharePoint `inbox/` automatically (24/7)
- **DIY on your Mac:** `cp .env.example .env` → fill in IMAP credentials → `python scripts/email_ingest.py --watch`

### Option B — Drag & drop from Apple Mail (manual)

1. In **Mail**, select the message(s)
2. Drag them into `inbox/emails/` in Finder (saves as `.eml`)
3. In Cursor, say: *"Review everything new in inbox/"*

You can also drag PDF attachments directly into `inbox/packages/[show-name]/`.

### Option C — Outlook rule (auto-forward)

Create a rule: *When message arrives from `@mants.com` OR `@cultivateevent.org` OR contains "exhibitor" in subject* → **forward to** `tradeshows@jollyfarmer.com`.

### Option D — Paste in chat

For one-off items, paste the email body in Cursor chat and attach PDFs with `@inbox/packages/...`.

## SharePoint master spreadsheet

Export **Trade Show Master 2025.xlsx** from SharePoint and save it as:

```
source/Trade Show Master 2025.xlsx
```

Then ask Cursor: *"Import the spreadsheet and refresh the command center."*

The import script reads every tab as a separate show.

## What the agent will do with inbox items

- Extract deadlines (badge registration, utilities, freight, hotel, COI)
- Cross-check against the master checklist so nothing is missed
- Flag overdue or due-soon items on the command center canvas
- Update `data/shows.json` with new tasks and dates
