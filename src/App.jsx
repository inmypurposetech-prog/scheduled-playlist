import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DAYS,
  addTrack,
  deleteTrack,
  formatDuration,
  getAllPlaylists,
  getSetting,
  listTracks,
  setPlaylist,
  setSetting,
  todayName,
  updateTrack,
  yesterdayName,
} from './lib/db'
import {
  ensureNotificationPermission,
  notificationSupported,
  showReadyPromptNotification,
  startReminderWatcher,
} from './lib/notifications'
import LibraryPanel from './components/LibraryPanel'
import SchedulePanel from './components/SchedulePanel'
import PracticePanel from './components/PracticePanel'
import SettingsPanel from './components/SettingsPanel'
import ReadyModal from './components/ReadyModal'

const TABS = [
  { id: 'practice', label: 'Today' },
  { id: 'library', label: 'Library' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'settings', label: 'Reminders' },
]

const DEFAULT_SETTINGS = {
  enabled: false,
  time: '09:00',
  message: 'Are you ready for your vocal practice?',
}

export default function App() {
  const [tab, setTab] = useState('practice')
  const [tracks, setTracks] = useState([])
  const [playlists, setPlaylists] = useState(
    DAYS.map((day) => ({ day, trackIds: [] })),
  )
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS)
  const [readyOpen, setReadyOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  /** Weekday currently loaded in the practice player (defaults to calendar today). */
  const [practiceDay, setPracticeDay] = useState(() => todayName())
  const objectUrls = useRef(new Map())
  const settingsRef = useRef(settings)

  const showToast = useCallback((message) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2800)
  }, [])

  const revokeAllUrls = useCallback(() => {
    for (const url of objectUrls.current.values()) {
      URL.revokeObjectURL(url)
    }
    objectUrls.current.clear()
  }, [])

  const hydrateTracks = useCallback(async () => {
    const rows = await listTracks()
    revokeAllUrls()
    const withUrls = rows.map((track) => {
      const url = URL.createObjectURL(track.blob)
      objectUrls.current.set(track.id, url)
      return {
        id: track.id,
        name: track.name,
        lesson: track.lesson,
        mimeType: track.mimeType,
        createdAt: track.createdAt,
        url,
      }
    })
    setTracks(withUrls)
    return withUrls
  }, [revokeAllUrls])

  const refreshPlaylists = useCallback(async () => {
    setPlaylists(await getAllPlaylists())
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const saved = await getSetting('reminders', DEFAULT_SETTINGS)
      if (!cancelled) {
        setSettingsState({ ...DEFAULT_SETTINGS, ...saved })
        await hydrateTracks()
        await refreshPlaylists()
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
      revokeAllUrls()
    }
  }, [hydrateTracks, refreshPlaylists, revokeAllUrls])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    const openReady = () => setReadyOpen(true)
    window.addEventListener('practice-day:open-ready', openReady)
    return () => window.removeEventListener('practice-day:open-ready', openReady)
  }, [])

  useEffect(() => {
    return startReminderWatcher({
      getSettings: () => settingsRef.current,
      onFire: (current) => {
        showReadyPromptNotification({
          title: 'Practice Day',
          body: current.message || DEFAULT_SETTINGS.message,
        })
        setReadyOpen(true)
      },
    })
  }, [])

  const trackMap = useMemo(() => {
    return Object.fromEntries(tracks.map((t) => [t.id, t]))
  }, [tracks])

  const today = todayName()
  const yesterday = yesterdayName()

  // If the calendar day rolls over while the tab stays open, follow "today"
  // when the player was still on the previous calendar day.
  useEffect(() => {
    let lastToday = todayName()
    const syncDay = () => {
      const nextToday = todayName()
      if (nextToday === lastToday) return
      const previousToday = lastToday
      lastToday = nextToday
      setPracticeDay((current) => (current === previousToday ? nextToday : current))
    }
    const id = window.setInterval(syncDay, 60_000)
    window.addEventListener('focus', syncDay)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', syncDay)
    }
  }, [])

  const resolvePlaylist = useCallback(
    (day) => {
      const list = playlists.find((p) => p.day === day) || { trackIds: [] }
      return (list.trackIds || [])
        .map((id) => trackMap[id])
        .filter(Boolean)
    },
    [playlists, trackMap],
  )

  const todayPlaylist = useMemo(() => resolvePlaylist(today), [resolvePlaylist, today])
  const practicePlaylist = useMemo(
    () => resolvePlaylist(practiceDay),
    [resolvePlaylist, practiceDay],
  )
  const yesterdayCount = useMemo(
    () => resolvePlaylist(yesterday).length,
    [resolvePlaylist, yesterday],
  )

  async function handleImport(files) {
    const audioFiles = [...files].filter((f) => f.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(f.name))
    if (!audioFiles.length) {
      showToast('No audio files found')
      return
    }
    for (const file of audioFiles) {
      const base = file.name.replace(/\.[^.]+$/, '')
      const lessonMatch = base.match(/^(lesson\s*\d+|l\d+|module\s*\d+)/i)
      await addTrack({
        name: base,
        lesson: lessonMatch ? lessonMatch[0].replace(/\s+/g, ' ') : 'Uncategorized',
        blob: file,
        mimeType: file.type,
      })
    }
    await hydrateTracks()
    showToast(`Added ${audioFiles.length} track${audioFiles.length === 1 ? '' : 's'}`)
  }

  async function handleUpdateTrack(id, updates) {
    await updateTrack(id, updates)
    await hydrateTracks()
  }

  async function handleDeleteTrack(id) {
    await deleteTrack(id)
    await hydrateTracks()
    await refreshPlaylists()
    showToast('Track removed')
  }

  async function handleSetPlaylist(day, trackIds) {
    await setPlaylist(day, trackIds)
    await refreshPlaylists()
  }

  async function handleCopyPlaylist(fromDay, toDay) {
    if (fromDay === toDay) return
    const source = playlists.find((p) => p.day === fromDay) || { trackIds: [] }
    const ids = [...(source.trackIds || [])]
    if (!ids.length) {
      showToast(`${fromDay} has no exercises to copy`)
      return
    }
    const target = playlists.find((p) => p.day === toDay) || { trackIds: [] }
    if ((target.trackIds || []).length) {
      const ok = window.confirm(
        `Replace ${toDay}'s playlist with ${fromDay}'s ${ids.length} exercise${ids.length === 1 ? '' : 's'}?`,
      )
      if (!ok) return
    }
    await setPlaylist(toDay, ids)
    await refreshPlaylists()
    showToast(`Copied ${fromDay} → ${toDay}`)
  }

  async function handleSaveSettings(next) {
    setSettingsState(next)
    await setSetting('reminders', next)
    if (next.enabled) {
      const permission = await ensureNotificationPermission()
      if (permission === 'denied') {
        showToast('Notifications are blocked in this browser')
      } else if (permission === 'unsupported') {
        showToast('Notifications are not supported here')
      } else {
        showToast('Reminder saved')
      }
    } else {
      showToast('Reminders off')
    }
  }

  function acceptPractice() {
    setReadyOpen(false)
    setPracticeDay(todayName())
    setTab('practice')
  }

  function declinePractice() {
    setReadyOpen(false)
    showToast('Okay — come back when you are ready')
  }

  return (
    <div className="app-shell">
      <header className="brand-bar">
        <div className="brand">
          <h1>Practice Day</h1>
          <p>Weekday vocal playlists from your lesson downloads</p>
        </div>
        <nav className="nav-tabs" aria-label="Main">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'active' : ''}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {loading ? (
        <div className="empty-state">Loading your practice library…</div>
      ) : (
        <>
          {/* Keep the player mounted so audio survives tab switches and lock screen. */}
          <div hidden={tab !== 'practice'}>
            <PracticePanel
              day={practiceDay}
              tracks={practicePlaylist}
              today={today}
              yesterday={yesterday}
              yesterdayCount={yesterdayCount}
              onPracticeDayChange={setPracticeDay}
              onCopyDayToToday={(fromDay) => handleCopyPlaylist(fromDay, today)}
              onOpenSchedule={() => setTab('schedule')}
              onOpenLibrary={() => setTab('library')}
            />
          </div>
          {tab === 'library' && (
            <LibraryPanel
              tracks={tracks}
              onImport={handleImport}
              onUpdate={handleUpdateTrack}
              onDelete={handleDeleteTrack}
            />
          )}
          {tab === 'schedule' && (
            <SchedulePanel
              tracks={tracks}
              playlists={playlists}
              today={today}
              onChange={handleSetPlaylist}
              onCopyPlaylist={handleCopyPlaylist}
            />
          )}
          {tab === 'settings' && (
            <SettingsPanel
              settings={settings}
              notificationSupported={notificationSupported()}
              onSave={handleSaveSettings}
              onTest={() => {
                setReadyOpen(true)
                showReadyPromptNotification({
                  title: 'Practice Day',
                  body: settings.message || DEFAULT_SETTINGS.message,
                })
              }}
            />
          )}
        </>
      )}

      {readyOpen && (
        <ReadyModal
          message={settings.message || DEFAULT_SETTINGS.message}
          day={today}
          count={todayPlaylist.length}
          onYes={acceptPractice}
          onNo={declinePractice}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
