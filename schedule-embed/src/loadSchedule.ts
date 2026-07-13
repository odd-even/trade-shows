import type {ScheduleData, ScheduleShow} from './types'

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
    id: doc.slug?.current || doc._id.replace(/^tradeShow\./, ''),
    title: doc.title,
    tag: doc.tag || 'TRADE SHOW',
    start: doc.start,
    end: doc.end,
    city: doc.city,
    booth: doc.booth || null,
    venue: doc.venue,
    address: doc.address || null,
    url: doc.url || null,
    image: doc.imageUrlFromAsset || doc.imageUrl || '',
    accent: doc.accent || '#152438',
    description: doc.description || null,
    published: doc.published !== false,
  }
}

async function fetchSanitySchedule(): Promise<ScheduleData | null> {
  if (!PROJECT_ID) return null

  const showsQuery = encodeURIComponent(
    `*[_type == "tradeShow" && published != false] | order(start asc) {
      _id, title, slug, tag, start, end, city, booth, venue, address, url,
      imageUrl, "imageUrlFromAsset": image.asset->url, accent, description, published
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

/** Prefer live Sanity; fall back to bundled schedule.json. */
export async function loadSchedule(): Promise<ScheduleData> {
  try {
    const fromSanity = await fetchSanitySchedule()
    if (fromSanity && fromSanity.shows.length > 0) return fromSanity
  } catch (err) {
    console.warn('Sanity schedule unavailable, using schedule.json', err)
  }
  return fetchJsonFallback()
}
