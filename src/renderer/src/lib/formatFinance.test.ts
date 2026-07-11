import { describe, expect, it } from 'vitest'
import { formatMarketCap, formatShareCount } from './formatFinance'

describe('formatMarketCap', () => {
  it('formats sub-1000-million values in millions', () => {
    expect(formatMarketCap(850)).toBe('$850.0M')
  })

  it('crosses the millions-to-billions threshold at exactly 1000', () => {
    expect(formatMarketCap(999)).toBe('$999.0M')
    expect(formatMarketCap(1000)).toBe('$1.0B')
  })

  it('crosses the billions-to-trillions threshold at exactly 1,000,000', () => {
    expect(formatMarketCap(999_999)).toBe('$1000.0B')
    expect(formatMarketCap(1_000_000)).toBe('$1.00T')
  })

  it('formats a realistic large-cap value in trillions', () => {
    expect(formatMarketCap(2_950_000)).toBe('$2.95T')
  })
})

describe('formatShareCount', () => {
  it('uses the same thresholds as formatMarketCap but with no currency prefix', () => {
    expect(formatShareCount(850)).toBe('850.0M')
    expect(formatShareCount(13_228)).toBe('13.2B')
    expect(formatShareCount(1_000_000)).toBe('1.00T')
  })
})
