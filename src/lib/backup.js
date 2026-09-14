import {
  getAllPlaylists,
  getSetting,
  listTracks,
  replaceLibraryData,
} from './db'
import {
  BACKUP_KIND,
  BACKUP_VERSION,
  backupFilename,
  base64ToBlob,
  blobToBase64,
  formatBytes,
  parseBackup,
} from './backupFormat'

export {
  BACKUP_KIND,
  BACKUP_VERSION,
  backupFilename,
  formatBytes,
  parseBackup,
} from './backupFormat'

export async function buildBackupPayload() {
  const [tracks, playlists, reminders] = await Promise.all([
    listTracks(),
    getAllPlaylists(),
    getSetting('reminders', null),
  ])

  const serializedTracks = []
  for (const track of tracks) {
    serializedTracks.push({
      id: track.id,
      name: track.name,
      lesson: track.lesson || 'Uncategorized',
      mimeType: track.mimeType || track.blob?.type || 'audio/mpeg',
      createdAt: track.createdAt || Date.now(),
      data: await blobToBase64(track.blob),
    })
  }

  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tracks: serializedTracks,
    playlists: playlists.map((p) => ({
      day: p.day,
      trackIds: [...(p.trackIds || [])],
    })),
    settings: {
      reminders,
    },
  }
}

export function downloadBackupJson(payload, filename = backupFilename()) {
  const json = JSON.stringify(payload)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
  return { byteLength: blob.size, filename }
}

export async function readBackupFile(file) {
  const text = await file.text()
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Could not read backup file (invalid JSON)' }
  }
  return parseBackup(raw)
}

/**
 * Replace all local library data with a validated backup.
 */
export async function restoreBackup(backup) {
  const tracks = backup.tracks.map((track) => ({
    id: track.id,
    name: track.name,
    lesson: track.lesson,
    mimeType: track.mimeType,
    createdAt: track.createdAt,
    blob: base64ToBlob(track.data, track.mimeType),
  }))

  await replaceLibraryData({
    tracks,
    playlists: backup.playlists,
    reminders: backup.settings?.reminders ?? null,
  })

  return {
    trackCount: tracks.length,
    playlistDays: backup.playlists.filter((p) => (p.trackIds || []).length > 0).length,
  }
}
