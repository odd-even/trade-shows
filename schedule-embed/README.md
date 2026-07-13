# Public Trade Show Schedule Embed

Elfsight-style card grid for jollyfarmer.com. Content lives in **Sanity** (manual or AI). Deployed on **Vercel** under the Darrow Design team.

## WordPress embed

```html
<!-- All events (tabs: All / Trade Shows / Discount) -->
<script src="https://jf-trade-shows.vercel.app/embed.js" async></script>
<div class="jf-trade-shows" data-jf-lazy data-jf-view="all"></div>
```

Start on a specific tab:

```html
<div class="jf-trade-shows" data-jf-lazy data-jf-view="trade-shows"></div>
<div class="jf-trade-shows" data-jf-lazy data-jf-view="discount"></div>
```

Optional iframe-only:

```html
<iframe
  src="https://jf-trade-shows.vercel.app/embed.html?view=all"
  title="Jolly Farmer Schedule"
  style="width:100%;border:0;min-height:720px"
  loading="lazy"
></iframe>
```

## Update the schedule

One source of truth for **Trade Shows** and **Discounts** (early order / early pay). Cards are tagged; the tab bar filters All / Trade Shows / Discount.

1. Open Studio: https://jf-trade-shows.sanity.studio (or `cd sanity && npm run dev`)
2. Edit a Trade Show → Publish
3. Embed picks it up from the Sanity CDN (usually within a minute)

### With AI

Point the AI at project `9pylg5jc` / dataset `production` and the `tradeShow` schema (see [`../sanity/README.md`](../sanity/README.md)). Same publish flow.

### Fallback JSON

[`data/public-schedule.json`](../data/public-schedule.json) is still bundled as `schedule.json` for offline / CDN failure. Re-seed Sanity from it with `cd sanity && npm run seed`.

## Local

```bash
cp .env.example .env   # already has project id 9pylg5jc
npm install
npm run dev
```

## Deploy (Darrow Design / oddpluseven — not CoinFund)

Live: **https://jf-trade-shows.vercel.app**

```bash
cd schedule-embed
npx vercel --prod --scope darrowdesign
```

Env on the Vercel project:

- `VITE_SANITY_PROJECT_ID=9pylg5jc`
- `VITE_SANITY_DATASET=production`
