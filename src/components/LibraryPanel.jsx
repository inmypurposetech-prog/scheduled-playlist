import { useMemo, useState } from 'react'

export default function LibraryPanel({ tracks, onImport, onUpdate, onDelete }) {
  const [dragOver, setDragOver] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({ name: '', lesson: '' })

  const groups = useMemo(() => {
    const map = new Map()
    for (const track of tracks) {
      const key = track.lesson || 'Uncategorized'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(track)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [tracks])

  function startEdit(track) {
    setEditingId(track.id)
    setDraft({ name: track.name, lesson: track.lesson })
  }

  async function saveEdit(id) {
    await onUpdate(id, {
      name: draft.name.trim() || 'Untitled',
      lesson: draft.lesson.trim() || 'Uncategorized',
    })
    setEditingId(null)
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Lesson library</h2>
          <p>
            Import the Cheryl Porter exercise audio you already downloaded. Files stay on this
            device — nothing is uploaded to a server.
          </p>
        </div>
      </div>

      <div
        className={`dropzone${dragOver ? ' dragover' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          onImport(e.dataTransfer.files)
        }}
      >
        <div>
          <strong>Drop audio files here</strong>
          <span>or tap to choose MP3, M4A, WAV, and more</span>
        </div>
        <input
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac"
          multiple
          onChange={(e) => {
            if (e.target.files?.length) onImport(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {!tracks.length ? (
        <div className="empty-state">
          Your library is empty. Add the exercise recordings you want to schedule into weekday
          playlists.
        </div>
      ) : (
        <div className="lesson-groups">
          {groups.map(([lesson, items]) => (
            <div key={lesson} className="lesson-block">
              <h3>{lesson}</h3>
              <ul className="track-list">
                {items.map((track) => (
                  <li key={track.id} className="track-row">
                    <div className="track-meta">
                      {editingId === track.id ? (
                        <div className="edit-form">
                          <div className="row">
                            <input
                              type="text"
                              value={draft.name}
                              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                              aria-label="Track name"
                            />
                            <input
                              type="text"
                              value={draft.lesson}
                              onChange={(e) => setDraft((d) => ({ ...d, lesson: e.target.value }))}
                              aria-label="Lesson"
                              placeholder="Lesson name"
                            />
                          </div>
                          <div className="track-actions">
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => saveEdit(track.id)}>
                              Save
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <strong>{track.name}</strong>
                          <small>{track.lesson}</small>
                        </>
                      )}
                    </div>
                    {editingId !== track.id && (
                      <div className="track-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(track)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-danger"
                          onClick={() => onDelete(track.id)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
