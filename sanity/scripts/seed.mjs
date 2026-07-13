#!/usr/bin/env node
/**
 * Seed Sanity from ../data/public-schedule.json
 *
 * Usage:
 *   cd sanity && npm run seed
 *
 * Needs SANITY_AUTH_TOKEN (editor+) or interactive `sanity login`.
 * Create a token: https://www.sanity.io/manage/project/9pylg5jc/api#tokens
 */
import {createClient} from '@sanity/client'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || '9pylg5jc'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2025-01-01',
  useCdn: false,
  token: process.env.SANITY_AUTH_TOKEN,
})

const schedulePath = join(__dirname, '../../data/public-schedule.json')
const schedule = JSON.parse(readFileSync(schedulePath, 'utf8'))

async function main() {
  if (!process.env.SANITY_AUTH_TOKEN) {
    console.error('Set SANITY_AUTH_TOKEN (Editor token) before seeding.')
    console.error('https://www.sanity.io/manage/project/9pylg5jc/api#tokens')
    process.exit(1)
  }

  const tx = client.transaction()

  tx.createOrReplace({
    _id: 'scheduleSettings',
    _type: 'scheduleSettings',
    title: schedule.title || 'Trade Shows',
    year: schedule.year || new Date().getFullYear(),
  })

  for (const show of schedule.shows) {
    // Use dashes — dotted ids (tradeShow.foo) are not publicly queryable.
    const id = `tradeshow-${show.id}`
    tx.createOrReplace({
      _id: id,
      _type: 'tradeShow',
      title: show.title,
      slug: {_type: 'slug', current: show.id},
      tag: show.tag || 'TRADE SHOW',
      start: show.start,
      end: show.end,
      city: show.city,
      booth: show.booth || null,
      venue: show.venue,
      address: show.address || null,
      url: show.url || null,
      imageUrl: show.image,
      accent: show.accent || '#152438',
      description: show.description || null,
      published: show.published !== false,
    })
  }

  const result = await tx.commit({visibility: 'async'})
  console.log(`Seeded ${schedule.shows.length} shows + settings → ${projectId}/${dataset}`)
  console.log(result)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
