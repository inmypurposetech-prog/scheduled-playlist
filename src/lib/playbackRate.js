export const MIN_PLAYBACK_RATE = 0.5
export const MAX_PLAYBACK_RATE = 1.5
export const PLAYBACK_RATE_STEP = 0.05

export const PLAYBACK_RATE_PRESETS = [0.5, 0.75, 1, 1.25, 1.5]

/** Keep a rate inside 0.5×–1.5×, snapped to 0.05. Missing values stay at 1×. */
export function clampPlaybackRate(rate) {
  const value = Number(rate)
  if (!Number.isFinite(value)) return 1
  const snapped = Math.round(value / PLAYBACK_RATE_STEP) * PLAYBACK_RATE_STEP
  const clamped = Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, snapped))
  return Math.round(clamped * 100) / 100
}

export function samePlaybackRate(a, b) {
  return Math.abs(clampPlaybackRate(a) - clampPlaybackRate(b)) < 0.001
}

export function formatPlaybackRate(rate) {
  return `${Number(clampPlaybackRate(rate).toFixed(2))}×`
}
