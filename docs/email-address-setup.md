# Trade Show Email Address Setup

**Goal:** Forward exhibitor emails to one address → files land in `inbox/` → Cursor processes them.

Cursor cannot receive email directly. You need a **dedicated mailbox** plus a **bridge** that saves messages into this project.

---

## Recommended address

Ask IT to create a shared mailbox or alias:

```
tradeshows@jollyfarmer.com
```

Anyone on the sales team can forward exhibitor emails there. You can also BCC it when replying to show organizers.

---

## Option 1 — Power Automate (best for Jolly Farmer / Microsoft 365)

No local script required. Works even when your Mac is off.

### What IT creates

| Item | Details |
|------|---------|
| Mailbox | `tradeshows@jollyfarmer.com` (shared mailbox) |
| SharePoint folder | e.g. `salesteam/Trade Shows/inbox/` synced via OneDrive |
| Flow | Power Automate (included with M365) |

### Power Automate flow (step by step)

1. Go to [make.powerautomate.com](https://make.powerautomate.com) → **Create** → **Automated cloud flow**.
2. **Trigger:** `When a new email arrives in a shared mailbox (V2)`
   - Mailbox: `tradeshows@jollyfarmer.com`
   - Folder: Inbox
   - Include Attachments: **Yes**
3. **Action:** `Create file` (SharePoint)
   - Site: `salesteam`
   - Folder: `Trade Shows/inbox/emails` (create if needed)
   - File name: `concat(formatDateTime(utcNow(), 'yyyy-MM-dd'), '_', replace(replace(triggerOutputs()?['body/subject'], '/', '-'), ':', '-'), '.eml')`
   - File content: use **Get email (V2)** → MIME content, or save body as `.html` if MIME is unavailable
4. **Apply to each** (attachments from trigger):
   - **Condition:** attachment name ends with `.pdf`
     - **Yes:** `Create file` → `Trade Shows/inbox/packages/general/`
     - **No:** `Create file` → `Trade Shows/inbox/attachments/`
5. Save and turn on the flow.

### OneDrive sync (so Cursor sees files)

On your Mac, sync the SharePoint `salesteam` document library via OneDrive. Point this Cursor workspace at the synced `Trade Shows` folder, or symlink:

```bash
# Example if SharePoint syncs to OneDrive
ln -s "$HOME/OneDrive - Jolly Farmer/salesteam/Trade Shows/inbox" \
  "/Users/ernest/Documents/GitHub/JF/Trade Shows/inbox"
```

### After email arrives

Open Cursor and say:

> Review everything new in `inbox/` and update my command center.

Or click **Review inbox in chat** on the command center canvas.

---

## Option 2 — IMAP poller (DIY, runs on your Mac)

Use this if IT gives you a mailbox but won't set up Power Automate.

### Setup

1. IT creates `tradeshows@jollyfarmer.com` (or use a Gmail you forward to).
2. Enable IMAP on the mailbox.
3. For Microsoft 365, create an **app password** (if MFA is on):
   - [account.microsoft.com](https://account.microsoft.com) → Security → App passwords
4. Copy credentials:

```bash
cp .env.example .env
# Edit .env with IMAP_HOST, IMAP_USER, IMAP_PASSWORD
pip install -r requirements.txt
```

5. Test:

```bash
python scripts/email_ingest.py --dry-run
python scripts/email_ingest.py
```

6. Run in background (polls every 5 minutes):

```bash
python scripts/email_ingest.py --watch
```

### Auto-start on login (Mac)

```bash
# Install the launch agent (edit paths in the plist first if needed)
cp scripts/com.jollyfarmer.tradeshow-email-ingest.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.jollyfarmer.tradeshow-email-ingest.plist
```

### Forwarding from your main inbox

In Outlook, create a rule:

- **When:** message from `@mants.com`, `@cultivateevent.org`, `@americanhort.org`, `@greenindustryshow.com`, OR subject contains "exhibitor"
- **Do:** forward to `tradeshows@jollyfarmer.com`

---

## Option 3 — Gmail bridge (no IT, personal use)

If IT can't help quickly:

1. Create `tradeshows.ingest@gmail.com` (or similar).
2. Forward exhibitor emails there from Outlook.
3. Enable IMAP + [App Password](https://myaccount.google.com/apppasswords) on the Gmail account.
4. Use Option 2 with `IMAP_HOST=imap.gmail.com`.

---

## What gets saved

| Incoming | Saved to |
|----------|----------|
| Full email | `inbox/emails/YYYY-MM-DD_subject_uid.eml` |
| PDF attachments | `inbox/packages/<show-guess>/` (MANTS, Cultivate, etc.) |
| Other attachments | `inbox/attachments/` |

Processed message IDs are tracked in `inbox/.email-state.json` so nothing is duplicated.

---

## Security notes

- **Never commit `.env`** — it contains mailbox credentials.
- Use a **dedicated mailbox**, not your personal login.
- Shared mailboxes let the sales team forward without sharing passwords.

---

## Checklist for IT (copy/paste)

```
Please set up trade show email ingestion:

1. Create shared mailbox: tradeshows@jollyfarmer.com
2. Grant sales team "Send As" or forwarding rights
3. Either:
   A) Power Automate flow: new mail → save .eml + attachments to
      SharePoint salesteam/Trade Shows/inbox/
   OR
   B) Enable IMAP + provide app password for scripts/email_ingest.py

Purpose: Auto-archive exhibitor manuals and deadline emails for our
trade show planning system (Cursor + SharePoint).
```
