# Practice Day

Schedule any vocal exercise downloads into weekday playlists, open today’s queue in one tap, and get a gentle “Are you ready for your vocal practice?” prompt.

## What it does

- **Library** — Import local audio files (MP3, M4A, WAV, …). Files stay in your browser via IndexedDB; nothing is uploaded.
- **Schedule** — Build Monday–Sunday playlists by mixing exercises from different lessons. Copy any day’s playlist into today (or into another weekday).
- **Today** — Play the current day’s queue with previous / play / next and a track list. See **Exercise N of M** plus time remaining so you can stop mid-session without losing your place. Switch to **Yesterday** to play that weekday’s queue without changing today’s schedule, or copy yesterday into today when today’s list is empty.
- **Reminders** — Set a daily time. While the app tab is open, you get an in-app ready prompt (and a browser notification if allowed). Yes opens Today; No dismisses for now.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build
npm run preview
```

## Deploy on Vercel

This app is a static Vite PWA. On [Vercel](https://vercel.com):

1. **Add New Project** → import `inmypurposetech-prog/scheduled-playlist`
2. Keep the defaults (Framework: Vite, build `npm run build`, output `dist`)
3. Deploy

After that, every push to `main` publishes a new version automatically.

### Use it on iPhone (you + family)

1. Open the Vercel URL in **Safari**
2. Tap **Share → Add to Home Screen**
3. Import your lesson audio in **Library**, then build weekday playlists in **Schedule**

Each person’s audio and playlists stay on their own phone. Nothing is uploaded or shared between devices.

### Don’t see a new update after deploy?

This app is a PWA, so Safari / Home Screen can keep an old cached copy. Try:

1. Open the site in **Safari** (not only the Home Screen icon)
2. Tap **aA → Website Settings → Clear Website Data** (or clear cache for the site)
3. Reload, wait a few seconds, then reopen the Home Screen app

New versions also check for updates when you return to the tab.

## Suggested flow

1. Import your downloaded lesson exercises in **Library** (rename / assign lesson labels if you like).
2. In **Schedule**, add tracks to each weekday. Drag the ⋮⋮ handle to reorder, use **Sort by** to order a whole day at once, or keep the ↑↓ buttons for small tweaks. Use **Copy to today** or **Copy from** to reuse a whole day’s playlist.
3. In **Settings**, pick a reminder time, allow notifications, and save. Optionally **Export backup** so you can restore later.
4. Keep the tab open (or install as a PWA from the browser) so the reminder can fire.
5. When prompted, choose **Yes, I'm ready** and press Play. On the Today tab you can also switch to **Yesterday** to rehearse that queue, or copy it into today.

## Privacy

Audio and playlists are stored only in this browser profile on your device. Clearing site data removes them — use **Settings → Export backup** first if you want a recoverable copy.

## Backup & restore

1. Open **Settings**
2. Tap **Export backup** to download a `.json` file with your audio, weekday playlists, and reminder settings
3. Keep that file somewhere safe (Files / iCloud Drive / email)
4. On a new device (or after clearing site data), open Practice Day → **Settings → Restore backup** and choose the file

Restore **replaces** everything currently in that browser. Files still never leave your devices unless you choose to save or share the backup yourself.
