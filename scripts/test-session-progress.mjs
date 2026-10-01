/**
 * Unit checks for session progress helpers (no test runner dependency).
 * Run: node scripts/test-session-progress.mjs
 */
import {
  computeSessionProgress,
  queueItemStatus,
  sessionProgressLabel,
} from '../src/lib/sessionProgress.js'

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    throw new Error(`${label}: expected ${e}, got ${a}`)
  }
}

const tracks = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
const durationById = new Map([
  [1, 60],
  [2, 120],
  [3, 90],
  [4, 30],
])

const mid = computeSessionProgress({
  index: 1,
  trackCount: 4,
  currentTime: 30,
  currentDuration: 120,
  durationById,
  tracks,
})

assertEqual(mid.exerciseNumber, 2, 'exercise number')
assertEqual(mid.remainingExercises, 2, 'remaining exercises')
assertEqual(mid.elapsedSeconds, 90, 'elapsed = track1 + 30s')
assertEqual(mid.remainingSeconds, 210, 'remaining = 90 + 90 + 30')
assertEqual(mid.allDurationsKnown, true, 'all known')
assertEqual(
  mid.label,
  'Exercise 2 of 4 · ~3:30 left (2 exercises)',
  'mid-session label',
)

assertEqual(
  sessionProgressLabel({
    exerciseNumber: 4,
    trackCount: 4,
    remainingExercises: 0,
    remainingSeconds: 12,
    allDurationsKnown: true,
  }),
  'Exercise 4 of 4 · 0:12 left in this track',
  'last track label',
)

assertEqual(
  sessionProgressLabel({
    exerciseNumber: 1,
    trackCount: 3,
    remainingExercises: 2,
    remainingSeconds: 0,
    allDurationsKnown: false,
  }),
  'Exercise 1 of 3 · 2 exercises after this',
  'unknown durations label',
)

assertEqual(queueItemStatus(0, 2, true), 'Done', 'done status')
assertEqual(queueItemStatus(2, 2, true), 'Playing', 'playing status')
assertEqual(queueItemStatus(2, 2, false), 'Paused', 'paused status')
assertEqual(queueItemStatus(3, 2, true), 'Up next', 'up next status')

console.log('session progress tests passed')
