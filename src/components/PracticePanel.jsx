import { useEffect, useRef, useState } from 'react'
import { sumTrackDurations } from '../lib/audioDuration'
import { formatDuration } from '../lib/db'
import {
  bindMediaSessionActions,
  setMediaSessionMetadata,
  setMediaSessionPlaybackState,
  setMediaSessionPositionState,
} from '../lib/mediaSession'

export default function PracticePanel({
  day,
  tracks,
  today,
  yesterday,
  yesterdayCount,
  onPracticeDayChange,
  onCopyDayToToday,
  onOpenSchedule,
  onOpenLibrary,
}) {
  const audioRef = useRef(null)
  const indexRef = useRef(0)
  const tracksRef = useRef(tracks)
  const playingRef = useRef(false)
  const currentTimeRef = useRef(0)
  const userPausedRef = useRef(false)
  const lastPositionSyncRef = useRef(0)

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playlistDuration, setPlaylistDuration] = useState(0)

  const current = tracks[index] || null
  const isToday = day === today
  const isYesterday = day === yesterday

  useEffect(() => {
    tracksRef.current = tracks
  }, [tracks])

  useEffect(() => {
    let cancelled = false
    setPlaylistDuration(0)
    if (!tracks.length) return undefined

    sumTrackDurations(tracks).then((total) => {
      if (!cancelled) setPlaylistDuration(total)
    })

    return () => {
      cancelled = true
    }
  }, [tracks])

  useEffect(() => {
    indexRef.current = 0
    playingRef.current = false
    userPausedRef.current = false
    currentTimeRef.current = 0
    setIndex(0)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    setMediaSessionPlaybackState(false)
  }, [day, tracks])

  function syncPlaying(next) {
    playingRef.current = next
    setPlaying(next)
    setMediaSessionPlaybackState(next)
  }

  function syncIndex(next) {
    indexRef.current = next
    setIndex(next)
  }

  /** Load a track and optionally start playback immediately (safe while locked). */
  function loadAndMaybePlay(nextIndex, shouldPlay) {
    const audio = audioRef.current
    const track = tracksRef.current[nextIndex]
    if (!audio || !track) return

    // Blob URLs are absolute and stable for the session — compare directly.
    if (audio.src !== track.url) {
      audio.src = track.url
      audio.load()
    }

    setMediaSessionMetadata(track)
    currentTimeRef.current = 0
    setCurrentTime(0)

    if (shouldPlay) {
      userPausedRef.current = false
      syncPlaying(true)
      audio.play().catch(() => syncPlaying(false))
    }
  }

  function playNext() {
    const next = indexRef.current + 1
    if (next < tracksRef.current.length) {
      syncIndex(next)
      loadAndMaybePlay(next, true)
    } else {
      userPausedRef.current = true
      syncPlaying(false)
      const audio = audioRef.current
      if (audio) audio.pause()
    }
  }

  function playPrev() {
    if (currentTimeRef.current > 3) {
      const audio = audioRef.current
      if (audio) {
        audio.currentTime = 0
        currentTimeRef.current = 0
        setCurrentTime(0)
        setMediaSessionPositionState(audio)
      }
      return
    }
    if (indexRef.current > 0) {
      const next = indexRef.current - 1
      syncIndex(next)
      loadAndMaybePlay(next, true)
    }
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio || !tracksRef.current[indexRef.current]) return

    if (playingRef.current) {
      userPausedRef.current = true
      audio.pause()
      syncPlaying(false)
      return
    }

    userPausedRef.current = false
    // Ensure src is set (e.g. after day reset).
    const track = tracksRef.current[indexRef.current]
    if (track && audio.src !== track.url) {
      audio.src = track.url
      audio.load()
      setMediaSessionMetadata(track)
    }
    syncPlaying(true)
    audio.play().catch(() => syncPlaying(false))
  }

  function playAt(nextIndex) {
    syncIndex(nextIndex)
    loadAndMaybePlay(nextIndex, true)
  }

  // Keep Media Session actions pointed at the latest imperative handlers.
  useEffect(() => {
    return bindMediaSessionActions({
      play: () => {
        userPausedRef.current = false
        const audio = audioRef.current
        if (!audio) return
        syncPlaying(true)
        audio.play().catch(() => syncPlaying(false))
      },
      pause: () => {
        userPausedRef.current = true
        const audio = audioRef.current
        if (audio) audio.pause()
        syncPlaying(false)
      },
      stop: () => {
        userPausedRef.current = true
        const audio = audioRef.current
        if (audio) {
          audio.pause()
          audio.currentTime = 0
        }
        syncPlaying(false)
      },
      previoustrack: () => playPrev(),
      nexttrack: () => playNext(),
      seekto: (details) => {
        const audio = audioRef.current
        if (!audio || details.seekTime == null) return
        audio.currentTime = details.seekTime
        currentTimeRef.current = details.seekTime
        setCurrentTime(details.seekTime)
        setMediaSessionPositionState(audio)
      },
    })
  }, [])

  // Resume if iOS paused us on lock / CarPlay route change without a user pause.
  useEffect(() => {
    function maybeResume() {
      const audio = audioRef.current
      if (!audio) return
      if (playingRef.current && !userPausedRef.current && audio.paused) {
        audio.play().catch(() => syncPlaying(false))
      }
      if (tracksRef.current[indexRef.current]) {
        setMediaSessionMetadata(tracksRef.current[indexRef.current])
        setMediaSessionPlaybackState(playingRef.current)
        setMediaSessionPositionState(audio)
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') maybeResume()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', maybeResume)
    window.addEventListener('focus', maybeResume)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', maybeResume)
      window.removeEventListener('focus', maybeResume)
    }
  }, [])

  // Seed metadata when the current track identity changes via React state.
  useEffect(() => {
    if (current) setMediaSessionMetadata(current)
  }, [current?.id])

  const daySwitcher = (
    <div className="practice-day-switch" role="group" aria-label="Practice day">
      <button
        type="button"
        className={isToday ? 'active' : ''}
        aria-pressed={isToday}
        onClick={() => onPracticeDayChange(today)}
      >
        Today
      </button>
      <button
        type="button"
        className={isYesterday ? 'active' : ''}
        aria-pressed={isYesterday}
        onClick={() => onPracticeDayChange(yesterday)}
        disabled={!yesterdayCount && !isYesterday}
        title={
          yesterdayCount
            ? `Play ${yesterday}'s playlist`
            : `${yesterday} has no exercises yet`
        }
      >
        Yesterday
      </button>
    </div>
  )

  if (!tracks.length) {
    return (
      <section className="panel">
        <div className="practice-hero">
          {daySwitcher}
          <p className="practice-kicker">{day}</p>
          <h2>
            {isToday ? 'No playlist for today yet' : `No playlist for ${day}`}
          </h2>
          <p>
            {isToday
              ? `Import your lesson audio, then assign exercises to ${day} — or reuse yesterday's queue.`
              : `${day} has no exercises assigned. Switch back to today or build this day in Schedule.`}
          </p>
          <div className="transport">
            {isToday && yesterdayCount > 0 && (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onPracticeDayChange(yesterday)}
                >
                  Play yesterday
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onCopyDayToToday(yesterday)}
                >
                  Copy yesterday into today
                </button>
              </>
            )}
            {!isToday && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onPracticeDayChange(today)}
              >
                Back to today
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onOpenLibrary}>
              Open library
            </button>
            <button type="button" className="btn btn-secondary" onClick={onOpenSchedule}>
              Build schedule
            </button>
          </div>
        </div>
      </section>
    )
  }

  const sessionLabel = isToday
    ? 'today'
    : isYesterday
      ? 'yesterday'
      : day
  const playlistLengthLabel =
    playlistDuration > 0 ? ` · ${formatDuration(playlistDuration)} total` : ''

  return (
    <section className="panel">
      <div className="practice-hero">
        {daySwitcher}
        <p className="practice-kicker">
          {day} practice
          {isYesterday ? ' · yesterday' : ''}
        </p>
        <h2>Your vocal session</h2>
        <p>
          {tracks.length} exercise{tracks.length === 1 ? '' : 's'}
          {playlistLengthLabel} queued for {sessionLabel}. Play continues with the screen
          locked and on CarPlay — use the lock screen or car controls for play, pause, and
          skip.
        </p>

        {!isToday && (
          <div className="practice-day-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onPracticeDayChange(today)}
            >
              Switch to today
            </button>
            {isYesterday && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onCopyDayToToday(yesterday)}
              >
                Copy into today
              </button>
            )}
          </div>
        )}

        <div className="now-playing">
          <div className="now-title">{current?.name}</div>
          <small style={{ color: 'var(--ink-muted)' }}>{current?.lesson}</small>

          <div className="progress-wrap">
            <input
              className="progress-bar"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => {
                const value = Number(e.target.value)
                if (audioRef.current) {
                  audioRef.current.currentTime = value
                  setMediaSessionPositionState(audioRef.current)
                }
                currentTimeRef.current = value
                setCurrentTime(value)
              }}
              aria-label="Seek"
            />
            <div className="time-row">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          <div className="transport">
            <button type="button" className="btn btn-secondary" onClick={playPrev}>
              Previous
            </button>
            <button type="button" className="btn btn-primary" onClick={togglePlay}>
              {playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={playNext}>
              Next
            </button>
          </div>
        </div>
      </div>

      <h3 className="queue-heading">
        {isToday ? "Today's queue" : isYesterday ? "Yesterday's queue" : `${day}'s queue`}
        {playlistLengthLabel}
      </h3>
      <ul className="queue">
        {tracks.map((track, i) => (
          <li key={track.id}>
            <button
              type="button"
              className={`queue-item${i === index ? ' active' : ''}`}
              onClick={() => playAt(i)}
            >
              <span className="order">{i + 1}</span>
              <div className="track-meta">
                <strong>{track.name}</strong>
                <small>{track.lesson}</small>
              </div>
              <span style={{ color: 'var(--ink-faint)', fontSize: '0.85rem' }}>
                {i === index && playing ? 'Playing' : 'Play'}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        onTimeUpdate={() => {
          const audio = audioRef.current
          const t = audio?.currentTime || 0
          currentTimeRef.current = t
          setCurrentTime(t)
          // Throttle lock-screen position updates — timeupdate fires often.
          const now = performance.now()
          if (audio && now - lastPositionSyncRef.current > 1000) {
            lastPositionSyncRef.current = now
            setMediaSessionPositionState(audio)
          }
        }}
        onLoadedMetadata={() => {
          const audio = audioRef.current
          setDuration(audio?.duration || 0)
          if (audio) setMediaSessionPositionState(audio)
        }}
        onPlay={() => {
          if (!playingRef.current) syncPlaying(true)
          setMediaSessionPlaybackState(true)
        }}
        onPause={() => {
          // Ignore brief pauses during src changes; respect user pause + ended.
          if (userPausedRef.current) {
            syncPlaying(false)
          }
        }}
        onEnded={playNext}
      />
    </section>
  )
}
