import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import Database from 'better-sqlite3'
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

    describe('getStoredCandlesBefore', () => {
      it('returns an empty array when the table has nothing for that key', () => {
        expect(localDb.getStoredCandlesBefore('finnhub', 'NOPE', '1Y', 1_000, 10)).toEqual([])
      })

      it('returns only rows strictly older than the cursor, ascending by time', () => {
        localDb.storeCandles('finnhub', 'HIST', '1Y', [
          { time: 100, open: 1, high: 1, low: 1, close: 1, volume: 1 },
          { time: 200, open: 2, high: 2, low: 2, close: 2, volume: 2 },
          { time: 300, open: 3, high: 3, low: 3, close: 3, volume: 3 },
          { time: 400, open: 4, high: 4, low: 4, close: 4, volume: 4 }
        ])
        const result = localDb.getStoredCandlesBefore('finnhub', 'HIST', '1Y', 300, 10)
        expect(result.map((c) => c.time)).toEqual([100, 200])
      })

      it('excludes the row exactly at the cursor — "before" is strict, not inclusive', () => {
        localDb.storeCandles('finnhub', 'BOUND', '1Y', [
          { time: 500, open: 5, high: 5, low: 5, close: 5, volume: 5 }
        ])
        expect(localDb.getStoredCandlesBefore('finnhub', 'BOUND', '1Y', 500, 10)).toEqual([])
        expect(localDb.getStoredCandlesBefore('finnhub', 'BOUND', '1Y', 501, 10)).toHaveLength(1)
      })

      it('caps results at `limit`, keeping the rows nearest the cursor (still ascending)', () => {
        localDb.storeCandles(
          'finnhub',
          'LIMIT',
          '1Y',
          Array.from({ length: 5 }, (_, i) => ({
            time: (i + 1) * 100,
            open: i,
            high: i,
            low: i,
            close: i,
            volume: i
          }))
        )
        // Rows exist at 100..500; cursor at 600 with limit 2 should keep the two nearest
        // (400, 500), not the two oldest.
        const result = localDb.getStoredCandlesBefore('finnhub', 'LIMIT', '1Y', 600, 2)
        expect(result.map((c) => c.time)).toEqual([400, 500])
      })

      it('keeps separate results per source/symbol/timeframe key, like the other candle queries', () => {
        localDb.storeCandles('finnhub', 'KEYED', '1Y', [
          { time: 10, open: 1, high: 1, low: 1, close: 1, volume: 1 }
        ])
        localDb.storeCandles('twelvedata', 'KEYED', '1Y', [
          { time: 10, open: 9, high: 9, low: 9, close: 9, volume: 9 }
        ])
        localDb.storeCandles('finnhub', 'KEYED', '1D', [
          { time: 10, open: 5, high: 5, low: 5, close: 5, volume: 5 }
        ])
        expect(localDb.getStoredCandlesBefore('finnhub', 'KEYED', '1Y', 20, 10)).toHaveLength(1)
        expect(localDb.getStoredCandlesBefore('finnhub', 'KEYED', '1Y', 20, 10)[0].open).toBe(1)
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

      it('round-trips category and image when both are present', () => {
        localDb.storeNews('CATIMG', [
          {
            id: 'z',
            source: 'CoinDesk',
            headline: 'Category and image round trip',
            summary: 'Sum',
            url: 'https://example.com/cat-img',
            publishedAt: 1,
            relatedSymbols: [],
            category: 'crypto',
            image: 'https://example.com/thumb.png'
          }
        ])
        const result = localDb.getCachedNews('CATIMG', 60_000)
        expect(result![0].category).toBe('crypto')
        expect(result![0].image).toBe('https://example.com/thumb.png')
      })

      it('coerces missing category/image to undefined rather than throwing on the undefined bind', () => {
        expect(() =>
          localDb.storeNews('NOCATIMG', [
            {
              id: 'w',
              source: 'S',
              headline: 'No category or image',
              summary: 'Sum',
              url: 'https://example.com/no-cat-img',
              publishedAt: 1,
              relatedSymbols: []
            }
          ])
        ).not.toThrow()
        const result = localDb.getCachedNews('NOCATIMG', 60_000)
        expect(result![0].category).toBeUndefined()
        expect(result![0].image).toBeUndefined()
      })
    })

    describe('profiles', () => {
      const sampleProfile: localDb.CompanyProfile = {
        symbol: 'AAPL',
        name: 'Apple Inc',
        logo: 'https://example.com/aapl.png',
        industry: 'Technology',
        marketCapitalization: 2_950_000,
        shareOutstanding: 15_500,
        website: 'https://www.apple.com',
        ipo: '1980-12-12',
        exchange: 'NASDAQ',
        currency: 'USD',
        country: 'US'
      }

      it('returns null when nothing is cached for a symbol', () => {
        expect(localDb.getCachedProfile('NFLX', 60_000)).toBeNull()
      })

      it('stores and retrieves a profile, round-tripping every field', () => {
        localDb.storeProfile('AAPL', 'finnhub', sampleProfile)
        expect(localDb.getCachedProfile('AAPL', 60_000)).toEqual(sampleProfile)
      })

      it('returns null once the fetch is older than maxAgeMs', () => {
        localDb.storeProfile('MSFT', 'finnhub', { ...sampleProfile, symbol: 'MSFT' })
        expect(localDb.getCachedProfile('MSFT', -1)).toBeNull()
      })

      it('upserts on symbol, replacing rather than duplicating (single row per symbol)', () => {
        localDb.storeProfile('GOOG', 'finnhub', { ...sampleProfile, symbol: 'GOOG', name: 'Old Name' })
        localDb.storeProfile('GOOG', 'finnhub', { ...sampleProfile, symbol: 'GOOG', name: 'New Name' })
        expect(localDb.getCachedProfile('GOOG', 60_000)?.name).toBe('New Name')
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

  // Distinct from every test above: those all run against a database initDb() itself created
  // from scratch, where CREATE TABLE IF NOT EXISTS already has the category/image columns baked
  // in from the start — that path can never actually exercise the ALTER TABLE migration logic.
  // This block instead hand-builds a `news` table in the OLD (pre-category/image) shape, seeds a
  // row into it exactly like a real user's already-populated database from an earlier shipped
  // version would have, and only then calls initDb() against that same file — the one scenario
  // that actually proves the guarded ALTER TABLE runs (and is safe) against a pre-existing table.
  describe('schema migration against a pre-existing (pre-category/image) database file', () => {
    let dbDir: string
    let dbPath: string
    const FOREVER = Number.MAX_SAFE_INTEGER

    beforeAll(() => {
      dbDir = mkdtempSync(join(tmpdir(), 'qiab-localdb-migration-test-'))
      dbPath = join(dbDir, 'legacy.db')

      const legacyDb = new Database(dbPath)
      legacyDb.exec(`
        CREATE TABLE IF NOT EXISTS news (
          id TEXT PRIMARY KEY,
          symbols TEXT NOT NULL,
          source TEXT,
          headline TEXT,
          summary TEXT,
          url TEXT,
          published_at INTEGER,
          fetched_at INTEGER NOT NULL
        )
      `)
      legacyDb
        .prepare(
          `INSERT INTO news (id, symbols, source, headline, summary, url, published_at, fetched_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          'legacy-1',
          'general',
          'Reuters',
          'Pre-migration headline',
          'Pre-migration summary',
          'https://example.com/legacy',
          1000,
          2000
        )
      legacyDb.close()

      // Opened the same way the real app does on launch — initDb() must detect the missing
      // columns on this ALREADY-EXISTING table and ALTER TABLE them in, not just no-op because
      // CREATE TABLE IF NOT EXISTS found a table already there.
      localDb.initDb(dbPath)
    })

    afterAll(() => {
      localDb.closeDb()
      // This block opens two separate Database handles against the same directory (the
      // hand-built "legacy" one, then localDb's own) — on Windows the OS can hold the file
      // handle open past close() for longer than any reasonable retry budget (AV scanning,
      // etc.). Leaving the OS temp dir behind is harmless (it's reclaimed eventually) and must
      // never fail this suite over a cleanup step, so failures here are swallowed rather than
      // thrown, after still giving a few retries a chance to succeed the normal way.
      try {
        rmSync(dbDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
      } catch {
        // best-effort cleanup only — see comment above
      }
    })

    it('preserves the pre-existing row, readable and untouched, after the migration runs', () => {
      const result = localDb.getCachedNews('general', FOREVER)
      const legacyRow = result?.find((r) => r.headline === 'Pre-migration headline')
      expect(legacyRow).toBeDefined()
      expect(legacyRow?.summary).toBe('Pre-migration summary')
      expect(legacyRow?.category).toBeUndefined()
      expect(legacyRow?.image).toBeUndefined()
    })

    it('allows storing and retrieving category/image on the now-migrated table', () => {
      localDb.storeNews('general', [
        {
          id: 'ignored-source-id',
          source: 'CoinDesk',
          headline: 'Post-migration headline',
          summary: 'Post-migration summary',
          url: 'https://example.com/post-migration',
          publishedAt: 3000,
          relatedSymbols: [],
          category: 'crypto',
          image: 'https://example.com/img.png'
        }
      ])
      const result = localDb.getCachedNews('general', FOREVER)
      const newRow = result?.find((r) => r.headline === 'Post-migration headline')
      expect(newRow?.category).toBe('crypto')
      expect(newRow?.image).toBe('https://example.com/img.png')
    })

    it('running initDb again against the same already-migrated file is a safe no-op', () => {
      expect(() => localDb.initDb(dbPath)).not.toThrow()
      // Still readable afterwards, including the row inserted before the second initDb call.
      const result = localDb.getCachedNews('general', FOREVER)
      expect(result?.some((r) => r.headline === 'Pre-migration headline')).toBe(true)
    })
  })
})
