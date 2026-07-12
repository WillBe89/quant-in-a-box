import { describe, expect, it } from 'vitest'
import type { Candle } from '@renderer/types/market'
import { BACKFILL_CADENCE_DAYS, symbolsNeedingBackfill, toStoreCall, type BackfillLog } from './twelveDataBackfill'

describe('symbolsNeedingBackfill', () => {
  it('includes a symbol with no log entry at all', () => {
    expect(symbolsNeedingBackfill(['AAPL'], {}, '2026-07-13')).toEqual(['AAPL'])
  })

  it('excludes a symbol backfilled fewer than the cadence days ago', () => {
    const log: BackfillLog = { AAPL: '2026-07-01' }
    // 12 days since 2026-07-01 -> under the default 30-day cadence, still fresh.
    expect(symbolsNeedingBackfill(['AAPL'], log, '2026-07-13')).toEqual([])
  })

  it('includes a symbol backfilled exactly the cadence days ago (boundary is inclusive)', () => {
    const log: BackfillLog = { AAPL: '2026-06-13' }
    expect(daysApart('2026-06-13', '2026-07-13')).toBe(BACKFILL_CADENCE_DAYS)
    expect(symbolsNeedingBackfill(['AAPL'], log, '2026-07-13')).toEqual(['AAPL'])
  })

  it('excludes a symbol backfilled one day short of the cadence', () => {
    const log: BackfillLog = { AAPL: '2026-06-14' }
    expect(daysApart('2026-06-14', '2026-07-13')).toBe(BACKFILL_CADENCE_DAYS - 1)
    expect(symbolsNeedingBackfill(['AAPL'], log, '2026-07-13')).toEqual([])
  })

  it('includes a symbol backfilled well over the cadence ago', () => {
    const log: BackfillLog = { AAPL: '2025-01-01' }
    expect(symbolsNeedingBackfill(['AAPL'], log, '2026-07-13')).toEqual(['AAPL'])
  })

  it('respects a custom cadence override', () => {
    const log: BackfillLog = { AAPL: '2026-07-10' }
    // 3 days ago: due under a 2-day cadence, not due under the 30-day default.
    expect(symbolsNeedingBackfill(['AAPL'], log, '2026-07-13', 2)).toEqual(['AAPL'])
    expect(symbolsNeedingBackfill(['AAPL'], log, '2026-07-13')).toEqual([])
  })

  it('filters a mixed batch, preserving relative order of the symbols still due', () => {
    const log: BackfillLog = { AAPL: '2026-07-01', MSFT: '2025-01-01' }
    // AAPL: fresh (12 days). MSFT: long overdue. NVDA: never backfilled.
    expect(symbolsNeedingBackfill(['AAPL', 'MSFT', 'NVDA'], log, '2026-07-13')).toEqual(['MSFT', 'NVDA'])
  })
})

describe('toStoreCall', () => {
  it('always stores under the twelvedata source and the 1Y timeframe bucket', () => {
    const candles: Candle[] = [{ time: 1, open: 1, high: 1, low: 1, close: 1, volume: 0 }]
    expect(toStoreCall('AAPL', candles)).toEqual({
      source: 'twelvedata',
      symbol: 'AAPL',
      timeframe: '1Y',
      candles
    })
  })

  it('passes the candle array through unchanged, even when empty', () => {
    expect(toStoreCall('MSFT', [])).toEqual({ source: 'twelvedata', symbol: 'MSFT', timeframe: '1Y', candles: [] })
  })
})

/** Test-local helper mirroring the module's own UTC-midnight day-difference math, used only to
 *  assert the exact boundary values above are what this test file thinks they are. */
function daysApart(fromDateStr: string, toDateStr: string): number {
  const from = Date.parse(`${fromDateStr}T00:00:00Z`)
  const to = Date.parse(`${toDateStr}T00:00:00Z`)
  return Math.round((to - from) / (24 * 60 * 60 * 1000))
}
