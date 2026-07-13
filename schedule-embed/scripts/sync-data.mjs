import {copyFileSync, existsSync, mkdirSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, '../data/public-schedule.json')
const dest = join(root, 'public/schedule.json')

mkdirSync(dirname(dest), {recursive: true})

if (existsSync(src)) {
  copyFileSync(src, dest)
  console.log('Synced public-schedule.json → public/schedule.json')
} else if (existsSync(dest)) {
  console.log('Using existing public/schedule.json (repo root data/ not in this deploy)')
} else {
  console.error('No schedule data found at', src, 'or', dest)
  process.exit(1)
}
