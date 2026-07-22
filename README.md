# Jolly Farmer Trade Show Command Center — 2026

Never miss an exhibitor deadline again. This project gives you:

1. **Visual command center** — filter by owner (Graphics, Debbie, Michael, Peter…)
2. **Email inbox** — drag emails from Apple Mail into `inbox/emails/`
3. **Master spreadsheet import** — `Trade Show Master 2026.xlsx` tab-by-tab with **WHO'S RESPONSIBLE**
4. **Owner mapping** — spreadsheet `Elisabeth` → Graphics or Debbie per task section (June 2026 handoff)

## Get started

### 1. Spreadsheet (live SharePoint → import)

Live workbook (Sales Team SharePoint): shared with the team in Microsoft 365.

Pull the latest file (device-code login once with your JF account), then import:

```bash
python3 -m pip install -r requirements.txt
python3 scripts/pull_master_sheet.py --import
# or pull + refresh command-center data:
python3 scripts/pull_master_sheet.py --import --generate
```

Offline / already-downloaded fallback:

```bash
python3 scripts/import_spreadsheet.py
# or: python3 scripts/import_spreadsheet.py path/to/Trade\ Show\ Master\ 2026.xlsx
```

### 2. Drop emails from Apple Mail

Drag messages into `inbox/emails/`, then say: *"Review inbox and update shows.json"*

### 3. Open the command center

**Live link (share with team):**  
**https://jolly-farmer.github.io/trade-shows/**

Repo: https://github.com/Jolly-Farmer/trade-shows

**Local web app:**

```bash
cd web && npm install && npm run dev
```

**Cursor canvas** (full IDE experience with agent integration):  
`trade-show-command-center.canvas.tsx` in your Cursor project canvases folder.

Regenerate canvas + web data after spreadsheet edits:

```bash
python3 scripts/import_spreadsheet.py
python3 scripts/generate_canvas.py
cd web && npm run build
```

## Who owns what (current team)

| Owner | Responsibility |
|-------|----------------|
| **Graphics** | Booth registration/payment, COI, electric, accessories, freight admin, artroom design & booth graphics |
| **Debbie** | Personnel registration, hotels, flights, transport, petty cash & credit cards |
| **Michael** | Truck shipping — departure, arrival, pickup |
| **Peter** | Sales staff, plant booking, post-show review |
| **Mailroom** | Contact books, literature |

Each task in `data/shows.json` has both `ownerSpreadsheet` (original) and `owner` (current).

## Public website schedule (WordPress embed)

Replace the Elfsight module with our card grid. Content is edited in **Sanity** (manual or AI); the widget is hosted on **Vercel** under Darrow Design.

| | |
|--|--|
| **Sanity Studio** | https://jf-trade-shows.sanity.studio |
| **Project ID** | `9pylg5jc` (not CoinFund) |
| **Embed app** | [`schedule-embed/`](schedule-embed/) |
| **Card images** | Sanity CDN (`cdn.sanity.io`) — migrate with `cd sanity && npm run upload-images` |

```html
<!-- Jolly Farmer Trade Shows -->
<script src="https://jf-trade-shows.vercel.app/embed.js" async></script>
<div class="jf-trade-shows" data-jf-lazy data-jf-view="all"></div>
```

Details: [`schedule-embed/README.md`](schedule-embed/README.md) · [`sanity/README.md`](sanity/README.md)

## 2026 show schedule (from spreadsheet)

| Show | Dates | Open tasks |
|------|-------|------------|
| Cultivate | Jul 12–14 | Freight Jul 8, unload Jul 10 |
| GCC & Expo | Aug 18–20, Nashville | COI, booth setup, freight |
| CGC | Oct 7–8, Niagara Falls | Hotel book by July |
| Green Industry | Nov 18–19, Red Deer | COI, electric, freight |
| Québec Vert | Nov 18–20 | **COI due Sept 1** |
| HortEast | Nov 24–25, Moncton | Van transport |
| GSHE (Gulf States) | Jan 7–8, 2027 | Update exhibitor profile |
| MANTS | Jan 13–15, 2027 | Everything except reg/payment |
| Crop Expo | TBD, Manheim PA | Not started |
| ~~GCS~~ | — | Not attending |

