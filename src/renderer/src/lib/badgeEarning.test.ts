import { describe, expect, it } from 'vitest'
import {
  applyAttempt,
  createEmptyAttemptRecord,
  diffNewlyEarnedBadges,
  isModuleUnlocked,
  type AcademyProgressState,
  type ModuleAttemptRecord
} from './badgeEarning'

describe('createEmptyAttemptRecord', () => {
  it('starts unattempted and unpassed', () => {
    expect(createEmptyAttemptRecord()).toEqual({
      attemptCount: 0,
      bestScorePct: 0,
      passed: false,
      lastAttemptAt: 0,
      lastAttemptScorePct: 0
    })
  })
})

describe('applyAttempt', () => {
  it('creates a first record from undefined', () => {
    const record = applyAttempt(undefined, 60, false, 1000)
    expect(record).toEqual({ attemptCount: 1, bestScorePct: 60, passed: false, lastAttemptAt: 1000, lastAttemptScorePct: 60 })
  })

  it('increments attemptCount on every attempt, pass or fail', () => {
    let record: ModuleAttemptRecord | undefined
    record = applyAttempt(record, 40, false, 100)
    record = applyAttempt(record, 50, false, 200)
    record = applyAttempt(record, 90, true, 300)
    expect(record.attemptCount).toBe(3)
  })

  it('bestScorePct only ever increases, never decreases on a lower subsequent score', () => {
    let record = applyAttempt(undefined, 90, true, 100)
    record = applyAttempt(record, 40, false, 200)
    expect(record.bestScorePct).toBe(90)
    expect(record.lastAttemptScorePct).toBe(40)
  })

  it('passed only ever flips from false to true, never back to false on a later failing attempt', () => {
    let record = applyAttempt(undefined, 85, true, 100)
    expect(record.passed).toBe(true)
    record = applyAttempt(record, 10, false, 200)
    expect(record.passed).toBe(true)
  })

  it('lastAttemptAt and lastAttemptScorePct always reflect the most recent attempt', () => {
    let record = applyAttempt(undefined, 85, true, 100)
    record = applyAttempt(record, 95, true, 500)
    expect(record.lastAttemptAt).toBe(500)
    expect(record.lastAttemptScorePct).toBe(95)
  })

  it('retaking an already-passed module can only improve the stored record, never regress it', () => {
    let record = applyAttempt(undefined, 100, true, 100)
    const before = { ...record }
    record = applyAttempt(record, 30, false, 9999)
    expect(record.bestScorePct).toBeGreaterThanOrEqual(before.bestScorePct)
    expect(record.passed).toBe(true)
  })
})

describe('isModuleUnlocked', () => {
  it('subject modules are always unlocked regardless of progress', () => {
    expect(isModuleUnlocked('assetTypes', {})).toBe(true)
    expect(isModuleUnlocked('trend', {})).toBe(true)
    expect(isModuleUnlocked('risk', {})).toBe(true)
    expect(isModuleUnlocked('options', {})).toBe(true)
  })

  it('final exam is locked until all 4 subject modules have passed', () => {
    const partial: AcademyProgressState = {
      assetTypes: { ...createEmptyAttemptRecord(), passed: true },
      trend: { ...createEmptyAttemptRecord(), passed: true },
      risk: { ...createEmptyAttemptRecord(), passed: false },
      options: { ...createEmptyAttemptRecord(), passed: true }
    }
    expect(isModuleUnlocked('final', partial)).toBe(false)
  })

  it('final exam unlocks once all 4 subject modules have passed', () => {
    const full: AcademyProgressState = {
      assetTypes: { ...createEmptyAttemptRecord(), passed: true },
      trend: { ...createEmptyAttemptRecord(), passed: true },
      risk: { ...createEmptyAttemptRecord(), passed: true },
      options: { ...createEmptyAttemptRecord(), passed: true }
    }
    expect(isModuleUnlocked('final', full)).toBe(true)
  })

  it('final exam is locked on a totally empty progress state', () => {
    expect(isModuleUnlocked('final', {})).toBe(false)
  })
})

describe('diffNewlyEarnedBadges', () => {
  it('reports a module that flipped from unpassed to passed', () => {
    const prev: AcademyProgressState = { risk: { ...createEmptyAttemptRecord(), passed: false } }
    const next: AcademyProgressState = { risk: { ...createEmptyAttemptRecord(), passed: true } }
    expect(diffNewlyEarnedBadges(prev, next)).toEqual(['risk'])
  })

  it('is idempotent — diffing a state against itself always returns empty', () => {
    const state: AcademyProgressState = {
      assetTypes: { ...createEmptyAttemptRecord(), passed: true },
      final: { ...createEmptyAttemptRecord(), passed: true }
    }
    expect(diffNewlyEarnedBadges(state, state)).toEqual([])
  })

  it('is idempotent — calling twice in a row after the same attempt only reports once', () => {
    const prev: AcademyProgressState = {}
    const next: AcademyProgressState = { options: { ...createEmptyAttemptRecord(), passed: true } }
    expect(diffNewlyEarnedBadges(prev, next)).toEqual(['options'])
    // Second diff call using next as both sides (simulating "check again after no new attempt").
    expect(diffNewlyEarnedBadges(next, next)).toEqual([])
  })

  it('does not report a module that was already passed in both snapshots', () => {
    const prev: AcademyProgressState = { trend: { ...createEmptyAttemptRecord(), passed: true } }
    const next: AcademyProgressState = { trend: { ...createEmptyAttemptRecord(), passed: true, bestScorePct: 95 } }
    expect(diffNewlyEarnedBadges(prev, next)).toEqual([])
  })

  it('does not report a module that remains unpassed', () => {
    const prev: AcademyProgressState = { options: { ...createEmptyAttemptRecord(), passed: false } }
    const next: AcademyProgressState = { options: { ...createEmptyAttemptRecord(), passed: false, attemptCount: 3 } }
    expect(diffNewlyEarnedBadges(prev, next)).toEqual([])
  })

  it('can report multiple newly-earned badges at once (e.g. final unlocking alongside the 4th subject module)', () => {
    const prev: AcademyProgressState = {
      assetTypes: { ...createEmptyAttemptRecord(), passed: true },
      trend: { ...createEmptyAttemptRecord(), passed: true },
      risk: { ...createEmptyAttemptRecord(), passed: true },
      options: { ...createEmptyAttemptRecord(), passed: false },
      final: { ...createEmptyAttemptRecord(), passed: false }
    }
    const next: AcademyProgressState = {
      ...prev,
      options: { ...createEmptyAttemptRecord(), passed: true },
      final: { ...createEmptyAttemptRecord(), passed: true }
    }
    const diff = diffNewlyEarnedBadges(prev, next)
    expect(diff.sort()).toEqual(['final', 'options'])
  })
})
