import { useMemo, useState } from 'react'
import { DAYS } from '../lib/db'

export default function SchedulePanel({ tracks, playlists, today, onChange }) {
  const [selectedDay, setSelectedDay] = useState(today)

  const current = useMemo(() => {
    return playlists.find((p) => p.day === selectedDay) || { day: selectedDay, trackIds: [] }
  }, [playlists, selectedDay])

  const queued = useMemo(() => {
    const map = Object.fromEntries(tracks.map((t) => [t.id, t]))
    return (current.trackIds || []).map((id) => map[id]).filter(Boolean)
  }, [current.trackIds, tracks])

  const available = useMemo(() => {
    const used = new Set(current.trackIds || [])
    return tracks.filter((t) => !used.has(t.id))
  }, [tracks, current.trackIds])

  function addTrack(id) {
    onChange(selectedDay, [...(current.trackIds || []), id])
  }

  function removeTrack(id) {
    onChange(
      selectedDay,
      (current.trackIds || []).filter((tid) => tid !== id),
    )
  }

  function move(id, direction) {
    const ids = [...(current.trackIds || [])]
    const index = ids.indexOf(id)
    if (index < 0) return
    const next = index + direction
    if (next < 0 || next >= ids.length) return
    ;[ids[index], ids[next]] = [ids[next], ids[index]]
    onChange(selectedDay, ids)
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Weekly schedule</h2>
          <p>
            Build a Monday playlist, a Tuesday playlist, and so on — mix exercises from different
            lessons into each day.
          </p>
        </div>
      </div>

      <div className="day-tabs" role="tablist" aria-label="Days of the week">
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={selectedDay === day}
            className={`${selectedDay === day ? 'active' : ''} ${day === today ? 'today' : ''}`}
            onClick={() => setSelectedDay(day)}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="schedule-layout">
        <div className="schedule-pane">
          <h3>{selectedDay} playlist</h3>
          {!queued.length ? (
            <div className="empty-state">No exercises yet. Add tracks from your library.</div>
          ) : (
            queued.map((track, index) => (
              <div key={track.id} className="playlist-item">
                <span className="order">{index + 1}</span>
                <div className="track-meta">
                  <strong>{track.name}</strong>
                  <small>{track.lesson}</small>
                </div>
                <div className="track-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(track.id, -1)} aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(track.id, 1)} aria-label="Move down">
                    ↓
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => removeTrack(track.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="schedule-pane">
          <h3>Add from library</h3>
          {!tracks.length ? (
            <div className="empty-state">Import audio in the Library tab first.</div>
          ) : !available.length ? (
            <div className="empty-state">Every track is already on this day.</div>
          ) : (
            available.map((track) => (
              <div key={track.id} className="library-pick">
                <span>
                  <strong>{track.name}</strong>
                  <br />
                  <small style={{ color: 'var(--ink-faint)' }}>{track.lesson}</small>
                </span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => addTrack(track.id)}>
                  Add
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
