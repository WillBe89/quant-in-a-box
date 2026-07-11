import { describe, expect, it } from 'vitest'
import { COOLDOWN_MS, formatCooldownRemaining, isInCooldown, remainingCooldownMs } from './academyCooldown'

describe('remainingCooldownMs', () => {
  it('returns 0 for a module never attempted', () => {
    expect(remainingCooldownMs(null, 1_000_000)).toBe(0)
    expect(remainingCooldownMs(undefined, 1_000_000)).toBe(0)
    expect(remainingCooldownMs(0, 1_000_000)).toBe(0)
  })

  it('returns the full cooldown right after an attempt', () => {
    const now = 1_000_000
    expect(remainingCooldownMs(now, now)).toBe(COOLDOWN_MS)
  })

  it('returns exactly 0 the instant the cooldown elapses (boundary)', () => {
    // A non-zero base timestamp — 0 itself is the "never attempted" sentinel (see the falsy
    // check above), not a realistic epoch-ms value, so boundary math is tested around a real one.
    const lastAttemptAt = 1_000_000
    expect(remainingCooldownMs(lastAttemptAt, lastAttemptAt + COOLDOWN_MS)).toBe(0)
  })

  it('returns a small positive remainder 1ms before the cooldown elapses (boundary)', () => {
    const lastAttemptAt = 1_000_000
    expect(remainingCooldownMs(lastAttemptAt, lastAttemptAt + COOLDOWN_MS - 1)).toBe(1)
  })

  it('never goes negative long after the cooldown elapsed', () => {
    const lastAttemptAt = 1_000_000
    expect(remainingCooldownMs(lastAttemptAt, lastAttemptAt + COOLDOWN_MS * 10)).toBe(0)
  })
})

describe('isInCooldown', () => {
  it('is true immediately after an attempt', () => {
    expect(isInCooldown(1000, 1000)).toBe(true)
  })

  it('is false once remainingCooldownMs reaches 0', () => {
    expect(isInCooldown(0, COOLDOWN_MS)).toBe(false)
  })

  it('is false for a module never attempted', () => {
    expect(isInCooldown(null, 1000)).toBe(false)
  })
})

describe('formatCooldownRemaining', () => {
  it('returns empty string for zero or negative', () => {
    expect(formatCooldownRemaining(0)).toBe('')
    expect(formatCooldownRemaining(-500)).toBe('')
  })

  it('formats sub-hour remainders as minutes', () => {
    expect(formatCooldownRemaining(42 * 60_000)).toBe('42m')
  })

  it('formats over-an-hour remainders as hours + padded minutes', () => {
    expect(formatCooldownRemaining(65 * 60_000)).toBe('1h 05m')
  })

  it('rounds partial minutes up so it never displays "0m" while time remains', () => {
    expect(formatCooldownRemaining(30_000)).toBe('1m')
  })
})
