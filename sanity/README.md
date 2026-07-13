# Jolly Farmer Trade Shows — Sanity CMS

Edit the public schedule here (manual or with AI), then the Vercel embed reads live from Sanity.

| | |
|--|--|
| **Project** | Jolly Farmer Trade Shows |
| **Project ID** | `9pylg5jc` |
| **Dataset** | `production` |
| **Studio (local)** | `npm run dev` → http://localhost:3333 |
| **Studio (hosted)** | after `npm run deploy` → https://jf-trade-shows.sanity.studio |

## Manual updates

1. Open Studio (local or hosted).
2. Edit a **Trade Show** (title, dates, booth, venue, image URL, description, published).
3. Publish. The embed refreshes within ~60s (CDN).

Hide a show: uncheck **Published** (no delete needed).

## AI updates

Give an AI this context (or point it at this folder):

```
Sanity project 9pylg5jc / dataset production
Document type: tradeShow
Stable ids: tradeshow-<slug>  (e.g. tradeshow-cultivate)
Fields: title, slug.current, start, end, city, booth, venue, address, url,
        imageUrl, accent, description, published
Settings doc: scheduleSettings (title, year)
```

Example mutation prompt:

> Update HortEast booth to 511 and venue to Moncton Coliseum in Sanity project 9pylg5jc (id tradeshow-horteast).

Seed / re-import from Git JSON:

```bash
export SANITY_AUTH_TOKEN=sk...   # Editor token from manage → API
cd sanity && npm run seed
```

## CORS

Add your Vercel domain + `http://localhost:5173` under  
https://www.sanity.io/manage/project/9pylg5jc/api#cors

## Not CoinFund

This project is separate from the CoinFund Sanity project (`mnamkmso`).
