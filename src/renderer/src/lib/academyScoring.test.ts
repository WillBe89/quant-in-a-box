import { describe, expect, it } from 'vitest'
import {
  MIN_PASS_RATIO,
  sampleFinalExam,
  sampleModuleQuiz,
  sampleQuestions,
  scoreAttempt,
  splitProportionally
} from './academyScoring'
import type { QuizQuestion } from '@renderer/academy/quizQuestions'
import type { LessonCategory } from '@renderer/academy/lessons'

/** Same small deterministic LCG shape as mockData.ts's seededRandom, so sampling tests are
 *  100% reproducible without depending on Math.random. */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function makeQuestion(id: string, category: LessonCategory): QuizQuestion {
  return { id, lessonId: `${category}Lesson`, category, optionCount: 4, correctIndex: 0 }
}

describe('scoreAttempt', () => {
  it('rounds scorePct to the nearest whole percent', () => {
    expect(scoreAttempt(1, 3).scorePct).toBe(33)
    expect(scoreAttempt(2, 3).scorePct).toBe(67)
  })

  it('passes at exactly the 80% boundary (4/5)', () => {
    const result = scoreAttempt(4, 5)
    expect(result.scorePct).toBe(80)
    expect(result.passed).toBe(true)
  })

  it('passes at exactly the 80% boundary via a different denominator (12/15)', () => {
    const result = scoreAttempt(12, 15)
    expect(result.scorePct).toBe(80)
    expect(result.passed).toBe(true)
  })

  it('fails just below the 80% boundary (7/9 ~ 77.8%)', () => {
    const result = scoreAttempt(7, 9)
    expect(result.passed).toBe(false)
  })

  it('passes comfortably above the boundary', () => {
    expect(scoreAttempt(9, 10).passed).toBe(true)
  })

  it('treats a zero-question attempt as a non-passing 0%', () => {
    expect(scoreAttempt(0, 0)).toEqual({ scorePct: 0, passed: false })
  })

  it('MIN_PASS_RATIO is 0.8', () => {
    expect(MIN_PASS_RATIO).toBe(0.8)
  })
})

describe('sampleQuestions', () => {
  it('is deterministic given the same rng seed', () => {
    const pool = Array.from({ length: 20 }, (_, i) => i)
    const a = sampleQuestions(pool, 5, seededRandom(42))
    const b = sampleQuestions(pool, 5, seededRandom(42))
    expect(a).toEqual(b)
  })

  it('never returns duplicates within one sample', () => {
    const pool = Array.from({ length: 20 }, (_, i) => i)
    const result = sampleQuestions(pool, 10, seededRandom(7))
    expect(new Set(result).size).toBe(result.length)
  })

  it('returns exactly `count` items when the pool is larger', () => {
    const pool = Array.from({ length: 20 }, (_, i) => i)
    expect(sampleQuestions(pool, 10, seededRandom(1)).length).toBe(10)
  })

  it('gracefully caps at pool size instead of duplicating or throwing when count exceeds pool size', () => {
    const pool = Array.from({ length: 10 }, (_, i) => i)
    const result = sampleQuestions(pool, 18, seededRandom(3))
    expect(result.length).toBe(10)
    expect(new Set(result).size).toBe(10)
  })

  it('returns an empty array for an empty pool without throwing', () => {
    expect(sampleQuestions([], 10, seededRandom(3))).toEqual([])
  })

  it('defaults to Math.random when no rng is supplied', () => {
    const pool = [1, 2, 3]
    expect(() => sampleQuestions(pool, 2)).not.toThrow()
  })
})

describe('splitProportionally', () => {
  it('sums back to exactly the target', () => {
    const parts = splitProportionally(35, [5, 4, 6, 2])
    expect(parts.reduce((s, p) => s + p, 0)).toBe(35)
  })

  it('gives every non-zero-weight bucket a share proportional to its weight', () => {
    const parts = splitProportionally(17, [5, 4, 6, 2])
    // 17 total lessons split into a 17-question target should reproduce the lesson counts exactly.
    expect(parts).toEqual([5, 4, 6, 2])
  })

  it('returns all zeros when total weight is zero', () => {
    expect(splitProportionally(10, [0, 0, 0])).toEqual([0, 0, 0])
  })

  it('returns all zeros when target is zero', () => {
    expect(splitProportionally(0, [5, 4, 6, 2])).toEqual([0, 0, 0, 0])
  })
})

describe('sampleModuleQuiz (options category small-pool graceful cap)', () => {
  const optionsPool: QuizQuestion[] = Array.from({ length: 10 }, (_, i) => makeQuestion(`opt-${i}`, 'options'))

  it('caps at the options pool size (10) even though the target is higher (e.g. 18)', () => {
    const result = sampleModuleQuiz(optionsPool, 'options', 18, seededRandom(11))
    expect(result.length).toBe(10)
    expect(new Set(result.map((q) => q.id)).size).toBe(10)
  })

  it('never includes a question from another category', () => {
    const mixedPool: QuizQuestion[] = [
      ...optionsPool,
      makeQuestion('risk-0', 'risk'),
      makeQuestion('risk-1', 'risk')
    ]
    const result = sampleModuleQuiz(mixedPool, 'options', 18, seededRandom(5))
    expect(result.every((q) => q.category === 'options')).toBe(true)
  })

  it('samples down to the target when the pool is larger than the target', () => {
    const bigPool: QuizQuestion[] = Array.from({ length: 25 }, (_, i) => makeQuestion(`risk-${i}`, 'risk'))
    const result = sampleModuleQuiz(bigPool, 'risk', 16, seededRandom(9))
    expect(result.length).toBe(16)
  })
})

describe('sampleFinalExam', () => {
  const pool: QuizQuestion[] = [
    ...Array.from({ length: 25 }, (_, i) => makeQuestion(`assetTypes-${i}`, 'assetTypes')),
    ...Array.from({ length: 20 }, (_, i) => makeQuestion(`trend-${i}`, 'trend')),
    ...Array.from({ length: 30 }, (_, i) => makeQuestion(`risk-${i}`, 'risk')),
    ...Array.from({ length: 10 }, (_, i) => makeQuestion(`options-${i}`, 'options'))
  ]
  const categories: LessonCategory[] = ['assetTypes', 'trend', 'risk', 'options']

  it('draws from every category', () => {
    const result = sampleFinalExam(pool, categories, 35, seededRandom(13))
    const seenCategories = new Set(result.map((q) => q.category))
    expect(seenCategories.size).toBe(4)
  })

  it('never exceeds the target count and never duplicates a question', () => {
    const result = sampleFinalExam(pool, categories, 35, seededRandom(21))
    expect(result.length).toBeLessThanOrEqual(35)
    expect(new Set(result.map((q) => q.id)).size).toBe(result.length)
  })

  it('gracefully caps when the smallest category (options) pool is smaller than its proportional share', () => {
    const tinyOptionsPool: QuizQuestion[] = [
      ...Array.from({ length: 25 }, (_, i) => makeQuestion(`assetTypes-${i}`, 'assetTypes')),
      ...Array.from({ length: 20 }, (_, i) => makeQuestion(`trend-${i}`, 'trend')),
      ...Array.from({ length: 30 }, (_, i) => makeQuestion(`risk-${i}`, 'risk')),
      ...Array.from({ length: 3 }, (_, i) => makeQuestion(`options-${i}`, 'options'))
    ]
    const result = sampleFinalExam(tinyOptionsPool, categories, 35, seededRandom(21))
    const optionsCount = result.filter((q) => q.category === 'options').length
    expect(optionsCount).toBeLessThanOrEqual(3)
    expect(result.length).toBeLessThanOrEqual(35)
  })
})
