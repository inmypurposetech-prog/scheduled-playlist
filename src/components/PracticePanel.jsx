import { useEffect, useRef, useState } from 'react'
import { formatDuration } from '../lib/db'

export default function PracticePanel({ day, tracks, onOpenSchedule, onOpenLibrary }) {
  const audioRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const current = tracks[index] || null

  useEffect(() => {
    setIndex(0)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [day, tracks])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    audio.src = current.url
    audio.load()
    if (playing) {
      audio.play().catch(() => setPlaying(false))
    }
  }, [current?.id])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [playing])

  function playNext() {
    if (index < tracks.length - 1) {
      setIndex((i) => i + 1)
      setPlaying(true)
    } else {
      setPlaying(false)
    }
  }

  function playPrev() {
    if (currentTime > 3) {
      const audio = audioRef.current
      if (audio) audio.currentTime = 0
      setCurrentTime(0)
      return
    }
    if (index > 0) {
      setIndex((i) => i - 1)
      setPlaying(true)
    }
  }

  if (!tracks.length) {
    return (
      <section className="panel">
        <div className="practice-hero">
          <p className="practice-kicker">{day}</p>
          <h2>No playlist for today yet</h2>
          <p>
            Import your lesson audio, then assign exercises to {day}. When reminder time arrives,
            open this page and press play.
          </p>
          <div className="transport">
            <button type="button" className="btn btn-primary" onClick={onOpenLibrary}>
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

  return (
    <section className="panel">
      <div className="practice-hero">
        <p className="practice-kicker">{day} practice</p>
        <h2>Your vocal session</h2>
        <p>
          {tracks.length} exercise{tracks.length === 1 ? '' : 's'} queued for today. Play straight
          through, or jump to any track in the list below.
        </p>

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
                if (audioRef.current) audioRef.current.currentTime = value
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
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={playNext}>
              Next
            </button>
          </div>
        </div>
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Today&apos;s queue</h3>
      <ul className="queue">
        {tracks.map((track, i) => (
          <li key={track.id}>
            <button
              type="button"
              className={`queue-item${i === index ? ' active' : ''}`}
              onClick={() => {
                setIndex(i)
                setPlaying(true)
              }}
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
        preload="metadata"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={playNext}
      />
    </section>
  )
}
