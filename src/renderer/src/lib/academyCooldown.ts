/** One hour between attempts at the same module, applied after every attempt whether it
 *  passed or failed — mirrors a real certification exam's "come back later" rule and gives
 *  the anti-cheating disclaimer (see academy/QuizRunner.tsx) some actual teeth. */
export const COOLDOWN_MS = 60 * 60 * 1000

/** Milliseconds remaining before another attempt is allowed, given the epoch-ms timestamp of
 *  the last attempt. Returns 0 (never negative) once the cooldown has fully elapsed, and 0 for
 *  a module that has never been attempted (`lastAttemptAt` is null/0/undefined). */
export function remainingCooldownMs(lastAttemptAt: number | null | undefined, now: number): number {
  if (!lastAttemptAt) return 0
  const elapsed = now - lastAttemptAt
  if (elapsed >= COOLDOWN_MS) return 0
  return COOLDOWN_MS - elapsed
}

export function isInCooldown(lastAttemptAt: number | null | undefined, now: number): boolean {
  return remainingCooldownMs(lastAttemptAt, now) > 0
}

/** Formats a remaining-cooldown duration as a short human string, e.g. "42m" or "1h 05m" or
 *  "less than a minute" — used for the "try again in …" hints in Modules and Quiz Results. */
export function formatCooldownRemaining(ms: number): string {
  if (ms <= 0) return ''
  const totalMinutes = Math.ceil(ms / 60_000)
  if (totalMinutes < 1) return 'less than a minute'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes}m`
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}
