function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Build session progress from playlist position + known per-track durations.
 *
 * @param {object} opts
 * @param {number} opts.index - zero-based current track index
 * @param {number} opts.trackCount
 * @param {number} opts.currentTime - seconds into current track
 * @param {number} opts.currentDuration - duration of current track (0 if unknown)
 * @param {Record<string|number, number>|Map} opts.durationById - known durations keyed by track id
 * @param {Array<{id: string|number}>} opts.tracks
 */
export function computeSessionProgress({
  index,
  trackCount,
  currentTime,
  currentDuration,
  durationById,
  tracks,
}) {
  const safeIndex = Math.max(0, Math.min(index, Math.max(trackCount - 1, 0)))
  const exerciseNumber = trackCount === 0 ? 0 : safeIndex + 1
  const remainingExercises = Math.max(0, trackCount - exerciseNumber)

  const getDuration = (track, i) => {
    if (!track) return 0
    if (i === safeIndex && Number.isFinite(currentDuration) && currentDuration > 0) {
      return currentDuration
    }
    const cached =
      durationById instanceof Map ? durationById.get(track.id) : durationById?.[track.id]
    return Number.isFinite(cached) && cached > 0 ? cached : 0
  }

  let elapsedKnown = 0
  let remainingKnown = 0
  let knownCount = 0
  let totalKnown = 0

  for (let i = 0; i < tracks.length; i++) {
    const d = getDuration(tracks[i], i)
    if (d > 0) {
      knownCount += 1
      totalKnown += d
    }
    if (i < safeIndex) {
      elapsedKnown += d
    } else if (i === safeIndex) {
      const played = Math.min(Math.max(currentTime, 0), d || currentTime)
      elapsedKnown += played
      if (d > 0) remainingKnown += Math.max(d - played, 0)
    } else if (d > 0) {
      remainingKnown += d
    }
  }

  const allDurationsKnown = trackCount > 0 && knownCount === trackCount
  const fraction =
    allDurationsKnown && totalKnown > 0
      ? Math.min(1, Math.max(0, elapsedKnown / totalKnown))
      : trackCount === 0
        ? 0
        : Math.min(
            1,
            (safeIndex + (currentDuration > 0 ? currentTime / currentDuration : 0)) / trackCount,
          )

  return {
    exerciseNumber,
    trackCount,
    remainingExercises,
    elapsedSeconds: elapsedKnown,
    remainingSeconds: remainingKnown,
    totalSeconds: totalKnown,
    allDurationsKnown,
    fraction,
    label: sessionProgressLabel({
      exerciseNumber,
      trackCount,
      remainingExercises,
      remainingSeconds: remainingKnown,
      allDurationsKnown,
    }),
  }
}

export function sessionProgressLabel({
  exerciseNumber,
  trackCount,
  remainingExercises,
  remainingSeconds,
  allDurationsKnown,
}) {
  if (trackCount === 0) return 'No exercises queued'

  const position = `Exercise ${exerciseNumber} of ${trackCount}`

  if (remainingExercises === 0) {
    if (allDurationsKnown && remainingSeconds > 0) {
      return `${position} · ${formatClock(remainingSeconds)} left in this track`
    }
    return `${position} · last exercise`
  }

  if (allDurationsKnown && remainingSeconds > 0) {
    const exerciseWord = remainingExercises === 1 ? 'exercise' : 'exercises'
    return `${position} · ~${formatClock(remainingSeconds)} left (${remainingExercises} ${exerciseWord})`
  }

  const exerciseWord = remainingExercises === 1 ? 'exercise' : 'exercises'
  return `${position} · ${remainingExercises} ${exerciseWord} after this`
}

export function queueItemStatus(i, index, playing) {
  if (i < index) return 'Done'
  if (i === index) return playing ? 'Playing' : 'Paused'
  return 'Up next'
}
