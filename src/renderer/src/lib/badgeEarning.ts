import { SUBJECT_MODULE_IDS, type ModuleId } from '@renderer/academy/modules'

export interface ModuleAttemptRecord {
  attemptCount: number
  bestScorePct: number
  passed: boolean
  lastAttemptAt: number
  lastAttemptScorePct: number
}

export type AcademyProgressState = Partial<Record<ModuleId, ModuleAttemptRecord>>

export function createEmptyAttemptRecord(): ModuleAttemptRecord {
  return { attemptCount: 0, bestScorePct: 0, passed: false, lastAttemptAt: 0, lastAttemptScorePct: 0 }
}

/** Merges one new attempt into a module's existing record. Badges are never revoked once
 *  earned and a score never regresses once recorded: `bestScorePct` only ever increases and
 *  `passed` only ever flips from false to true, never back — retaking an already-passed
 *  module (still subject to the same cooldown) can only improve the stored record. */
export function applyAttempt(
  prev: ModuleAttemptRecord | undefined,
  scorePct: number,
  passed: boolean,
  now: number
): ModuleAttemptRecord {
  const base = prev ?? createEmptyAttemptRecord()
  return {
    attemptCount: base.attemptCount + 1,
    bestScorePct: Math.max(base.bestScorePct, scorePct),
    passed: base.passed || passed,
    lastAttemptAt: now,
    lastAttemptScorePct: scorePct
  }
}

/** The Final Exam only becomes attemptable once all 4 category modules have passed. Every
 *  other module is always attemptable (subject to its own cooldown, checked separately). */
export function isModuleUnlocked(moduleId: ModuleId, progress: AcademyProgressState): boolean {
  if (moduleId !== 'final') return true
  return SUBJECT_MODULE_IDS.every((id) => progress[id]?.passed === true)
}

/** Diffs two progress snapshots and returns the module ids that just flipped from
 *  not-passed to passed — used to trigger the badge-unlock celebration exactly once.
 *  Idempotent: diffing a state against itself (or an attempt that didn't change anything)
 *  always returns an empty array. */
export function diffNewlyEarnedBadges(prev: AcademyProgressState, next: AcademyProgressState): ModuleId[] {
  const ids: ModuleId[] = ['assetTypes', 'trend', 'risk', 'options', 'final']
  return ids.filter((id) => !prev[id]?.passed && next[id]?.passed === true)
}
