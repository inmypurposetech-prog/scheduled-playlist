import { useEffect, useState } from 'react'

export default function SettingsPanel({
  settings,
  notificationSupported,
  onSave,
  onTest,
}) {
  const [draft, setDraft] = useState(settings)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Practice reminders</h2>
          <p>
            At your chosen time, Practice Day asks: are you ready for vocal practice? Say yes to
            jump into today&apos;s playlist, or no to skip for now.
          </p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="toggle-row">
          <div>
            <strong>Daily reminder</strong>
            <div style={{ color: 'var(--ink-muted)', fontSize: '0.95rem' }}>
              Fires while this app is open in a browser tab
            </div>
          </div>
          <button
            type="button"
            className={`switch${draft.enabled ? ' on' : ''}`}
            role="switch"
            aria-checked={draft.enabled}
            onClick={() => setDraft((d) => ({ ...d, enabled: !d.enabled }))}
            aria-label="Toggle daily reminder"
          >
            <span />
          </button>
        </div>

        <div className="field">
          <label htmlFor="reminder-time">Reminder time</label>
          <input
            id="reminder-time"
            type="time"
            value={draft.time}
            onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
          />
        </div>

        <div className="field">
          <label htmlFor="reminder-message">Prompt message</label>
          <input
            id="reminder-message"
            type="text"
            value={draft.message}
            onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
          />
        </div>

        {!notificationSupported && (
          <div className="empty-state">
            This browser does not support notifications. You can still use the in-app ready prompt
            while the tab is open.
          </div>
        )}

        <div className="transport">
          <button type="button" className="btn btn-primary" onClick={() => onSave(draft)}>
            Save reminders
          </button>
          <button type="button" className="btn btn-secondary" onClick={onTest}>
            Test ready prompt
          </button>
        </div>
      </div>
    </section>
  )
}
