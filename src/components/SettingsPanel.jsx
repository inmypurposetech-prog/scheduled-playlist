import { useEffect, useRef, useState } from 'react'

export default function SettingsPanel({
  settings,
  notificationSupported,
  trackCount,
  backupBusy,
  onSave,
  onTest,
  onExportBackup,
  onImportBackup,
}) {
  const [draft, setDraft] = useState(settings)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Settings</h2>
          <p>
            Set a daily ready prompt, and back up your library so clearing browser data does not
            erase your playlists.
          </p>
        </div>
      </div>

      <div className="settings-stack">
        <div className="settings-block">
          <h3>Practice reminders</h3>
          <p className="settings-block-copy">
            At your chosen time, Practice Day asks: are you ready for vocal practice? Say yes to
            jump into today&apos;s playlist, or no to skip for now.
          </p>

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
                This browser does not support notifications. You can still use the in-app ready
                prompt while the tab is open.
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
        </div>

        <div className="settings-block">
          <h3>Backup &amp; restore</h3>
          <p className="settings-block-copy">
            Download a single file with your audio, weekday playlists, and reminder settings. Keep
            it somewhere safe (Files, iCloud Drive, email). Restore replaces everything currently
            in this browser.
          </p>

          <div className="backup-meta">
            Library now: {trackCount} track{trackCount === 1 ? '' : 's'}
            {backupBusy ? ' · Working…' : ''}
          </div>

          <div className="transport">
            <button
              type="button"
              className="btn btn-primary"
              disabled={backupBusy || trackCount === 0}
              onClick={onExportBackup}
            >
              Export backup
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={backupBusy}
              onClick={() => fileInputRef.current?.click()}
            >
              Restore backup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) onImportBackup(file)
              }}
            />
          </div>

          <p className="backup-hint">
            Backup files are about as large as your imported audio. On iPhone, if export opens in a
            tab, use Share → Save to Files.
          </p>
        </div>
      </div>
    </section>
  )
}
