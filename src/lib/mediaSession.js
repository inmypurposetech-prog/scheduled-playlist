import { formatLessonLabel } from './lessonLabel'

/** Media Session helpers so iOS keeps audio alive on lock screen / CarPlay. */

export function mediaSessionSupported() {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
}

export function setMediaSessionMetadata(track) {
  if (!mediaSessionSupported() || !track) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name || 'Vocal exercise',
      artist: formatLessonLabel(track.lesson),
      album: 'Practice Day',
    })
  } catch {
    // Older WebKit builds can throw on MediaMetadata; ignore.
  }
}

export function setMediaSessionPlaybackState(playing) {
  if (!mediaSessionSupported()) return
  try {
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  } catch {
    // ignore
  }
}

export function setMediaSessionPositionState(audio) {
  if (!mediaSessionSupported() || !audio) return
  const duration = audio.duration
  const position = audio.currentTime
  if (!Number.isFinite(duration) || duration <= 0) return
  if (!Number.isFinite(position) || position < 0) return
  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: audio.playbackRate || 1,
      position: Math.min(position, duration),
    })
  } catch {
    // Some browsers reject position updates mid-seek.
  }
}

/**
 * Register lock-screen / CarPlay / Control Center action handlers.
 * Pass null for any action to clear it.
 */
export function bindMediaSessionActions(handlers) {
  if (!mediaSessionSupported()) return () => {}

  const actions = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto', 'stop']
  for (const action of actions) {
    const handler = handlers[action]
    try {
      navigator.mediaSession.setActionHandler(action, handler || null)
    } catch {
      // Unsupported action on this platform — skip.
    }
  }

  return () => {
    for (const action of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, null)
      } catch {
        // ignore
      }
    }
  }
}
