import type { QuizQuestion } from '@renderer/academy/quizQuestions'
import type { LessonCategory } from '@renderer/academy/lessons'

/** A quiz attempt must get at least this fraction of its own sampled question count right to
 *  pass — checked against the attempt's actual sampled size, never the full question bank. */
export const MIN_PASS_RATIO = 0.8

export interface AttemptScore {
  scorePct: number
  passed: boolean
}

/** Scores one attempt. `scorePct` is rounded to the nearest whole percent for display/storage;
 *  the pass check itself is done on the unrounded ratio so a score that rounds down to exactly
 *  80% (e.g. 4/5) still passes, and one that rounds up to 80% from below (e.g. 79.6%) doesn't. */
export function scoreAttempt(correctCount: number, totalCount: number): AttemptScore {
  if (totalCount <= 0) return { scorePct: 0, passed: false }
  const ratio = correctCount / totalCount
  return {
    scorePct: Math.round(ratio * 100),
    // Tiny epsilon absorbs floating-point division noise right at the 80% boundary.
    passed: ratio >= MIN_PASS_RATIO - 1e-9
  }
}

/** Deterministic (given `rng`) Fisher-Yates shuffle, returning the first `count` elements.
 *  Gracefully caps at `pool.length` — a pool smaller than the requested count (e.g. the
 *  options category) just returns every item, shuffled, rather than duplicating or throwing. */
export function sampleQuestions<T>(pool: readonly T[], count: number, rng: () => number = Math.random): T[] {
  const n = Math.min(Math.max(Math.floor(count), 0), pool.length)
  const working = pool.slice()
  for (let i = working.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[working[i], working[j]] = [working[j], working[i]]
  }
  return working.slice(0, n)
}

/** Splits `target` proportionally across `weights` (e.g. lesson counts per category) using
 *  largest-remainder rounding, so the parts always sum back to exactly `target`. Never assigns
 *  more to a bucket than would make sense for a zero-weight bucket (gets 0). */
export function splitProportionally(target: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  if (totalWeight <= 0 || target <= 0) return weights.map(() => 0)
  const raw = weights.map((w) => (w / totalWeight) * target)
  const floors = raw.map((r) => Math.floor(r))
  let remainder = target - floors.reduce((s, f) => s + f, 0)
  const order = raw
    .map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
  const result = [...floors]
  for (let k = 0; k < remainder && k < order.length; k++) result[order[k].i]++
  return result
}

/** Samples a single subject module's quiz: every question in `pool` belonging to `category`,
 *  sampled down toward `target` (capped at the category's actual pool size). */
export function sampleModuleQuiz(
  pool: readonly QuizQuestion[],
  category: LessonCategory,
  target: number,
  rng: () => number = Math.random
): QuizQuestion[] {
  return sampleQuestions(
    pool.filter((q) => q.category === category),
    target,
    rng
  )
}

/** Samples the Final Exam: splits `target` proportionally across `categories` by each
 *  category's own pool size, samples each category's share independently (so every category
 *  is represented, capped gracefully if any one category's pool is smaller than its share),
 *  then reshuffles the combined result so categories interleave rather than arriving in blocks. */
export function sampleFinalExam(
  pool: readonly QuizQuestion[],
  categories: readonly LessonCategory[],
  target: number,
  rng: () => number = Math.random
): QuizQuestion[] {
  const byCategory = categories.map((cat) => pool.filter((q) => q.category === cat))
  const shares = splitProportionally(target, byCategory.map((p) => p.length))
  const picked = byCategory.flatMap((catPool, i) => sampleQuestions(catPool, shares[i], rng))
  return sampleQuestions(picked, picked.length, rng)
}
