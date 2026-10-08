import { lessonForStorage } from './lessonLabel.js'
import { clampPlaybackRate } from './playbackRate.js'

export const BACKUP_KIND = 'practice-day-backup'
export const BACKUP_VERSION = 1

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

export function base64ToUint8Array(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function base64ToBlob(base64, mimeType) {
  return new Blob([base64ToUint8Array(base64)], {
    type: mimeType || 'application/octet-stream',
  })
}

export async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer()
  return arrayBufferToBase64(buffer)
}

/**
 * Validate and normalize a parsed backup object.
 * Returns { ok: true, backup } or { ok: false, error }.
 */
export function parseBackup(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Backup file is not valid JSON' }
  }
  if (raw.kind !== BACKUP_KIND) {
    return { ok: false, error: 'This file is not a Practice Day backup' }
  }
  if (raw.version !== BACKUP_VERSION) {
    return { ok: false, error: `Unsupported backup version (${raw.version ?? 'unknown'})` }
  }
  if (!Array.isArray(raw.tracks)) {
    return { ok: false, error: 'Backup is missing tracks' }
  }
  if (!Array.isArray(raw.playlists)) {
    return { ok: false, error: 'Backup is missing playlists' }
  }

  for (const [index, track] of raw.tracks.entries()) {
    if (!track || typeof track !== 'object') {
      return { ok: false, error: `Track ${index + 1} is invalid` }
    }
    if (typeof track.id !== 'number' || !Number.isFinite(track.id)) {
      return { ok: false, error: `Track ${index + 1} is missing an id` }
    }
    if (typeof track.data !== 'string' || !track.data) {
      return { ok: false, error: `Track “${track.name || index + 1}” is missing audio data` }
    }
    if (typeof track.name !== 'string' || !track.name.trim()) {
      return { ok: false, error: `Track ${index + 1} is missing a name` }
    }
  }

  const playlists = DAYS.map((day) => {
    const found = raw.playlists.find((p) => p && p.day === day)
    const trackIds = Array.isArray(found?.trackIds)
      ? found.trackIds.filter((id) => typeof id === 'number')
      : []
    return { day, trackIds }
  })

  const reminders =
    raw.settings && typeof raw.settings === 'object' && raw.settings.reminders
      ? raw.settings.reminders
      : null

  return {
    ok: true,
    backup: {
      kind: BACKUP_KIND,
      version: BACKUP_VERSION,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null,
      tracks: raw.tracks.map((track) => ({
        id: track.id,
        name: track.name.trim(),
        lesson: lessonForStorage(track.lesson),
        mimeType:
          typeof track.mimeType === 'string' && track.mimeType
            ? track.mimeType
            : 'audio/mpeg',
        createdAt:
          typeof track.createdAt === 'number' && Number.isFinite(track.createdAt)
            ? track.createdAt
            : Date.now(),
        ...(typeof track.playbackRate === 'number' && Number.isFinite(track.playbackRate)
          ? { playbackRate: clampPlaybackRate(track.playbackRate) }
          : {}),
        data: track.data,
      })),
      playlists,
      settings: { reminders },
    },
  }
}

export function backupFilename(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10)
  return `practice-day-backup-${stamp}.json`
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
