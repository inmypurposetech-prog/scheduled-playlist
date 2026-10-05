import { openDB } from 'idb'
import { lessonForStorage } from './lessonLabel'
import { clampPlaybackRate } from './playbackRate'

const DB_NAME = 'practice-day'
// Version 3 creates the practice-log store. A version 2 database can exist
// without that store if an earlier upgrade ran before the store was added.
const DB_VERSION = 3

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
      if (!db.objectStoreNames.contains('logs')) {
        db.createObjectStore('logs', { keyPath: 'date' })
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
    lesson: lessonForStorage(lesson),
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

/**
 * Wipe tracks + playlists and write a full library snapshot.
 * Reminder settings are replaced when `reminders` is non-null; otherwise left alone.
 */
export async function replaceLibraryData({ tracks, playlists, reminders = null }) {
  const db = await getDb()
  const tx = db.transaction(['tracks', 'playlists', 'settings'], 'readwrite')
  await tx.objectStore('tracks').clear()
  await tx.objectStore('playlists').clear()

  for (const track of tracks) {
    await tx.objectStore('tracks').put({
      id: track.id,
      name: track.name,
      lesson: lessonForStorage(track.lesson),
      blob: track.blob,
      mimeType: track.mimeType || track.blob?.type || 'audio/mpeg',
      createdAt: track.createdAt || Date.now(),
      ...(track.playbackRate == null ? {} : { playbackRate: clampPlaybackRate(track.playbackRate) }),
    })
  }

  const byDay = Object.fromEntries(
    (playlists || []).map((p) => [p.day, p.trackIds || []]),
  )
  for (const day of DAYS) {
    await tx.objectStore('playlists').put({
      day,
      trackIds: byDay[day] || [],
    })
  }

  if (reminders != null) {
    await tx.objectStore('settings').put({ key: 'reminders', value: reminders })
  }

  await tx.done
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

export async function listPracticeLogs() {
  const db = await getDb()
  const rows = await db.getAll('logs')
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}

export async function savePracticeLog(log) {
  const db = await getDb()
  const date = typeof log?.date === 'string' ? log.date : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Practice log needs a date')
  }
  const exercises = Array.isArray(log.exercises)
    ? log.exercises.map((exercise) => ({
        name: typeof exercise?.name === 'string' ? exercise.name.trim() : '',
        trackId: typeof exercise?.trackId === 'number' ? exercise.trackId : null,
        feeling: typeof exercise?.feeling === 'string' ? exercise.feeling : null,
      }))
    : []
  const next = {
    date,
    time: typeof log.time === 'string' ? log.time : '',
    goals: typeof log.goals === 'string' ? log.goals : '',
    exercises,
    difficult: typeof log.difficult === 'string' ? log.difficult : '',
    stillWorkingOn: typeof log.stillWorkingOn === 'string' ? log.stillWorkingOn : '',
    improvements: typeof log.improvements === 'string' ? log.improvements : '',
    discovered: typeof log.discovered === 'string' ? log.discovered : '',
    nextFocus: typeof log.nextFocus === 'string' ? log.nextFocus : '',
    song: typeof log.song === 'string' ? log.song : '',
    updatedAt: Date.now(),
  }
  await db.put('logs', next)
  return next
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
