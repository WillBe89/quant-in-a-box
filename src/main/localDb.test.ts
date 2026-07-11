import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import * as localDb from './localDb'

// This runs localDb.ts (better-sqlite3-backed) directly against a throwaway SQLite file in
// the OS temp dir — no Electron `app` involved, since initDb() accepts a path override
// specifically so it's testable standalone under plain Node/vitest.

describe('localDb', () => {
  // Must run before initDb() is ever called anywhere else in this file/module instance.
  it('throws if a query is made before initDb() has been called', () => {
    expect(() => localDb.getStoredSymbolsSummary()).toThrow(/initDb/)
  })

  describe('after initDb', () => {
    let dbDir: string

    beforeAll(() => {
      dbDir = mkdtempSync(join(tmpdir(), 'qiab-localdb-test-'))
      localDb.initDb(join(dbDir, 'test.db'))
    })

    afterAll(() => {
      localDb.closeDb()
      rmSync(dbDir, { recursive: true, force: true })
    })

    describe('candles', () => {
      it('returns null when nothing is cached for a key', () => {
        expect(localDb.getCachedCandles('finnhub', 'AAPL', '1D', 60_000)).toBeNull()
      })

      it('stores and retrieves candles, sorted ascending by time and mapped back to the Candle shape', () => {
        localDb.storeCandles('finnhub', 'AAPL', '1D', [
          { time: 300, open: 3, high: 3.5, low: 2.5, close: 3.2, volume: 300 },
          { time: 100, open: 1, high: 1.5, low: 0.5, close: 1.2, volume: 100 },
          { time: 200, open: 2, high: 2.5, low: 1.5, close: 2.2, volume: 200 }
        ])
        const result = localDb.getCachedCandles('finnhub', 'AAPL', '1D', 60_000)
        expect(result).not.toBeNull()
        expect(result!.map((c) => c.time)).toEqual([100, 200, 300])
        expect(result![0]).toEqual({ time: 100, open: 1, high: 1.5, low: 0.5, close: 1.2, volume: 100 })
      })

      it('returns null once the newest fetch is older than maxAgeMs', () => {
        localDb.storeCandles('finnhub', 'MSFT', '1D', [
          { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 }
        ])
        // A negative maxAgeMs means "fresher than right now" — i.e. always stale.
        expect(localDb.getCachedCandles('finnhub', 'MSFT', '1D', -1)).toBeNull()
      })

      it('upserts on (source, symbol, timeframe, time), replacing rather than duplicating', () => {
        localDb.storeCandles('finnhub', 'GOOG', '1D', [
          { time: 500, open: 1, high: 1, low: 1, close: 1, volume: 1 }
        ])
        localDb.storeCandles('finnhub', 'GOOG', '1D', [
          { time: 500, open: 9, high: 9, low: 9, close: 9, volume: 9 }
        ])
        const result = localDb.getCachedCandles('finnhub', 'GOOG', '1D', 60_000)
        expect(result).toHaveLength(1)
        expect(result![0].open).toBe(9)
      })

      it('keeps separate cache entries per source/symbol/timeframe key', () => {
        localDb.storeCandles('twelvedata', 'AAPL', '1D', [
          { time: 999, open: 5, high: 5, low: 5, close: 5, volume: 5 }
        ])
        expect(localDb.getCachedCandles('finnhub', 'AAPL', '1D', 60_000)?.some((c) => c.time === 999)).toBe(false)
        expect(localDb.getCachedCandles('twelvedata', 'AAPL', '1D', 60_000)?.some((c) => c.time === 999)).toBe(true)
      })

      it('is a no-op on empty input', () => {
        expect(() => localDb.storeCandles('finnhub', 'EMPTY', '1D', [])).not.toThrow()
        expect(localDb.getCachedCandles('finnhub', 'EMPTY', '1D', 60_000)).toBeNull()
      })
    })

    describe('news', () => {
      it('returns null when nothing is cached for a symbolsKey', () => {
        expect(localDb.getCachedNews('NFLX', 60_000)).toBeNull()
      })

      it('stores and retrieves news, keyed by a sha1 hash of the URL rather than the original id', () => {
        localDb.storeNews('AAPL', [
          {
            id: 'source-supplied-id-ignored',
            source: 'Reuters',
            headline: 'Headline A',
            summary: 'Summary A',
            url: 'https://example.com/a',
            publishedAt: 100,
            relatedSymbols: ['AAPL']
          }
        ])
        const result = localDb.getCachedNews('AAPL', 60_000)
        expect(result).toHaveLength(1)
        expect(result![0]).toMatchObject({
          source: 'Reuters',
          headline: 'Headline A',
          summary: 'Summary A',
          url: 'https://example.com/a',
          publishedAt: 100,
          relatedSymbols: ['AAPL']
        })
        expect(result![0].id).toMatch(/^[0-9a-f]{40}$/)
        expect(result![0].id).not.toBe('source-supplied-id-ignored')
      })

      it('reconstructs an empty relatedSymbols array for the "general" key', () => {
        localDb.storeNews('general', [
          {
            id: 'x',
            source: 'S',
            headline: 'H',
            summary: 'Sum',
            url: 'https://example.com/general-1',
            publishedAt: 1,
            relatedSymbols: []
          }
        ])
        const result = localDb.getCachedNews('general', 60_000)
        expect(result![0].relatedSymbols).toEqual([])
      })

      it('dedupes articles by URL — storing the same URL twice keeps one row, refreshed', () => {
        const article = {
          id: 'a',
          source: 'S',
          headline: 'H1',
          summary: 'Sum',
          url: 'https://example.com/dup',
          publishedAt: 1,
          relatedSymbols: ['DUP']
        }
        localDb.storeNews('DUP', [article])
        localDb.storeNews('DUP', [{ ...article, headline: 'H2' }])
        const result = localDb.getCachedNews('DUP', 60_000)
        expect(result).toHaveLength(1)
        expect(result![0].headline).toBe('H2')
      })

      it('returns null once the newest fetch is older than maxAgeMs', () => {
        localDb.storeNews('STALE', [
          {
            id: 'y',
            source: 'S',
            headline: 'H',
            summary: 'Sum',
            url: 'https://example.com/stale',
            publishedAt: 1,
            relatedSymbols: ['STALE']
          }
        ])
        expect(localDb.getCachedNews('STALE', -1)).toBeNull()
      })

      it('is a no-op on empty input', () => {
        expect(() => localDb.storeNews('EMPTY', [])).not.toThrow()
        expect(localDb.getCachedNews('EMPTY', 60_000)).toBeNull()
      })
    })

    describe('export-oriented helpers', () => {
      it('getStoredSymbolsSummary summarizes row counts and time ranges per key', () => {
        localDb.storeCandles('finnhub', 'SUMM', '1D', [
          { time: 10, open: 1, high: 1, low: 1, close: 1, volume: 1 },
          { time: 20, open: 1, high: 1, low: 1, close: 1, volume: 1 }
        ])
        const summary = localDb.getStoredSymbolsSummary().find((s) => s.symbol === 'SUMM')
        expect(summary).toMatchObject({
          source: 'finnhub',
          symbol: 'SUMM',
          timeframe: '1D',
          rowCount: 2,
          oldestTime: 10,
          newestTime: 20
        })
      })

      it('getCandleHistoryForExport returns all candles for a symbol, optionally filtered by source and/or timeframe', () => {
        localDb.storeCandles('finnhub', 'EXP', '1D', [{ time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 }])
        localDb.storeCandles('finnhub', 'EXP', '1Y', [{ time: 3, open: 3, high: 3, low: 3, close: 3, volume: 3 }])
        localDb.storeCandles('twelvedata', 'EXP', '1D', [{ time: 2, open: 2, high: 2, low: 2, close: 2, volume: 2 }])
        expect(localDb.getCandleHistoryForExport('EXP')).toHaveLength(3)
        expect(localDb.getCandleHistoryForExport('EXP', 'finnhub')).toHaveLength(2)
        expect(localDb.getCandleHistoryForExport('EXP', 'finnhub', '1D')).toHaveLength(1)
        expect(localDb.getCandleHistoryForExport('EXP', 'finnhub', '1D')[0].time).toBe(1)
        expect(localDb.getCandleHistoryForExport('EXP', 'finnhub', '1Y')[0].time).toBe(3)
      })

      it('getNewsForExport returns all news, optionally filtered by symbolsKey', () => {
        localDb.storeNews('EXPKEY', [
          {
            id: 'a',
            source: 'S',
            headline: 'H',
            summary: 'Sum',
            url: 'https://example.com/exp-1',
            publishedAt: 1,
            relatedSymbols: ['EXPKEY']
          }
        ])
        const scoped = localDb.getNewsForExport('EXPKEY')
        const all = localDb.getNewsForExport()
        expect(scoped.length).toBeGreaterThanOrEqual(1)
        expect(all.length).toBeGreaterThanOrEqual(scoped.length)
      })
    })
  })
})
