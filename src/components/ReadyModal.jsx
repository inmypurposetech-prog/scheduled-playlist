export default function ReadyModal({ message, day, count, onYes, onNo }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ready-title">
        <h2 id="ready-title">Vocal practice</h2>
        <p>
          {message}{' '}
          {count > 0
            ? `Your ${day} playlist has ${count} exercise${count === 1 ? '' : 's'} waiting.`
            : `There is no ${day} playlist yet — you can still open Today and build one.`}
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onYes}>
            Yes, I&apos;m ready
          </button>
          <button type="button" className="btn btn-secondary" onClick={onNo}>
            Not right now
          </button>
        </div>
      </div>
    </div>
  )
}
