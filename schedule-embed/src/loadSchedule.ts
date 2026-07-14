import {expandScheduleShows, SCHEDULE_MAX_WINDOW_MONTHS, type ScheduleData, type ScheduleShow} from './types'

const PROJECT_ID = import.meta.env.VITE_SANITY_PROJECT_ID as string | undefined
const DATASET = (import.meta.env.VITE_SANITY_DATASET as string | undefined) || 'production'
const API_VERSION = '2025-01-01'

interface SanityTradeShow {
  _id: string
  title: string
  slug?: {current?: string} | null
  tag?: string | null
  start: string
  end: string
  city: string
  booth?: string | null
  venue: string
  address?: string | null
  url?: string | null
  boothMap?: string | null
  kind?: 'tradeShow' | 'eod' | null
  repeatAnnually?: boolean | null
  imageUrl?: string | null
  imageUrlFromAsset?: string | null
  accent?: string | null
  description?: string | null
  published?: boolean | null
}

interface SanitySettings {
  title?: string | null
  year?: number | null
}

function mapShow(doc: SanityTradeShow): ScheduleShow {
  return {
    id: doc.slug?.current || doc._id.replace(/^tradeshow-/, '').replace(/^tradeShow\./, ''),
    title: doc.title,
    kind: doc.kind === 'eod' ? 'eod' : 'tradeShow',
    tag: doc.tag || 'TRADE SHOW',
    start: doc.start,
    end: doc.end,
    city: doc.city,
    booth: doc.booth || null,
    venue: doc.venue,
    address: doc.address || null,
    url: doc.url || null,
    boothMap: doc.boothMap || null,
    image: doc.imageUrlFromAsset || doc.imageUrl || '',
    accent: doc.accent || '#152438',
    description: doc.description || null,
    published: doc.published !== false,
    repeatAnnually: doc.kind === 'eod' ? doc.repeatAnnually !== false : Boolean(doc.repeatAnnually),
  }
}

async function fetchSanitySchedule(): Promise<ScheduleData | null> {
  if (!PROJECT_ID) return null

  const showsQuery = encodeURIComponent(
    `*[_type == "tradeShow" && published != false] | order(start asc) {
      _id, title, slug, kind, tag, start, end, city, booth, venue, address, url, boothMap,
      repeatAnnually, imageUrl, "imageUrlFromAsset": image.asset->url, accent, description, published
    }`,
  )
  const settingsQuery = encodeURIComponent(
    `*[_type == "scheduleSettings"][0]{ title, year }`,
  )

  const base = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}`

  const [showsRes, settingsRes] = await Promise.all([
    fetch(`${base}?query=${showsQuery}`),
    fetch(`${base}?query=${settingsQuery}`),
  ])

  if (!showsRes.ok) throw new Error(`Sanity shows failed (${showsRes.status})`)

  const showsJson = (await showsRes.json()) as {result: SanityTradeShow[]}
  const settingsJson = settingsRes.ok
    ? ((await settingsRes.json()) as {result: SanitySettings | null})
    : {result: null}

  const shows = (showsJson.result || []).map(mapShow).filter((s) => s.image)
  const settings = settingsJson.result

  return {
    year: settings?.year || new Date().getFullYear(),
    lastUpdated: new Date().toISOString().slice(0, 10),
    title: settings?.title || 'Trade Shows',
    shows,
  }
}

async function fetchJsonFallback(): Promise<ScheduleData> {
  const r = await fetch('./schedule.json')
  if (!r.ok) throw new Error(`Failed to load schedule (${r.status})`)
  return r.json()
}

/** Overlay local JSON fields onto Sanity, and include local-only shows. */
async function mergeScheduleOverrides(data: ScheduleData): Promise<ScheduleData> {
  try {
    const fallback = await fetchJsonFallback()
    const byId = new Map(fallback.shows.map((s) => [s.id, s]))
    const seen = new Set<string>()

    const merged: ScheduleShow[] = data.shows.map((show) => {
      seen.add(show.id)
      const local = byId.get(show.id)
      if (!local) return show
      return {
        ...show,
        boothMap: show.boothMap || local.boothMap || null,
        booth: show.booth || local.booth || null,
        accent: local.lockAccent ? local.accent : show.accent || local.accent,
        lockAccent: Boolean(local.lockAccent || show.lockAccent),
        // Prefer optimized local assets from schedule.json
        image: local.image?.startsWith("/") ? local.image : show.image || local.image,
        description: local.description || show.description,
        url: show.url || local.url || null,
        address: show.address || local.address || null,
      }
    })

    // schedule.json is ahead of Sanity for new shows (e.g. Crop Expo)
    for (const local of fallback.shows) {
      if (seen.has(local.id) || local.published === false) continue
      merged.push(local)
      seen.add(local.id)
    }

    return {
      ...data,
      title: data.title || fallback.title,
      year: data.year || fallback.year,
      shows: merged,
    }
  } catch {
    return data
  }
}

/** Prefer live Sanity; fall back to bundled schedule.json. Expands annual discounts. */
export async function loadSchedule(): Promise<ScheduleData> {
  let data: ScheduleData
  try {
    const fromSanity = await fetchSanitySchedule()
    if (fromSanity && fromSanity.shows.length > 0) data = fromSanity
    else data = await fetchJsonFallback()
  } catch (err) {
    console.warn('Sanity schedule unavailable, using schedule.json', err)
    data = await fetchJsonFallback()
  }
  data = await mergeScheduleOverrides(data)
  return {
    ...data,
    shows: expandScheduleShows(data.shows, undefined, SCHEDULE_MAX_WINDOW_MONTHS),
  }
}
