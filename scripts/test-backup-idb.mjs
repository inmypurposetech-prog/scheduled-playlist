/**
 * Browser smoke test for IndexedDB replaceLibraryData semantics.
 * Serves a tiny page, opens it in headless Chrome, collects POST /result.
 *
 * Run: node scripts/test-backup-idb.mjs
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'

const html = `<!doctype html>
<html><body><pre id="out">running</pre>
<script type="module">
import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8.0.2/+esm'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType || 'audio/mpeg' })
}

async function getDb() {
  return openDB('practice-day-test', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true })
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

async function replaceLibraryData({ tracks, playlists, reminders }) {
  const db = await getDb()
  const tx = db.transaction(['tracks', 'playlists', 'settings'], 'readwrite')
  await tx.objectStore('tracks').clear()
  await tx.objectStore('playlists').clear()
  for (const track of tracks) await tx.objectStore('tracks').put(track)
  const byDay = Object.fromEntries((playlists || []).map((p) => [p.day, p.trackIds || []]))
  for (const day of DAYS) {
    await tx.objectStore('playlists').put({ day, trackIds: byDay[day] || [] })
  }
  if (reminders != null) {
    await tx.objectStore('settings').put({ key: 'reminders', value: reminders })
  }
  await tx.done
}

try {
  const db0 = await getDb()
  await db0.put('tracks', { id: 1, name: 'old', lesson: 'x', blob: new Blob(['old']), mimeType: 'audio/mpeg', createdAt: 1 })
  await db0.put('playlists', { day: 'Monday', trackIds: [1] })

  const sample = new Uint8Array([10, 20, 30, 40, 50])
  const data = arrayBufferToBase64(sample.buffer)
  await replaceLibraryData({
    tracks: [{
      id: 42,
      name: 'Sirens',
      lesson: 'Lesson 1',
      mimeType: 'audio/mpeg',
      createdAt: 123,
      blob: base64ToBlob(data, 'audio/mpeg'),
    }],
    playlists: [{ day: 'Tuesday', trackIds: [42] }],
    reminders: { enabled: true, time: '07:15', message: 'Practice?' },
  })

  const db = await getDb()
  const tracks = await db.getAll('tracks')
  const tuesday = await db.get('playlists', 'Tuesday')
  const monday = await db.get('playlists', 'Monday')
  const reminders = await db.get('settings', 'reminders')
  const restored = [...new Uint8Array(await tracks[0].blob.arrayBuffer())]

  const result = {
    ok: true,
    trackCount: tracks.length,
    trackId: tracks[0]?.id,
    trackName: tracks[0]?.name,
    tuesdayIds: tuesday?.trackIds,
    mondayIds: monday?.trackIds,
    reminderTime: reminders?.value?.time,
    bytes: restored,
  }
  document.getElementById('out').textContent = JSON.stringify(result)
  await fetch('/result', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(result),
  })
} catch (err) {
  const result = { ok: false, error: String(err && err.stack || err) }
  document.getElementById('out').textContent = JSON.stringify(result)
  await fetch('/result', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(result),
  })
}
</script>
</body></html>`

let chromeProc = null

const result = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    reject(new Error('Timed out waiting for browser result'))
  }, 25000)

  const server = createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/result') {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const body = Buffer.concat(chunks).toString('utf8')
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('ok')
      clearTimeout(timer)
      server.close()
      resolve(JSON.parse(body))
      return
    }
    res.writeHead(200, {
      'content-type': 'text/html',
      'cache-control': 'no-store',
    })
    res.end(html)
  })

  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address()
    const url = `http://127.0.0.1:${port}/`
    const userDataDir = `/tmp/practice-day-chrome-${Date.now()}`
    chromeProc = spawn(
      'google-chrome',
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        `--user-data-dir=${userDataDir}`,
        url,
      ],
      { stdio: 'ignore' },
    )
  })
}).finally(() => {
  if (chromeProc) {
    try {
      chromeProc.kill('SIGKILL')
    } catch {}
  }
})

assert.equal(result.ok, true, result.error)
assert.equal(result.trackCount, 1)
assert.equal(result.trackId, 42)
assert.equal(result.trackName, 'Sirens')
assert.deepEqual(result.tuesdayIds, [42])
assert.deepEqual(result.mondayIds, [])
assert.equal(result.reminderTime, '07:15')
assert.deepEqual(result.bytes, [10, 20, 30, 40, 50])
console.log('ok - IndexedDB replaceLibraryData round-trip')
console.log('All backup idb tests passed')
