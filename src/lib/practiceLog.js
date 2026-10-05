export const FEELINGS = [
  { id: 'tough', emoji: '😣', label: 'Tough', score: 1 },
  { id: 'uneven', emoji: '😕', label: 'Uneven', score: 2 },
  { id: 'steady', emoji: '😐', label: 'Steady', score: 3 },
  { id: 'easier', emoji: '🙂', label: 'Easier', score: 4 },
  { id: 'strong', emoji: '😄', label: 'Strong', score: 5 },
]

export const REPORT_PERIODS = [
  { id: 'week', label: 'Past week', days: 7 },
  { id: 'month', label: 'Past month', days: 30 },
  { id: 'quarter', label: 'Past quarter', days: 90 },
]

const FEELING_BY_ID = Object.fromEntries(FEELINGS.map((feeling) => [feeling.id, feeling]))

export function feelingById(id) {
  return FEELING_BY_ID[id] || null
}

export function isoDate(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfWeek(date = new Date()) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  const mondayOffset = (value.getDay() + 6) % 7
  value.setDate(value.getDate() - mondayOffset)
  return value
}

export function addDays(date, days) {
  const value = new Date(date)
  value.setDate(value.getDate() + days)
  return value
}

export function logCountsAsPractice(log) {
  if (!log || typeof log.date !== 'string') return false
  const textFields = [
    log.goals,
    log.difficult,
    log.stillWorkingOn,
    log.improvements,
    log.discovered,
    log.nextFocus,
    log.song,
  ]
  if (textFields.some((value) => typeof value === 'string' && value.trim())) return true
  return (log.exercises || []).some(
    (exercise) =>
      (typeof exercise?.name === 'string' && exercise.name.trim()) || feelingById(exercise?.feeling),
  )
}

export function practiceDaysThisWeek(logs, now = new Date()) {
  const start = isoDate(startOfWeek(now))
  const end = isoDate(now)
  const dates = new Set()
  for (const log of logs || []) {
    if (!log?.date || log.date < start || log.date > end) continue
    if (logCountsAsPractice(log)) dates.add(log.date)
  }
  return dates.size
}

export function motivationLine(logs, now = new Date()) {
  const count = practiceDaysThisWeek(logs, now)
  return { count, text: motivationCopy(count) }
}

function motivationCopy(count) {
  if (count <= 0) return 'Start your new week strong.'
  if (count === 1) return 'You have practiced 1 day this week. A good beginning.'
  if (count === 2) return 'You have practiced 2 days this week. Congratulations!'
  if (count === 3) return 'You have practiced 3 days this week. That is a real rhythm.'
  if (count === 4) return 'You have practiced 4 days this week. Congratulations!'
  if (count === 5) return 'You have practiced 5 days this week. Your voice is getting the time it needs.'
  if (count === 6) return 'You have practiced 6 days this week. One day left in the week.'
  return 'You have practiced 7 days this week. Congratulations!'
}

export function periodBounds(period, now = new Date()) {
  const spec = REPORT_PERIODS.find((item) => item.id === period) || REPORT_PERIODS[0]
  const endDate = new Date(now)
  endDate.setHours(0, 0, 0, 0)
  const startDate = addDays(endDate, -(spec.days - 1))
  return {
    id: spec.id,
    label: spec.label,
    start: isoDate(startDate),
    end: isoDate(endDate),
  }
}

function trendLabel(firstScore, lastScore, count) {
  if (count < 2) return 'Only one check-in so far'
  if (lastScore > firstScore) return 'Feeling better'
  if (lastScore < firstScore) return 'Still harder than before'
  return 'Holding steady'
}

export function buildPracticeReport(logs, period, now = new Date()) {
  const bounds = periodBounds(period, now)
  const inRange = (logs || [])
    .filter((log) => log?.date >= bounds.start && log?.date <= bounds.end && logCountsAsPractice(log))
    .sort((a, b) => a.date.localeCompare(b.date))

  const grouped = new Map()
  for (const log of inRange) {
    for (const exercise of log.exercises || []) {
      const name = typeof exercise?.name === 'string' ? exercise.name.trim() : ''
      const feeling = feelingById(exercise?.feeling)
      if (!name || !feeling) continue
      const key = name.toLowerCase()
      if (!grouped.has(key)) grouped.set(key, { name, ratings: [] })
      const entry = grouped.get(key)
      entry.name = name
      entry.ratings.push({ date: log.date, feeling })
    }
  }

  const exercises = [...grouped.values()]
    .map((entry) => {
      const first = entry.ratings[0].feeling
      const last = entry.ratings[entry.ratings.length - 1].feeling
      return {
        name: entry.name,
        count: entry.ratings.length,
        firstEmoji: first.emoji,
        lastEmoji: last.emoji,
        firstLabel: first.label,
        lastLabel: last.label,
        trend: trendLabel(first.score, last.score, entry.ratings.length),
        improved: entry.ratings.length >= 2 && last.score > first.score,
        declined: entry.ratings.length >= 2 && last.score < first.score,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const compared = exercises.filter((exercise) => exercise.count >= 2)
  const improved = compared.filter((exercise) => exercise.improved).length
  let summary
  if (!inRange.length) {
    summary = `No practice logged in the ${bounds.label.toLowerCase()}.`
  } else if (!exercises.length) {
    summary = `${inRange.length} practice ${inRange.length === 1 ? 'day' : 'days'}, with no exercise feelings marked yet.`
  } else if (!compared.length) {
    summary = `${inRange.length} practice ${inRange.length === 1 ? 'day' : 'days'}. Rate the same exercise on another day to see whether it feels easier.`
  } else if (improved === compared.length) {
    summary = `Every compared exercise feels better than it did at the start of this ${bounds.label.toLowerCase()}.`
  } else if (improved > 0) {
    summary = `${improved} of ${compared.length} exercises feel better than when this stretch started.`
  } else if (compared.every((exercise) => !exercise.declined)) {
    summary = 'Feelings are holding steady across the exercises you rated more than once.'
  } else {
    summary = 'Some exercises still feel harder than they did at the start of this stretch.'
  }

  return {
    ...bounds,
    practiceDays: inRange.length,
    exercises,
    summary,
  }
}
