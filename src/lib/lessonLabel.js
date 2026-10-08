/** Fallback stored when a track has no lesson name. */
export const UNCATEGORISED_LESSON = 'Uncategorised'

/** Older builds wrote the American spelling. Display treats it as the same fallback. */
const LEGACY_UNCATEGORIZED = 'Uncategorized'

/**
 * Lesson name to persist. Empty values become the fallback.
 * A real name, including a legacy "Uncategorized" value, is kept as stored
 * so grouping, import matching, and backups stay stable.
 */
export function lessonForStorage(lesson) {
  const value = typeof lesson === 'string' ? lesson.trim() : ''
  return value || UNCATEGORISED_LESSON
}

/** Grouping key. Legacy and current fallback spellings share one group. */
export function lessonGroupKey(lesson) {
  const stored = lessonForStorage(lesson)
  return stored === LEGACY_UNCATEGORIZED ? UNCATEGORISED_LESSON : stored
}

/**
 * Visible lesson label. Does not change the stored name.
 * "Lesson 1" → "Lesson: Lesson 1"
 * "Uncategorized" / empty → "Lesson: Uncategorised"
 * A value that already starts with "Lesson:" is left alone.
 */
export function formatLessonLabel(lesson) {
  const name = lessonGroupKey(lesson)
  if (name.startsWith('Lesson:')) return name
  return `Lesson: ${name}`
}
