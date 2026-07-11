import { MODULE_ID_ORDER, type ModuleId } from '@renderer/academy/modules'
import type { AcademyProgressState, ModuleAttemptRecord } from '@renderer/lib/badgeEarning'

const ACADEMY_PROGRESS_STORAGE_KEY = 'qiab:academyProgress:v1'

function isValidRecord(x: unknown): x is ModuleAttemptRecord {
  if (!x || typeof x !== 'object') return false
  const r = x as Record<string, unknown>
  return (
    typeof r.attemptCount === 'number' &&
    typeof r.bestScorePct === 'number' &&
    typeof r.passed === 'boolean' &&
    typeof r.lastAttemptAt === 'number' &&
    typeof r.lastAttemptScorePct === 'number'
  )
}

/** Loads persisted Academy progress from localStorage, discarding anything that doesn't match
 *  the expected shape (corrupt JSON, an unknown module id, a malformed record) rather than
 *  letting it crash the app or silently propagate bad data. */
export function loadAcademyProgress(): AcademyProgressState {
  try {
    const raw = localStorage.getItem(ACADEMY_PROGRESS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const result: AcademyProgressState = {}
    for (const id of MODULE_ID_ORDER) {
      const candidate = (parsed as Record<string, unknown>)[id]
      if (isValidRecord(candidate)) result[id] = candidate
    }
    return result
  } catch {
    return {}
  }
}

export function saveAcademyProgress(state: AcademyProgressState): void {
  try {
    localStorage.setItem(ACADEMY_PROGRESS_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // best-effort persistence; ignore quota/availability errors
  }
}

export function clearAcademyProgress(): void {
  try {
    localStorage.removeItem(ACADEMY_PROGRESS_STORAGE_KEY)
  } catch {
    // best-effort; ignore
  }
}

export type { ModuleId, AcademyProgressState, ModuleAttemptRecord }
