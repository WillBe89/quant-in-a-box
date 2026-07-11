import type { LessonCategory } from './lessons'
import { LESSONS } from './lessons'

/** The 5 badge-earning Modules: the 4 existing Library categories (zero new taxonomy — see
 *  lessons.ts) plus a 5th "final" module whose pool draws proportionally from all 4. Exactly
 *  5 entries, permanently — this is a small closed set, not an open-ended user-created list
 *  (contrast with lib/portfolioStyle.ts's modulo-cycling, which exists for the opposite case). */
export type ModuleId = 'assetTypes' | 'trend' | 'risk' | 'options' | 'final'

export const SUBJECT_MODULE_IDS: ModuleId[] = ['assetTypes', 'trend', 'risk', 'options']
export const MODULE_ID_ORDER: ModuleId[] = ['assetTypes', 'trend', 'risk', 'options', 'final']

export interface ModuleMeta {
  id: ModuleId
  /** Categories this module's question pool draws from — exactly one for the 4 subject
   *  modules, all 4 for the Final Exam. */
  categories: LessonCategory[]
}

export const MODULES: ModuleMeta[] = [
  { id: 'assetTypes', categories: ['assetTypes'] },
  { id: 'trend', categories: ['trend'] },
  { id: 'risk', categories: ['risk'] },
  { id: 'options', categories: ['options'] },
  { id: 'final', categories: ['assetTypes', 'trend', 'risk', 'options'] }
]

/** i18n key for each module's display title — the 4 subject modules reuse the Library's
 *  existing category labels (zero new taxonomy, zero duplicated translation work); only the
 *  Final Exam needs a new string. */
export const MODULE_TITLE_KEY: Record<ModuleId, string> = {
  assetTypes: 'academy.categoryAssetTypes',
  trend: 'academy.categoryTrend',
  risk: 'academy.categoryRisk',
  options: 'academy.categoryOptions',
  final: 'academy.modules.finalTitle'
}

export function getModule(id: ModuleId): ModuleMeta {
  const found = MODULES.find((m) => m.id === id)
  if (!found) throw new Error(`Unknown module id: ${id}`)
  return found
}

/** Lesson ids belonging to a module's categories, in lessons.ts's own declared order. */
export function lessonIdsForModule(id: ModuleId): string[] {
  const cats = new Set(getModule(id).categories)
  return LESSONS.filter((l) => cats.has(l.category)).map((l) => l.id)
}

const FINAL_EXAM_TARGET = 35
const SUBJECT_TARGET_MIN = 10
const SUBJECT_TARGET_MAX = 18
/** ~2.5-2.6 questions per lesson lands every subject module's target within the 10-18 band
 *  (assetTypes 5 lessons -> 13, trend 4 -> 10, risk 6 -> 16, options 2 -> floored to the 10 min). */
const QUESTIONS_PER_LESSON = 2.6

/** Target sample size for one attempt at this module — a target, not a guarantee: the actual
 *  sampler (lib/academyScoring.ts) caps gracefully at the pool's real size. Subject modules aim
 *  for ~10-18 weighted by lesson count; the Final Exam aims for ~30-40, sampled proportionally
 *  across all 4 categories. */
export function targetSampleSize(id: ModuleId): number {
  if (id === 'final') return FINAL_EXAM_TARGET
  const lessonCount = lessonIdsForModule(id).length
  return Math.min(SUBJECT_TARGET_MAX, Math.max(SUBJECT_TARGET_MIN, Math.round(lessonCount * QUESTIONS_PER_LESSON)))
}
