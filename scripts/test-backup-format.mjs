import assert from 'node:assert/strict'
import {
  BACKUP_KIND,
  BACKUP_VERSION,
  arrayBufferToBase64,
  backupFilename,
  base64ToUint8Array,
  formatBytes,
  parseBackup,
} from '../src/lib/backupFormat.js'

function pass(name) {
  console.log(`ok - ${name}`)
}

// Node lacks btoa/atob in some older versions; Node 22 has them globally.
assert.equal(typeof btoa, 'function')
assert.equal(typeof atob, 'function')

{
  const bytes = new Uint8Array([1, 2, 3, 250, 255])
  const b64 = arrayBufferToBase64(bytes.buffer)
  const round = base64ToUint8Array(b64)
  assert.deepEqual([...round], [...bytes])
  pass('base64 round-trip')
}

{
  assert.equal(formatBytes(0), '0 B')
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(2048), '2.0 KB')
  assert.equal(formatBytes(2.5 * 1024 * 1024), '2.5 MB')
  pass('formatBytes')
}

{
  assert.equal(backupFilename(new Date('2026-09-14T12:00:00.000Z')), 'practice-day-backup-2026-09-14.json')
  pass('backupFilename')
}

{
  const bad = parseBackup({ hello: 'world' })
  assert.equal(bad.ok, false)
  pass('rejects non-backup JSON')
}

{
  const bad = parseBackup({
    kind: BACKUP_KIND,
    version: 99,
    tracks: [],
    playlists: [],
  })
  assert.equal(bad.ok, false)
  pass('rejects unsupported version')
}

{
  const raw = {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: '2026-09-14T12:00:00.000Z',
    tracks: [
      {
        id: 7,
        name: '  Warmup  ',
        lesson: '',
        mimeType: 'audio/mpeg',
        createdAt: 100,
        data: arrayBufferToBase64(new Uint8Array([9, 8, 7]).buffer),
      },
    ],
    playlists: [
      { day: 'Monday', trackIds: [7, 'nope', 7] },
      { day: 'Friday', trackIds: [7] },
    ],
    settings: {
      reminders: { enabled: true, time: '08:30', message: 'Ready?' },
    },
  }
  const parsed = parseBackup(raw)
  assert.equal(parsed.ok, true)
  assert.equal(parsed.backup.tracks[0].name, 'Warmup')
  assert.equal(parsed.backup.tracks[0].lesson, 'Uncategorized')
  assert.equal(parsed.backup.playlists.find((p) => p.day === 'Monday').trackIds.length, 2)
  assert.deepEqual(
    parsed.backup.playlists.find((p) => p.day === 'Monday').trackIds,
    [7, 7],
  )
  assert.deepEqual(
    parsed.backup.playlists.find((p) => p.day === 'Wednesday').trackIds,
    [],
  )
  assert.equal(parsed.backup.settings.reminders.time, '08:30')
  pass('normalizes valid backup')
}

{
  const missingAudio = parseBackup({
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    tracks: [{ id: 1, name: 'x', data: '' }],
    playlists: [],
  })
  assert.equal(missingAudio.ok, false)
  pass('rejects missing audio data')
}

console.log('All backupFormat tests passed')
