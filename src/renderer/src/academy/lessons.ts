export type LessonCategory = 'trend' | 'risk' | 'options'

export interface LessonMeta {
  id: string
  category: LessonCategory
}

/** Metadata only — every displayed string (title, summary, formula, howToUse,
 *  watchOutFor) lives in the i18n resources under academy.lessons.<id>.* so
 *  it can be translated per language. See src/renderer/src/i18n/locales/*.json. */
export const LESSONS: LessonMeta[] = [
  { id: 'ma', category: 'trend' },
  { id: 'boll', category: 'trend' },
  { id: 'rsi', category: 'trend' },
  { id: 'macd', category: 'trend' },
  { id: 'volatility', category: 'risk' },
  { id: 'sharpe', category: 'risk' },
  { id: 'sortino', category: 'risk' },
  { id: 'maxdd', category: 'risk' },
  { id: 'var', category: 'risk' },
  { id: 'beta', category: 'risk' },
  { id: 'greeks', category: 'options' },
  { id: 'blackscholes', category: 'options' }
]

export function getLesson(id: string): LessonMeta | undefined {
  return LESSONS.find((l) => l.id === id)
}
