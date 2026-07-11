import { describe, expect, it } from 'vitest'
import { driftForecast, monteCarloForecast, randomNormal, regressionForecast } from './forecast'

/** Tiny deterministic PRNG (mulberry32) so Monte Carlo tests are reproducible, not flaky. */
function seededRng(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('randomNormal', () => {
  it('is finite even when the rng returns exactly 0 on its first call', () => {
    let call = 0
    const stubRng = (): number => (call++ === 0 ? 0 : 0.5)
    const result = randomNormal(stubRng)
    expect(Number.isFinite(result)).toBe(true)
  })
})

describe('driftForecast', () => {
  it('matches the closed-form single-return case (zero variance collapses the band)', () => {
    // Only one historical log-return exists (ln(110/100)), so its population stdev is exactly
    // 0 — the band should collapse to the central path, which itself is the closed-form
    // S_0 * exp(mu * t) with S_0 = last close (110) and mu = ln(110/100).
    const closes = [100, 110]
    const band = driftForecast(closes, 3)
    const mu = Math.log(110 / 100)
    const S0 = 110
    expect(band.central[0]).toBeCloseTo(S0 * Math.exp(mu), 8)
    expect(band.central[1]).toBeCloseTo(S0 * Math.exp(mu * 2), 8)
    for (let i = 0; i < band.central.length; i++) {
      expect(band.upper[i]).toBeCloseTo(band.central[i], 8)
      expect(band.lower[i]).toBeCloseTo(band.central[i], 8)
    }
  })

  it('keeps upper >= central >= lower at every projected bar for a noisy series', () => {
    const closes = [100, 102, 98, 105, 101, 108, 103, 110, 107, 112]
    const band = driftForecast(closes, 10)
    for (let i = 0; i < band.central.length; i++) {
      expect(band.upper[i]).toBeGreaterThanOrEqual(band.central[i])
      expect(band.central[i]).toBeGreaterThanOrEqual(band.lower[i])
    }
  })

  it('does not throw and returns a sane result for fewer than 2 closes', () => {
    expect(() => driftForecast([], 5)).not.toThrow()
    expect(() => driftForecast([100], 5)).not.toThrow()
    const band = driftForecast([100], 5)
    expect(band.central.every((v) => Number.isFinite(v))).toBe(true)
  })
})

describe('regressionForecast', () => {
  it('recovers an exact slope and continues the line with a zero-width band for a perfectly linear series', () => {
    const closes = [100, 102, 104, 106, 108]
    const band = regressionForecast(closes, 3)
    // Line continues at +2/bar: bars 5,6,7 (0-indexed 5..7) -> 110, 112, 114.
    expect(band.central[0]).toBeCloseTo(110, 6)
    expect(band.central[1]).toBeCloseTo(112, 6)
    expect(band.central[2]).toBeCloseTo(114, 6)
    for (let i = 0; i < band.central.length; i++) {
      expect(band.upper[i]).toBeCloseTo(band.central[i], 6)
      expect(band.lower[i]).toBeCloseTo(band.central[i], 6)
    }
  })

  it('keeps upper >= central >= lower at every projected bar for a noisy series', () => {
    const closes = [100, 103, 99, 106, 102, 109, 104, 111, 108, 114]
    const band = regressionForecast(closes, 8)
    for (let i = 0; i < band.central.length; i++) {
      expect(band.upper[i]).toBeGreaterThanOrEqual(band.central[i])
      expect(band.central[i]).toBeGreaterThanOrEqual(band.lower[i])
    }
  })

  it('does not throw and returns a sane result for fewer than 2 closes', () => {
    expect(() => regressionForecast([], 5)).not.toThrow()
    expect(() => regressionForecast([100], 5)).not.toThrow()
    const band = regressionForecast([100], 5)
    expect(band.central.every((v) => Number.isFinite(v))).toBe(true)
  })
})

describe('monteCarloForecast', () => {
  it('collapses all three percentile paths to the same deterministic value when volatility is zero', () => {
    const closes = Array(10).fill(100)
    const rng = seededRng(42)
    const band = monteCarloForecast(closes, 6, 200, rng)
    for (let i = 0; i < band.central.length; i++) {
      expect(band.upper[i]).toBeCloseTo(100, 6)
      expect(band.central[i]).toBeCloseTo(100, 6)
      expect(band.lower[i]).toBeCloseTo(100, 6)
    }
  })

  it('keeps p95 >= p50 >= p5 at every future bar with real volatility, using a seeded rng', () => {
    const closes = [100, 103, 99, 106, 102, 109, 104, 111, 108, 114]
    const rng = seededRng(7)
    const band = monteCarloForecast(closes, 10, 500, rng)
    for (let i = 0; i < band.central.length; i++) {
      expect(band.upper[i]).toBeGreaterThanOrEqual(band.central[i])
      expect(band.central[i]).toBeGreaterThanOrEqual(band.lower[i])
    }
  })

  it('does not throw and returns a sane result for fewer than 2 closes', () => {
    expect(() => monteCarloForecast([], 5, 50, seededRng(1))).not.toThrow()
    expect(() => monteCarloForecast([100], 5, 50, seededRng(1))).not.toThrow()
    const band = monteCarloForecast([100], 5, 50, seededRng(1))
    expect(band.central.every((v) => Number.isFinite(v))).toBe(true)
  })
})
