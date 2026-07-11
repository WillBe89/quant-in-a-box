import type { LessonCategory } from './lessons'

/** Metadata only — matching lessons.ts's exact split of structure-in-TS vs strings-in-i18n.
 *  Every displayed string (prompt, options, explanation) lives in the academy-quiz i18next
 *  namespace under `<id>.prompt` / `<id>.options.<index>` / `<id>.explanation` — see
 *  src/renderer/src/i18n/locales/academy-quiz/en.json. Correctness (`correctIndex`) is pure
 *  structure and deliberately never round-trips through i18n. */
export interface QuizQuestion {
  /** Lesson-prefixed id, e.g. "sharpe-04". */
  id: string
  /** Must resolve to a real id in lessons.ts. */
  lessonId: string
  category: LessonCategory
  /** Number of answer options, 2-5. */
  optionCount: number
  correctIndex: number
  difficulty?: 'easy' | 'medium' | 'hard'
}

function q(
  id: string,
  lessonId: string,
  category: LessonCategory,
  correctIndex: number,
  difficulty: QuizQuestion['difficulty'],
  optionCount = 4
): QuizQuestion {
  return { id, lessonId, category, optionCount, correctIndex, difficulty }
}

/** Placeholder/stub foundation content: 5 real, correct, hand-written questions per lesson
 *  across all 17 lessons (85 total) — fewer than the eventual full 10-20-per-lesson bank, but
 *  enough for every module's pool to sample from without ever degenerating to trivial
 *  repetition, including the smallest category (options, 2 lessons -> 10-question pool). A
 *  full content-authoring pass with a much larger bank per lesson is a separate later task. */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // --- assetTypes -----------------------------------------------------------------------
  q('assetStocks-01', 'assetStocks', 'assetTypes', 1, 'easy'),
  q('assetStocks-02', 'assetStocks', 'assetTypes', 2, 'easy'),
  q('assetStocks-03', 'assetStocks', 'assetTypes', 2, 'medium'),
  q('assetStocks-04', 'assetStocks', 'assetTypes', 1, 'medium'),
  q('assetStocks-05', 'assetStocks', 'assetTypes', 1, 'hard'),

  q('assetCrypto-01', 'assetCrypto', 'assetTypes', 1, 'easy'),
  q('assetCrypto-02', 'assetCrypto', 'assetTypes', 2, 'easy'),
  q('assetCrypto-03', 'assetCrypto', 'assetTypes', 1, 'medium'),
  q('assetCrypto-04', 'assetCrypto', 'assetTypes', 1, 'medium'),
  q('assetCrypto-05', 'assetCrypto', 'assetTypes', 1, 'hard'),

  q('assetBonds-01', 'assetBonds', 'assetTypes', 1, 'easy'),
  q('assetBonds-02', 'assetBonds', 'assetTypes', 1, 'easy'),
  q('assetBonds-03', 'assetBonds', 'assetTypes', 1, 'medium'),
  q('assetBonds-04', 'assetBonds', 'assetTypes', 1, 'medium'),
  q('assetBonds-05', 'assetBonds', 'assetTypes', 2, 'hard'),

  q('assetFx-01', 'assetFx', 'assetTypes', 1, 'easy'),
  q('assetFx-02', 'assetFx', 'assetTypes', 2, 'easy'),
  q('assetFx-03', 'assetFx', 'assetTypes', 1, 'medium'),
  q('assetFx-04', 'assetFx', 'assetTypes', 1, 'medium'),
  q('assetFx-05', 'assetFx', 'assetTypes', 2, 'hard'),

  q('assetRealEstate-01', 'assetRealEstate', 'assetTypes', 1, 'easy'),
  q('assetRealEstate-02', 'assetRealEstate', 'assetTypes', 2, 'easy'),
  q('assetRealEstate-03', 'assetRealEstate', 'assetTypes', 1, 'medium'),
  q('assetRealEstate-04', 'assetRealEstate', 'assetTypes', 0, 'medium'),
  q('assetRealEstate-05', 'assetRealEstate', 'assetTypes', 1, 'hard'),

  // --- trend ------------------------------------------------------------------------------
  q('ma-01', 'ma', 'trend', 1, 'easy'),
  q('ma-02', 'ma', 'trend', 0, 'easy'),
  q('ma-03', 'ma', 'trend', 1, 'medium'),
  q('ma-04', 'ma', 'trend', 1, 'medium'),
  q('ma-05', 'ma', 'trend', 1, 'hard'),

  q('boll-01', 'boll', 'trend', 1, 'easy'),
  q('boll-02', 'boll', 'trend', 1, 'easy'),
  q('boll-03', 'boll', 'trend', 1, 'medium'),
  q('boll-04', 'boll', 'trend', 1, 'medium'),
  q('boll-05', 'boll', 'trend', 1, 'hard'),

  q('rsi-01', 'rsi', 'trend', 1, 'easy'),
  q('rsi-02', 'rsi', 'trend', 1, 'easy'),
  q('rsi-03', 'rsi', 'trend', 1, 'medium'),
  q('rsi-04', 'rsi', 'trend', 1, 'medium'),
  q('rsi-05', 'rsi', 'trend', 1, 'hard'),

  q('macd-01', 'macd', 'trend', 0, 'easy'),
  q('macd-02', 'macd', 'trend', 1, 'easy'),
  q('macd-03', 'macd', 'trend', 1, 'medium'),
  q('macd-04', 'macd', 'trend', 1, 'medium'),
  q('macd-05', 'macd', 'trend', 1, 'hard'),

  // --- risk -------------------------------------------------------------------------------
  q('volatility-01', 'volatility', 'risk', 0, 'easy'),
  q('volatility-02', 'volatility', 'risk', 1, 'easy'),
  q('volatility-03', 'volatility', 'risk', 1, 'medium'),
  q('volatility-04', 'volatility', 'risk', 0, 'medium'),
  q('volatility-05', 'volatility', 'risk', 1, 'hard'),

  q('sharpe-01', 'sharpe', 'risk', 1, 'easy'),
  q('sharpe-02', 'sharpe', 'risk', 1, 'easy'),
  q('sharpe-03', 'sharpe', 'risk', 1, 'medium'),
  q('sharpe-04', 'sharpe', 'risk', 1, 'medium'),
  q('sharpe-05', 'sharpe', 'risk', 0, 'hard'),

  q('sortino-01', 'sortino', 'risk', 1, 'easy'),
  q('sortino-02', 'sortino', 'risk', 1, 'easy'),
  q('sortino-03', 'sortino', 'risk', 1, 'medium'),
  q('sortino-04', 'sortino', 'risk', 0, 'medium'),
  q('sortino-05', 'sortino', 'risk', 1, 'hard'),

  q('maxdd-01', 'maxdd', 'risk', 1, 'easy'),
  q('maxdd-02', 'maxdd', 'risk', 1, 'easy'),
  q('maxdd-03', 'maxdd', 'risk', 0, 'medium'),
  q('maxdd-04', 'maxdd', 'risk', 1, 'medium'),
  q('maxdd-05', 'maxdd', 'risk', 1, 'hard'),

  q('var-01', 'var', 'risk', 1, 'easy'),
  q('var-02', 'var', 'risk', 1, 'easy'),
  q('var-03', 'var', 'risk', 1, 'medium'),
  q('var-04', 'var', 'risk', 0, 'medium'),
  q('var-05', 'var', 'risk', 1, 'hard'),

  q('beta-01', 'beta', 'risk', 1, 'easy'),
  q('beta-02', 'beta', 'risk', 1, 'easy'),
  q('beta-03', 'beta', 'risk', 1, 'medium'),
  q('beta-04', 'beta', 'risk', 0, 'medium'),
  q('beta-05', 'beta', 'risk', 1, 'hard'),

  // --- options ------------------------------------------------------------------------------
  q('greeks-01', 'greeks', 'options', 1, 'easy'),
  q('greeks-02', 'greeks', 'options', 1, 'easy'),
  q('greeks-03', 'greeks', 'options', 0, 'medium'),
  q('greeks-04', 'greeks', 'options', 1, 'medium'),
  q('greeks-05', 'greeks', 'options', 1, 'hard'),

  q('blackscholes-01', 'blackscholes', 'options', 1, 'easy'),
  q('blackscholes-02', 'blackscholes', 'options', 3, 'medium', 4),
  q('blackscholes-03', 'blackscholes', 'options', 1, 'medium'),
  q('blackscholes-04', 'blackscholes', 'options', 2, 'medium'),
  q('blackscholes-05', 'blackscholes', 'options', 1, 'hard')
]

export function questionsForLesson(lessonId: string): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter((qq) => qq.lessonId === lessonId)
}

export function questionsForCategory(category: LessonCategory): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter((qq) => qq.category === category)
}
