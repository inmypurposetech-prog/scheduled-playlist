import { useEffect, useMemo, useState } from 'react'
import {
  FEELINGS,
  REPORT_PERIODS,
  buildPracticeReport,
  isoDate,
} from '../lib/practiceLog'

function nowTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function emptyExercise() {
  return { name: '', trackId: null, feeling: null }
}

function draftFromLog(log) {
  const exercises = (log.exercises || []).map((exercise) => ({
    name: exercise.name || '',
    trackId: exercise.trackId ?? null,
    feeling: exercise.feeling || null,
  }))
  return {
    date: log.date,
    time: log.time || '',
    goals: log.goals || '',
    exercises: exercises.length ? exercises : [emptyExercise()],
    difficult: log.difficult || '',
    stillWorkingOn: log.stillWorkingOn || '',
    improvements: log.improvements || '',
    discovered: log.discovered || '',
    nextFocus: log.nextFocus || '',
    song: log.song || '',
  }
}

function freshDraft(date, todayIso, todayTracks) {
  const seeded =
    date === todayIso
      ? todayTracks.map((track) => ({
          name: track.name,
          trackId: track.id,
          feeling: null,
        }))
      : []
  return {
    date,
    time: date === todayIso ? nowTime() : '',
    goals: '',
    exercises: seeded.length ? seeded : [emptyExercise()],
    difficult: '',
    stillWorkingOn: '',
    improvements: '',
    discovered: '',
    nextFocus: '',
    song: '',
  }
}

export default function LogPanel({ logs, todayTracks, onSave }) {
  const todayIso = isoDate()
  const [date, setDate] = useState(todayIso)
  const [draft, setDraft] = useState(() => freshDraft(todayIso, todayIso, todayTracks))
  const [period, setPeriod] = useState('week')
  const [saving, setSaving] = useState(false)

  const savedStamp = logs.find((log) => log.date === date)?.updatedAt ?? null
  const seedKey = todayTracks.map((track) => `${track.id}:${track.name}`).join('|')

  useEffect(() => {
    const saved = logs.find((log) => log.date === date)
    setDraft(saved ? draftFromLog(saved) : freshDraft(date, todayIso, todayTracks))
    // Reload only when the chosen day, its saved copy, or today's playlist changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, savedStamp, seedKey, todayIso])

  const report = useMemo(() => buildPracticeReport(logs, period), [logs, period])

  function updateExercise(index, patch) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, i) =>
        i === index ? { ...exercise, ...patch } : exercise,
      ),
    }))
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave({ ...draft, date })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel log-panel">
      <div className="panel-header">
        <div>
          <h2>Practice log</h2>
          <p>
            Write down the session while it is fresh. The note stays in this browser, with your
            audio.
          </p>
        </div>
      </div>

      <form className="log-form" onSubmit={handleSave}>
        <div className="log-when">
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Time</span>
            <input
              type="time"
              value={draft.time}
              onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))}
            />
          </label>
        </div>

        <label className="field">
          <span>What I want from this session</span>
          <textarea
            rows={3}
            value={draft.goals}
            onChange={(event) => setDraft((current) => ({ ...current, goals: event.target.value }))}
            placeholder="The focus for today"
          />
        </label>

        <div className="field">
          <span>Exercises I worked on</span>
          <p className="field-hint">Tap an emoji for how that exercise felt today.</p>
          <ul className="exercise-log">
            {draft.exercises.map((exercise, index) => (
              <li key={`${date}-${index}`} className="exercise-log-row">
                <input
                  type="text"
                  value={exercise.name}
                  aria-label={`Exercise ${index + 1}`}
                  placeholder="Exercise name"
                  onChange={(event) => updateExercise(index, { name: event.target.value })}
                />
                <div className="feeling-picker" role="group" aria-label={`How exercise ${index + 1} felt`}>
                  {FEELINGS.map((feeling) => (
                    <button
                      key={feeling.id}
                      type="button"
                      className={exercise.feeling === feeling.id ? 'active' : ''}
                      aria-pressed={exercise.feeling === feeling.id}
                      aria-label={feeling.label}
                      title={feeling.label}
                      onClick={() =>
                        updateExercise(index, {
                          feeling: exercise.feeling === feeling.id ? null : feeling.id,
                        })
                      }
                    >
                      {feeling.emoji}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setDraft((current) => {
                      const exercises = current.exercises.filter((_, i) => i !== index)
                      return {
                        ...current,
                        exercises: exercises.length ? exercises : [emptyExercise()],
                      }
                    })
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                exercises: [...current.exercises, emptyExercise()],
              }))
            }
          >
            Add exercise
          </button>
        </div>

        <label className="field">
          <span>What was hard</span>
          <textarea
            rows={2}
            value={draft.difficult}
            onChange={(event) => setDraft((current) => ({ ...current, difficult: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>What I am still wrestling with</span>
          <textarea
            rows={2}
            value={draft.stillWorkingOn}
            onChange={(event) =>
              setDraft((current) => ({ ...current, stillWorkingOn: event.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>Improvements I could hear</span>
          <textarea
            rows={2}
            value={draft.improvements}
            onChange={(event) =>
              setDraft((current) => ({ ...current, improvements: event.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>Something I noticed</span>
          <textarea
            rows={2}
            value={draft.discovered}
            onChange={(event) => setDraft((current) => ({ ...current, discovered: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>What I will work on next</span>
          <textarea
            rows={2}
            value={draft.nextFocus}
            onChange={(event) => setDraft((current) => ({ ...current, nextFocus: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Song I will practice</span>
          <input
            type="text"
            value={draft.song}
            onChange={(event) => setDraft((current) => ({ ...current, song: event.target.value }))}
            placeholder="Title or section"
          />
        </label>

        <div className="transport">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save log'}
          </button>
        </div>
      </form>

      <div className="practice-report">
        <h3>How practice has felt</h3>
        <p>Feelings you marked on each exercise, over the stretch you pick.</p>
        <div className="day-tabs" role="tablist" aria-label="Report length">
          {REPORT_PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={period === item.id}
              className={period === item.id ? 'active' : ''}
              onClick={() => setPeriod(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="report-summary">{report.summary}</p>
        <p className="report-meta">
          {report.practiceDays} practice {report.practiceDays === 1 ? 'day' : 'days'} from {report.start}{' '}
          to {report.end}
        </p>
        {report.exercises.length > 0 && (
          <ul className="report-list">
            {report.exercises.map((exercise) => (
              <li key={exercise.name}>
                <strong>{exercise.name}</strong>
                <span className="report-feelings">
                  {exercise.count < 2
                    ? exercise.lastEmoji
                    : `${exercise.firstEmoji} → ${exercise.lastEmoji}`}
                </span>
                <span className="report-trend">{exercise.trend}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
