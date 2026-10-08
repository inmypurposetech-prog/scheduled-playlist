import assert from 'node:assert/strict'
import { clampPlaybackRate, formatPlaybackRate } from '../src/lib/playbackRate.js'
import {
  buildPracticeReport,
  motivationLine,
  practiceDaysThisWeek,
} from '../src/lib/practiceLog.js'

function pass(name) {
  console.log(`ok - ${name}`)
}

assert.equal(clampPlaybackRate(undefined), 1)
assert.equal(clampPlaybackRate(0.2), 0.5)
assert.equal(clampPlaybackRate(2), 1.5)
assert.equal(clampPlaybackRate(0.74), 0.75)
assert.equal(formatPlaybackRate(1), '1×')
assert.equal(formatPlaybackRate(0.5), '0.5×')
pass('playback rate bounds')

const monday = new Date(2026, 9, 5, 15, 0, 0)
assert.equal(motivationLine([], monday).text, 'Start your new week strong.')
assert.equal(motivationLine([], monday).count, 0)

const blank = [{ date: '2026-10-05', goals: '   ', exercises: [{ name: '', feeling: null }] }]
assert.equal(practiceDaysThisWeek(blank, monday), 0)

const oneDay = [{ date: '2026-10-05', goals: 'Ease the jaw' }]
assert.equal(motivationLine(oneDay, monday).count, 1)
assert.match(motivationLine(oneDay, monday).text, /1 day this week/)

const previousSunday = [
  { date: '2026-10-04', goals: 'Last week' },
  { date: '2026-10-05', song: 'Ave Maria' },
]
assert.equal(practiceDaysThisWeek(previousSunday, monday), 1)

const tuesday = new Date(2026, 9, 6, 9, 0, 0)
const twoDays = [
  { date: '2026-10-05', goals: 'Warm up' },
  { date: '2026-10-06', song: 'Scale work' },
  { date: '2026-10-12', goals: 'Next week should not count' },
]
assert.equal(practiceDaysThisWeek(twoDays, tuesday), 2)
assert.equal(
  motivationLine(twoDays, tuesday).text,
  'You have practiced 2 days this week. Congratulations!',
)
pass('motivation counts only this week')

const logs = [
  {
    date: '2026-10-01',
    goals: 'First pass',
    exercises: [{ name: 'Lip trill', feeling: 'tough' }],
  },
  {
    date: '2026-10-05',
    goals: 'Second pass',
    exercises: [{ name: 'Lip trill', feeling: 'strong' }],
  },
]
const week = buildPracticeReport(logs, 'week', monday)
assert.equal(week.practiceDays, 2)
assert.equal(week.exercises[0].trend, 'Feeling better')
assert.equal(week.exercises[0].firstEmoji, '😣')
assert.equal(week.exercises[0].lastEmoji, '😄')
assert.match(week.summary, /better/i)

const month = buildPracticeReport(logs, 'month', monday)
assert.equal(month.exercises[0].trend, 'Feeling better')
const quarter = buildPracticeReport(logs, 'quarter', monday)
assert.equal(quarter.practiceDays, 2)
assert.equal(buildPracticeReport([], 'week', monday).practiceDays, 0)
pass('feeling report compares real logs')

console.log('All practice insight tests passed')
