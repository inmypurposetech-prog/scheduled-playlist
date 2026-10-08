import assert from 'node:assert/strict'
import {
  formatLessonLabel,
  lessonForStorage,
  lessonGroupKey,
} from '../src/lib/lessonLabel.js'

function pass(name) {
  console.log(`ok - ${name}`)
}

assert.equal(formatLessonLabel('Lesson 1'), 'Lesson: Lesson 1')
assert.equal(formatLessonLabel(''), 'Lesson: Uncategorised')
assert.equal(formatLessonLabel('   '), 'Lesson: Uncategorised')
assert.equal(formatLessonLabel(undefined), 'Lesson: Uncategorised')
assert.equal(formatLessonLabel('Uncategorised'), 'Lesson: Uncategorised')
assert.equal(formatLessonLabel('Uncategorized'), 'Lesson: Uncategorised')
assert.equal(formatLessonLabel('Lesson: Lesson 1'), 'Lesson: Lesson 1')
assert.equal(formatLessonLabel('Lesson: Uncategorised'), 'Lesson: Uncategorised')
pass('formatLessonLabel')

assert.equal(lessonForStorage('Lesson 1'), 'Lesson 1')
assert.equal(lessonForStorage('  Lesson 1  '), 'Lesson 1')
assert.equal(lessonForStorage(''), 'Uncategorised')
assert.equal(lessonForStorage('Uncategorized'), 'Uncategorized')
assert.equal(lessonForStorage('Lesson: Lesson 1'), 'Lesson: Lesson 1')
pass('lessonForStorage')

assert.equal(lessonGroupKey('Uncategorized'), 'Uncategorised')
assert.equal(lessonGroupKey('Uncategorised'), 'Uncategorised')
assert.equal(lessonGroupKey('Lesson 1'), 'Lesson 1')
pass('lessonGroupKey')

console.log('All lesson label tests passed')
