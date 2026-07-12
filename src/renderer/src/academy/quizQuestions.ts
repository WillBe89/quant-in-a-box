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

/** Full content bank (Phase 10): 12-18 real, cross-checked questions per lesson across all 17
 *  lessons, replacing the earlier 5-per-lesson placeholder stub. Every question tests material
 *  actually taught in that lesson's summary/formula/howToUse/watchOutFor copy (academy.lessons.*
 *  in i18n/locales/en.json) and, where quantitative, is cross-checked against the real formulas
 *  in lib/quant.ts. The Options & Derivatives category (greeks, blackscholes) intentionally gets
 *  the largest per-lesson pools (18 each, 36 total) since it's the smallest category (2 lessons)
 *  and its module quiz's target sample size (10, per modules.ts) would otherwise leave little
 *  room for a shuffled pool to feel different across retakes. */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // --- assetTypes -----------------------------------------------------------------------
  q('assetStocks-01', 'assetStocks', 'assetTypes', 1, 'easy'),
  q('assetStocks-02', 'assetStocks', 'assetTypes', 1, 'easy'),
  q('assetStocks-03', 'assetStocks', 'assetTypes', 1, 'medium'),
  q('assetStocks-04', 'assetStocks', 'assetTypes', 1, 'medium'),
  q('assetStocks-05', 'assetStocks', 'assetTypes', 1, 'medium'),
  q('assetStocks-06', 'assetStocks', 'assetTypes', 0, 'easy'),
  q('assetStocks-07', 'assetStocks', 'assetTypes', 1, 'medium'),
  q('assetStocks-08', 'assetStocks', 'assetTypes', 1, 'hard'),
  q('assetStocks-09', 'assetStocks', 'assetTypes', 1, 'medium'),
  q('assetStocks-10', 'assetStocks', 'assetTypes', 0, 'hard'),
  q('assetStocks-11', 'assetStocks', 'assetTypes', 1, 'easy'),
  q('assetStocks-12', 'assetStocks', 'assetTypes', 1, 'medium'),
  q('assetStocks-13', 'assetStocks', 'assetTypes', 1, 'hard'),
  q('assetStocks-14', 'assetStocks', 'assetTypes', 0, 'medium'),
  q('assetStocks-15', 'assetStocks', 'assetTypes', 0, 'easy'),

  q('assetCrypto-01', 'assetCrypto', 'assetTypes', 1, 'easy'),
  q('assetCrypto-02', 'assetCrypto', 'assetTypes', 2, 'medium'),
  q('assetCrypto-03', 'assetCrypto', 'assetTypes', 1, 'medium'),
  q('assetCrypto-04', 'assetCrypto', 'assetTypes', 1, 'medium'),
  q('assetCrypto-05', 'assetCrypto', 'assetTypes', 1, 'medium'),
  q('assetCrypto-06', 'assetCrypto', 'assetTypes', 2, 'hard'),
  q('assetCrypto-07', 'assetCrypto', 'assetTypes', 0, 'medium'),
  q('assetCrypto-08', 'assetCrypto', 'assetTypes', 2, 'easy'),
  q('assetCrypto-09', 'assetCrypto', 'assetTypes', 1, 'hard'),
  q('assetCrypto-10', 'assetCrypto', 'assetTypes', 1, 'medium'),
  q('assetCrypto-11', 'assetCrypto', 'assetTypes', 2, 'easy'),
  q('assetCrypto-12', 'assetCrypto', 'assetTypes', 1, 'hard'),
  q('assetCrypto-13', 'assetCrypto', 'assetTypes', 1, 'medium'),
  q('assetCrypto-14', 'assetCrypto', 'assetTypes', 1, 'hard'),
  q('assetCrypto-15', 'assetCrypto', 'assetTypes', 1, 'easy'),

  q('assetBonds-01', 'assetBonds', 'assetTypes', 1, 'easy'),
  q('assetBonds-02', 'assetBonds', 'assetTypes', 1, 'medium'),
  q('assetBonds-03', 'assetBonds', 'assetTypes', 1, 'medium'),
  q('assetBonds-04', 'assetBonds', 'assetTypes', 1, 'medium'),
  q('assetBonds-05', 'assetBonds', 'assetTypes', 2, 'hard'),
  q('assetBonds-06', 'assetBonds', 'assetTypes', 0, 'easy'),
  q('assetBonds-07', 'assetBonds', 'assetTypes', 1, 'medium'),
  q('assetBonds-08', 'assetBonds', 'assetTypes', 1, 'easy'),
  q('assetBonds-09', 'assetBonds', 'assetTypes', 1, 'medium'),
  q('assetBonds-10', 'assetBonds', 'assetTypes', 0, 'medium'),
  q('assetBonds-11', 'assetBonds', 'assetTypes', 1, 'hard'),
  q('assetBonds-12', 'assetBonds', 'assetTypes', 1, 'hard'),
  q('assetBonds-13', 'assetBonds', 'assetTypes', 1, 'easy'),
  q('assetBonds-14', 'assetBonds', 'assetTypes', 1, 'medium'),
  q('assetBonds-15', 'assetBonds', 'assetTypes', 1, 'hard'),

  q('assetFx-01', 'assetFx', 'assetTypes', 1, 'easy'),
  q('assetFx-02', 'assetFx', 'assetTypes', 2, 'easy'),
  q('assetFx-03', 'assetFx', 'assetTypes', 1, 'hard'),
  q('assetFx-04', 'assetFx', 'assetTypes', 1, 'medium'),
  q('assetFx-05', 'assetFx', 'assetTypes', 1, 'medium'),
  q('assetFx-06', 'assetFx', 'assetTypes', 2, 'hard'),
  q('assetFx-07', 'assetFx', 'assetTypes', 1, 'medium'),
  q('assetFx-08', 'assetFx', 'assetTypes', 1, 'hard'),
  q('assetFx-09', 'assetFx', 'assetTypes', 1, 'medium'),
  q('assetFx-10', 'assetFx', 'assetTypes', 0, 'medium'),
  q('assetFx-11', 'assetFx', 'assetTypes', 1, 'easy'),
  q('assetFx-12', 'assetFx', 'assetTypes', 1, 'medium'),
  q('assetFx-13', 'assetFx', 'assetTypes', 0, 'easy'),
  q('assetFx-14', 'assetFx', 'assetTypes', 1, 'easy'),
  q('assetFx-15', 'assetFx', 'assetTypes', 1, 'medium'),

  q('assetRealEstate-01', 'assetRealEstate', 'assetTypes', 1, 'easy'),
  q('assetRealEstate-02', 'assetRealEstate', 'assetTypes', 1, 'medium'),
  q('assetRealEstate-03', 'assetRealEstate', 'assetTypes', 1, 'medium'),
  q('assetRealEstate-04', 'assetRealEstate', 'assetTypes', 0, 'hard'),
  q('assetRealEstate-05', 'assetRealEstate', 'assetTypes', 1, 'medium'),
  q('assetRealEstate-06', 'assetRealEstate', 'assetTypes', 1, 'easy'),
  q('assetRealEstate-07', 'assetRealEstate', 'assetTypes', 1, 'medium'),
  q('assetRealEstate-08', 'assetRealEstate', 'assetTypes', 1, 'hard'),
  q('assetRealEstate-09', 'assetRealEstate', 'assetTypes', 1, 'medium'),
  q('assetRealEstate-10', 'assetRealEstate', 'assetTypes', 0, 'easy'),
  q('assetRealEstate-11', 'assetRealEstate', 'assetTypes', 2, 'hard'),
  q('assetRealEstate-12', 'assetRealEstate', 'assetTypes', 0, 'hard'),
  q('assetRealEstate-13', 'assetRealEstate', 'assetTypes', 1, 'medium'),
  q('assetRealEstate-14', 'assetRealEstate', 'assetTypes', 1, 'easy'),
  q('assetRealEstate-15', 'assetRealEstate', 'assetTypes', 1, 'hard'),


  // --- trend ------------------------------------------------------------------------------
  q('ma-01', 'ma', 'trend', 1, 'easy'),
  q('ma-02', 'ma', 'trend', 0, 'easy'),
  q('ma-03', 'ma', 'trend', 1, 'medium'),
  q('ma-04', 'ma', 'trend', 1, 'medium'),
  q('ma-05', 'ma', 'trend', 1, 'medium'),
  q('ma-06', 'ma', 'trend', 1, 'easy'),
  q('ma-07', 'ma', 'trend', 1, 'hard'),
  q('ma-08', 'ma', 'trend', 1, 'medium'),
  q('ma-09', 'ma', 'trend', 1, 'medium'),
  q('ma-10', 'ma', 'trend', 1, 'medium'),
  q('ma-11', 'ma', 'trend', 2, 'medium'),
  q('ma-12', 'ma', 'trend', 1, 'hard'),
  q('ma-13', 'ma', 'trend', 1, 'hard'),
  q('ma-14', 'ma', 'trend', 1, 'hard'),
  q('ma-15', 'ma', 'trend', 1, 'easy'),

  q('boll-01', 'boll', 'trend', 1, 'easy'),
  q('boll-02', 'boll', 'trend', 1, 'easy'),
  q('boll-03', 'boll', 'trend', 1, 'medium'),
  q('boll-04', 'boll', 'trend', 1, 'medium'),
  q('boll-05', 'boll', 'trend', 1, 'medium'),
  q('boll-06', 'boll', 'trend', 1, 'hard'),
  q('boll-07', 'boll', 'trend', 1, 'hard'),
  q('boll-08', 'boll', 'trend', 1, 'medium'),
  q('boll-09', 'boll', 'trend', 1, 'medium'),
  q('boll-10', 'boll', 'trend', 1, 'medium'),
  q('boll-11', 'boll', 'trend', 1, 'easy'),
  q('boll-12', 'boll', 'trend', 1, 'hard'),
  q('boll-13', 'boll', 'trend', 1, 'medium'),
  q('boll-14', 'boll', 'trend', 1, 'medium'),
  q('boll-15', 'boll', 'trend', 2, 'easy'),

  q('rsi-01', 'rsi', 'trend', 1, 'easy'),
  q('rsi-02', 'rsi', 'trend', 1, 'easy'),
  q('rsi-03', 'rsi', 'trend', 1, 'medium'),
  q('rsi-04', 'rsi', 'trend', 1, 'medium'),
  q('rsi-05', 'rsi', 'trend', 1, 'medium'),
  q('rsi-06', 'rsi', 'trend', 2, 'hard'),
  q('rsi-07', 'rsi', 'trend', 2, 'hard'),
  q('rsi-08', 'rsi', 'trend', 0, 'easy'),
  q('rsi-09', 'rsi', 'trend', 1, 'medium'),
  q('rsi-10', 'rsi', 'trend', 1, 'medium'),
  q('rsi-11', 'rsi', 'trend', 2, 'hard'),
  q('rsi-12', 'rsi', 'trend', 1, 'medium'),
  q('rsi-13', 'rsi', 'trend', 1, 'hard'),
  q('rsi-14', 'rsi', 'trend', 1, 'medium'),
  q('rsi-15', 'rsi', 'trend', 1, 'easy'),

  q('macd-01', 'macd', 'trend', 0, 'easy'),
  q('macd-02', 'macd', 'trend', 1, 'easy'),
  q('macd-03', 'macd', 'trend', 1, 'medium'),
  q('macd-04', 'macd', 'trend', 1, 'medium'),
  q('macd-05', 'macd', 'trend', 1, 'medium'),
  q('macd-06', 'macd', 'trend', 1, 'medium'),
  q('macd-07', 'macd', 'trend', 0, 'medium'),
  q('macd-08', 'macd', 'trend', 1, 'hard'),
  q('macd-09', 'macd', 'trend', 1, 'hard'),
  q('macd-10', 'macd', 'trend', 0, 'medium'),
  q('macd-11', 'macd', 'trend', 1, 'easy'),
  q('macd-12', 'macd', 'trend', 3, 'easy'),
  q('macd-13', 'macd', 'trend', 1, 'hard'),
  q('macd-14', 'macd', 'trend', 1, 'hard'),
  q('macd-15', 'macd', 'trend', 1, 'medium'),


  // --- risk -------------------------------------------------------------------------------
  q('volatility-01', 'volatility', 'risk', 0, 'easy'),
  q('volatility-02', 'volatility', 'risk', 1, 'medium'),
  q('volatility-03', 'volatility', 'risk', 1, 'medium'),
  q('volatility-04', 'volatility', 'risk', 0, 'medium'),
  q('volatility-05', 'volatility', 'risk', 1, 'medium'),
  q('volatility-06', 'volatility', 'risk', 2, 'hard'),
  q('volatility-07', 'volatility', 'risk', 2, 'hard'),
  q('volatility-08', 'volatility', 'risk', 1, 'medium'),
  q('volatility-09', 'volatility', 'risk', 0, 'easy'),
  q('volatility-10', 'volatility', 'risk', 1, 'medium'),
  q('volatility-11', 'volatility', 'risk', 2, 'hard'),
  q('volatility-12', 'volatility', 'risk', 1, 'medium'),
  q('volatility-13', 'volatility', 'risk', 1, 'easy'),
  q('volatility-14', 'volatility', 'risk', 1, 'hard'),
  q('volatility-15', 'volatility', 'risk', 2, 'easy'),

  q('sharpe-01', 'sharpe', 'risk', 1, 'easy'),
  q('sharpe-02', 'sharpe', 'risk', 1, 'easy'),
  q('sharpe-03', 'sharpe', 'risk', 1, 'medium'),
  q('sharpe-04', 'sharpe', 'risk', 1, 'medium'),
  q('sharpe-05', 'sharpe', 'risk', 0, 'hard'),
  q('sharpe-06', 'sharpe', 'risk', 1, 'hard'),
  q('sharpe-07', 'sharpe', 'risk', 1, 'hard'),
  q('sharpe-08', 'sharpe', 'risk', 1, 'easy'),
  q('sharpe-09', 'sharpe', 'risk', 2, 'easy'),
  q('sharpe-10', 'sharpe', 'risk', 0, 'medium'),
  q('sharpe-11', 'sharpe', 'risk', 0, 'medium'),
  q('sharpe-12', 'sharpe', 'risk', 1, 'medium'),
  q('sharpe-13', 'sharpe', 'risk', 1, 'hard'),
  q('sharpe-14', 'sharpe', 'risk', 2, 'hard'),
  q('sharpe-15', 'sharpe', 'risk', 1, 'medium'),

  q('sortino-01', 'sortino', 'risk', 1, 'easy'),
  q('sortino-02', 'sortino', 'risk', 1, 'easy'),
  q('sortino-03', 'sortino', 'risk', 1, 'medium'),
  q('sortino-04', 'sortino', 'risk', 0, 'hard'),
  q('sortino-05', 'sortino', 'risk', 1, 'medium'),
  q('sortino-06', 'sortino', 'risk', 1, 'hard'),
  q('sortino-07', 'sortino', 'risk', 1, 'hard'),
  q('sortino-08', 'sortino', 'risk', 1, 'medium'),
  q('sortino-09', 'sortino', 'risk', 1, 'easy'),
  q('sortino-10', 'sortino', 'risk', 1, 'medium'),
  q('sortino-11', 'sortino', 'risk', 1, 'hard'),
  q('sortino-12', 'sortino', 'risk', 1, 'medium'),
  q('sortino-13', 'sortino', 'risk', 1, 'easy'),
  q('sortino-14', 'sortino', 'risk', 1, 'hard'),
  q('sortino-15', 'sortino', 'risk', 1, 'medium'),

  q('maxdd-01', 'maxdd', 'risk', 1, 'easy'),
  q('maxdd-02', 'maxdd', 'risk', 1, 'easy'),
  q('maxdd-03', 'maxdd', 'risk', 0, 'medium'),
  q('maxdd-04', 'maxdd', 'risk', 1, 'medium'),
  q('maxdd-05', 'maxdd', 'risk', 1, 'medium'),
  q('maxdd-06', 'maxdd', 'risk', 1, 'hard'),
  q('maxdd-07', 'maxdd', 'risk', 1, 'hard'),
  q('maxdd-08', 'maxdd', 'risk', 1, 'medium'),
  q('maxdd-09', 'maxdd', 'risk', 1, 'medium'),
  q('maxdd-10', 'maxdd', 'risk', 1, 'hard'),
  q('maxdd-11', 'maxdd', 'risk', 1, 'medium'),
  q('maxdd-12', 'maxdd', 'risk', 1, 'easy'),
  q('maxdd-13', 'maxdd', 'risk', 1, 'hard'),
  q('maxdd-14', 'maxdd', 'risk', 1, 'medium'),
  q('maxdd-15', 'maxdd', 'risk', 1, 'easy'),

  q('var-01', 'var', 'risk', 1, 'easy'),
  q('var-02', 'var', 'risk', 1, 'medium'),
  q('var-03', 'var', 'risk', 1, 'medium'),
  q('var-04', 'var', 'risk', 0, 'medium'),
  q('var-05', 'var', 'risk', 1, 'medium'),
  q('var-06', 'var', 'risk', 0, 'hard'),
  q('var-07', 'var', 'risk', 1, 'hard'),
  q('var-08', 'var', 'risk', 1, 'medium'),
  q('var-09', 'var', 'risk', 1, 'medium'),
  q('var-10', 'var', 'risk', 2, 'easy'),
  q('var-11', 'var', 'risk', 1, 'easy'),
  q('var-12', 'var', 'risk', 1, 'hard'),
  q('var-13', 'var', 'risk', 1, 'medium'),
  q('var-14', 'var', 'risk', 1, 'easy'),
  q('var-15', 'var', 'risk', 1, 'easy'),

  q('beta-01', 'beta', 'risk', 1, 'easy'),
  q('beta-02', 'beta', 'risk', 1, 'medium'),
  q('beta-03', 'beta', 'risk', 1, 'medium'),
  q('beta-04', 'beta', 'risk', 0, 'medium'),
  q('beta-05', 'beta', 'risk', 1, 'hard'),
  q('beta-06', 'beta', 'risk', 1, 'hard'),
  q('beta-07', 'beta', 'risk', 0, 'hard'),
  q('beta-08', 'beta', 'risk', 1, 'easy'),
  q('beta-09', 'beta', 'risk', 1, 'medium'),
  q('beta-10', 'beta', 'risk', 0, 'easy'),
  q('beta-11', 'beta', 'risk', 1, 'medium'),
  q('beta-12', 'beta', 'risk', 1, 'hard'),
  q('beta-13', 'beta', 'risk', 1, 'easy'),
  q('beta-14', 'beta', 'risk', 1, 'hard'),
  q('beta-15', 'beta', 'risk', 1, 'medium'),


  // --- options ------------------------------------------------------------------------------
  q('greeks-01', 'greeks', 'options', 1, 'easy'),
  q('greeks-02', 'greeks', 'options', 1, 'easy'),
  q('greeks-03', 'greeks', 'options', 0, 'medium'),
  q('greeks-04', 'greeks', 'options', 1, 'medium'),
  q('greeks-05', 'greeks', 'options', 1, 'hard'),
  q('greeks-06', 'greeks', 'options', 1, 'medium'),
  q('greeks-07', 'greeks', 'options', 2, 'medium'),
  q('greeks-08', 'greeks', 'options', 1, 'easy'),
  q('greeks-09', 'greeks', 'options', 1, 'medium'),
  q('greeks-10', 'greeks', 'options', 0, 'medium'),
  q('greeks-11', 'greeks', 'options', 3, 'medium'),
  q('greeks-12', 'greeks', 'options', 2, 'easy'),
  q('greeks-13', 'greeks', 'options', 0, 'easy'),
  q('greeks-14', 'greeks', 'options', 1, 'hard'),
  q('greeks-15', 'greeks', 'options', 1, 'easy'),
  q('greeks-16', 'greeks', 'options', 1, 'hard'),
  q('greeks-17', 'greeks', 'options', 1, 'hard'),
  q('greeks-18', 'greeks', 'options', 1, 'medium'),

  q('blackscholes-01', 'blackscholes', 'options', 1, 'easy'),
  q('blackscholes-02', 'blackscholes', 'options', 3, 'medium'),
  q('blackscholes-03', 'blackscholes', 'options', 1, 'medium'),
  q('blackscholes-04', 'blackscholes', 'options', 2, 'medium'),
  q('blackscholes-05', 'blackscholes', 'options', 1, 'easy'),
  q('blackscholes-06', 'blackscholes', 'options', 0, 'medium'),
  q('blackscholes-07', 'blackscholes', 'options', 1, 'medium'),
  q('blackscholes-08', 'blackscholes', 'options', 1, 'easy'),
  q('blackscholes-09', 'blackscholes', 'options', 1, 'hard'),
  q('blackscholes-10', 'blackscholes', 'options', 1, 'medium'),
  q('blackscholes-11', 'blackscholes', 'options', 1, 'easy'),
  q('blackscholes-12', 'blackscholes', 'options', 1, 'hard'),
  q('blackscholes-13', 'blackscholes', 'options', 1, 'hard'),
  q('blackscholes-14', 'blackscholes', 'options', 1, 'medium'),
  q('blackscholes-15', 'blackscholes', 'options', 1, 'easy'),
  q('blackscholes-16', 'blackscholes', 'options', 1, 'medium'),
  q('blackscholes-17', 'blackscholes', 'options', 1, 'medium'),
  q('blackscholes-18', 'blackscholes', 'options', 1, 'hard')
]

export function questionsForLesson(lessonId: string): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter((qq) => qq.lessonId === lessonId)
}

export function questionsForCategory(category: LessonCategory): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter((qq) => qq.category === category)
}
