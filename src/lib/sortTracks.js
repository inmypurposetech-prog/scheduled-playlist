export const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'lesson-asc', label: 'Lesson A–Z' },
  { value: 'lesson-desc', label: 'Lesson Z–A' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
]

function compareText(a, b) {
  return (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' })
}

export function sortTracks(tracks, sortBy) {
  const list = [...tracks]
  switch (sortBy) {
    case 'name-desc':
      return list.sort((a, b) => compareText(b.name, a.name))
    case 'lesson-asc':
      return list.sort((a, b) => compareText(a.lesson, b.lesson) || compareText(a.name, b.name))
    case 'lesson-desc':
      return list.sort((a, b) => compareText(b.lesson, a.lesson) || compareText(a.name, b.name))
    case 'newest':
      return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || (b.id || 0) - (a.id || 0))
    case 'oldest':
      return list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || (a.id || 0) - (b.id || 0))
    case 'name-asc':
    default:
      return list.sort((a, b) => compareText(a.name, b.name))
  }
}
