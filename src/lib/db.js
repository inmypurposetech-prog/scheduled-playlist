import { openDB } from 'idb'

const DB_NAME = 'practice-day'
const DB_VERSION = 1

export async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('tracks')) {
        const tracks = db.createObjectStore('tracks', {
          keyPath: 'id',
          autoIncrement: true,
        })
        tracks.createIndex('by-lesson', 'lesson')
      }
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'day' })
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    },
  })
}

export async function listTracks() {
  const db = await getDb()
  return db.getAll('tracks')
}

export async function addTrack({ name, lesson, blob, mimeType }) {
  const db = await getDb()
  const id = await db.add('tracks', {
    name,
    lesson: lesson || 'Uncategorized',
    blob,
    mimeType: mimeType || blob.type || 'audio/mpeg',
    createdAt: Date.now(),
  })
  return id
}

export async function updateTrack(id, updates) {
  const db = await getDb()
  const existing = await db.get('tracks', id)
  if (!existing) return null
  const next = { ...existing, ...updates, id }
  await db.put('tracks', next)
  return next
}

export async function deleteTrack(id) {
  const db = await getDb()
  await db.delete('tracks', id)
  const playlists = await db.getAll('playlists')
  for (const playlist of playlists) {
    const nextIds = (playlist.trackIds || []).filter((tid) => tid !== id)
    if (nextIds.length !== (playlist.trackIds || []).length) {
      await db.put('playlists', { ...playlist, trackIds: nextIds })
    }
  }
}

export async function getPlaylist(day) {
  const db = await getDb()
  return (await db.get('playlists', day)) || { day, trackIds: [] }
}

export async function getAllPlaylists() {
  const db = await getDb()
  const existing = await db.getAll('playlists')
  const byDay = Object.fromEntries(existing.map((p) => [p.day, p]))
  return DAYS.map((day) => byDay[day] || { day, trackIds: [] })
}

export async function setPlaylist(day, trackIds) {
  const db = await getDb()
  await db.put('playlists', { day, trackIds })
}

export async function getSetting(key, fallback = null) {
  const db = await getDb()
  const row = await db.get('settings', key)
  return row ? row.value : fallback
}

export async function setSetting(key, value) {
  const db = await getDb()
  await db.put('settings', { key, value })
}

export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export function todayName(date = new Date()) {
  return DAYS[(date.getDay() + 6) % 7]
}

/** Previous weekday name (calendar yesterday → Mon–Sun template). */
export function yesterdayName(date = new Date()) {
  const idx = (date.getDay() + 6) % 7
  return DAYS[(idx + 6) % 7]
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
