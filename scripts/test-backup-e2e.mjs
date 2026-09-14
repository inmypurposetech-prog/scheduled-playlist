/**
 * End-to-end UI smoke: import audio → export backup → wipe → restore.
 * Requires preview server at BASE_URL (default http://127.0.0.1:4173).
 *
 * Run: node scripts/test-backup-e2e.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { execSync } from 'node:child_process'

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    // Prefer an npx-installed copy when playwright is not a project dependency.
    const require = createRequire(import.meta.url)
    try {
      const resolved = require.resolve('playwright/package.json', {
        paths: [
          path.join(os.homedir(), '.npm/_npx'),
          '/home/ubuntu/.npm/_npx/fd3bca3c548369c0/node_modules',
        ],
      })
      return await import(pathToFileURL(path.join(path.dirname(resolved), 'index.mjs')).href)
    } catch {
      const npxRoot = execSync('ls -d /home/ubuntu/.npm/_npx/*/node_modules/playwright 2>/dev/null | head -1', {
        encoding: 'utf8',
      }).trim()
      if (!npxRoot) throw new Error('Install playwright (npx playwright) to run this e2e script')
      return await import(pathToFileURL(path.join(npxRoot, 'index.mjs')).href)
    }
  }
}

const { chromium } = await loadPlaywright()

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173'
const audioDir = '/tmp/practice-audio'
const files = [
  path.join(audioDir, 'Lesson1-sirens.wav'),
  path.join(audioDir, 'Lesson1-scales.wav'),
  path.join(audioDir, 'Lesson2-warmup.wav'),
]
for (const f of files) assert.ok(fs.existsSync(f), `missing ${f}`)

const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-backup-'))
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ acceptDownloads: true })
const page = await context.newPage()

await page.goto(BASE_URL, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Library', exact: true }).click()

await page.locator('.dropzone input[type="file"]').setInputFiles(files)
await page.getByText('Added 3 tracks').waitFor({ timeout: 15000 })

await page.getByRole('button', { name: 'Settings', exact: true }).click()
await page.getByRole('heading', { name: 'Backup & restore' }).waitFor()
await page.getByText('Library now: 3 tracks').waitFor()

const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: 'Export backup' }).click(),
])
await page.getByText(/Exported 3 tracks/).waitFor({ timeout: 10000 })
const backupPath = path.join(downloadDir, await download.suggestedFilename())
await download.saveAs(backupPath)
assert.ok(fs.statSync(backupPath).size > 500, 'backup file too small')

const raw = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
assert.equal(raw.kind, 'practice-day-backup')
assert.equal(raw.tracks.length, 3)

await page.getByRole('button', { name: 'Library', exact: true }).click()
while ((await page.getByRole('button', { name: 'Remove' }).count()) > 0) {
  await page.getByRole('button', { name: 'Remove' }).first().click()
  await page.getByText('Track removed').waitFor({ timeout: 5000 })
  await page.waitForTimeout(300)
}

await page.getByRole('button', { name: 'Settings', exact: true }).click()
await page.getByText('Library now: 0 tracks').waitFor()

page.once('dialog', async (dialog) => {
  await dialog.accept()
})
await page.locator('input[type="file"][accept*="json"]').setInputFiles(backupPath)
await page.getByText(/Restored 3 tracks/).waitFor({ timeout: 20000 })

await page.getByRole('button', { name: 'Library', exact: true }).click()
await page.getByText('Lesson1-sirens').waitFor({ timeout: 10000 })
await page.getByText('Lesson1-scales').waitFor()
await page.getByText('Lesson2-warmup').waitFor()

console.log('ok - UI export/import round-trip')
console.log(`backup: ${backupPath} (${fs.statSync(backupPath).size} bytes)`)

// Keep a copy for artifacts
fs.mkdirSync('/opt/cursor/artifacts', { recursive: true })
const artifactBackup = '/opt/cursor/artifacts/practice_day_backup_sample.json'
fs.copyFileSync(backupPath, artifactBackup)
console.log(`artifact: ${artifactBackup}`)

await browser.close()
