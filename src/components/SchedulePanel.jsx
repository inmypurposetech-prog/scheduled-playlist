import { useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DAYS } from '../lib/db'
import { SORT_OPTIONS, sortTracks } from '../lib/sortTracks'

function SortablePlaylistItem({ track, index, onMove, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`playlist-item${isDragging ? ' dragging' : ''}`}
    >
      <button
        type="button"
        className="drag-handle"
        aria-label={`Drag to reorder ${track.name}`}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <span className="order">{index + 1}</span>
      <div className="track-meta">
        <strong>{track.name}</strong>
        <small>{track.lesson}</small>
      </div>
      <div className="track-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onMove(track.id, -1)} aria-label="Move up">
          ↑
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onMove(track.id, 1)} aria-label="Move down">
          ↓
        </button>
        <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => onRemove(track.id)}>
          Remove
        </button>
      </div>
    </div>
  )
}

export default function SchedulePanel({ tracks, playlists, today, onChange }) {
  const [selectedDay, setSelectedDay] = useState(today)
  const [librarySort, setLibrarySort] = useState('name-asc')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const current = useMemo(() => {
    return playlists.find((p) => p.day === selectedDay) || { day: selectedDay, trackIds: [] }
  }, [playlists, selectedDay])

  const queued = useMemo(() => {
    const map = Object.fromEntries(tracks.map((t) => [t.id, t]))
    return (current.trackIds || []).map((id) => map[id]).filter(Boolean)
  }, [current.trackIds, tracks])

  const available = useMemo(() => {
    const used = new Set(current.trackIds || [])
    return sortTracks(
      tracks.filter((t) => !used.has(t.id)),
      librarySort,
    )
  }, [tracks, current.trackIds, librarySort])

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

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = [...(current.trackIds || [])]
    const oldIndex = ids.findIndex((id) => id === active.id || String(id) === String(active.id))
    const newIndex = ids.findIndex((id) => id === over.id || String(id) === String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    onChange(selectedDay, arrayMove(ids, oldIndex, newIndex))
  }

  function sortPlaylist(sortBy) {
    if (!sortBy || !queued.length) return
    const sorted = sortTracks(queued, sortBy)
    onChange(
      selectedDay,
      sorted.map((t) => t.id),
    )
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Weekly schedule</h2>
          <p>
            Build a Monday playlist, a Tuesday playlist, and so on — mix exercises from different
            lessons into each day. Drag tracks to reorder, or sort the whole day at once.
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
          <div className="pane-toolbar">
            <h3>{selectedDay} playlist</h3>
            <label className="sort-control">
              <span>Sort by</span>
              <select
                aria-label={`Sort ${selectedDay} playlist`}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    sortPlaylist(e.target.value)
                    e.target.value = ''
                  }
                }}
                disabled={!queued.length}
              >
                <option value="" disabled>
                  Sort playlist…
                </option>
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!queued.length ? (
            <div className="empty-state">No exercises yet. Add tracks from your library.</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={queued.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {queued.map((track, index) => (
                  <SortablePlaylistItem
                    key={track.id}
                    track={track}
                    index={index}
                    onMove={move}
                    onRemove={removeTrack}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="schedule-pane">
          <div className="pane-toolbar">
            <h3>Add from library</h3>
            <label className="sort-control">
              <span>Sort by</span>
              <select
                aria-label="Sort library picks"
                value={librarySort}
                onChange={(e) => setLibrarySort(e.target.value)}
                disabled={!available.length && !tracks.length}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
