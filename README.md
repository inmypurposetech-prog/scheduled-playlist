# Practice Day

Schedule Cheryl Porter (or any) vocal exercise downloads into weekday playlists, open today’s queue in one tap, and get a gentle “Are you ready for your vocal practice?” prompt.

## What it does

- **Library** — Import local audio files (MP3, M4A, WAV, …). Files stay in your browser via IndexedDB; nothing is uploaded.
- **Schedule** — Build Monday–Sunday playlists by mixing exercises from different lessons.
- **Today** — Play the current day’s queue with previous / play / next and a track list.
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

## Suggested flow

1. Import your downloaded lesson exercises in **Library** (rename / assign lesson labels if you like).
2. In **Schedule**, add tracks to each weekday in the order you want to practice.
3. In **Reminders**, pick a time, allow notifications, and save.
4. Keep the tab open (or install as a PWA from the browser) so the reminder can fire.
5. When prompted, choose **Yes, I'm ready** and press Play.

## Privacy

Audio and playlists are stored only in this browser profile on your device. Clearing site data removes them.
