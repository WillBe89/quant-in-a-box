import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { createHash } from 'crypto'

/**
 * Main-process-only local SQLite store. This is a genuine, growing local data store (not
 * a disposable TTL cache) — every successful live candle/news fetch is persisted here so it
 * survives app restarts and can later be exported. Mirrors renderer's `Candle`/`NewsItem`
 * shapes locally (see src/renderer/src/types/market.ts) rather than importing across the
 * main/renderer boundary, matching the existing pattern in aiInsights.ts.
 */

export interface Candle {
  time: number // unix seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface NewsItem {
  id: string
  source: string
  headline: string
  summary: string
  url: string
  publishedAt: number // unix seconds
  relatedSymbols: string[]
}

export interface CompanyProfile {
  symbol: string
  name: string
  logo: string
  industry: string
  marketCapitalization: number // millions, per Finnhub convention
  shareOutstanding: number // millions, per Finnhub convention
  website: string
  ipo: string // ISO date string
  exchange: string
  currency: string
  country: string
}

export interface StoredSymbolSummary {
  source: string
  symbol: string
  timeframe: string
  rowCount: number
  oldestTime: number
  newestTime: number
}

let db: Database.Database | null = null

interface CandleRow {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  fetched_at: number
}

interface NewsRow {
  id: string
  symbols: string
  source: string | null
  headline: string | null
  summary: string | null
  url: string | null
  published_at: number | null
  fetched_at: number
}

interface ProfileRow {
  symbol: string
  source: string
  data: string
  fetched_at: number
}

/**
 * Opens (creating if missing) the local SQLite store and ensures its schema exists. Call once
 * from `app.whenReady()` with no arguments so it resolves Electron's real userData path — tests
 * pass `dbPathOverride` to point at a temp file instead, so they never touch Electron's `app`.
 */
export function initDb(dbPathOverride?: string): void {
  const dbPath = dbPathOverride ?? join(app.getPath('userData'), 'quant-in-a-box.db')
  db = new Database(dbPath)

  db.exec(`
    CREATE TABLE IF NOT EXISTS candles (
      source TEXT NOT NULL,
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      time INTEGER NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume REAL NOT NULL,
      fetched_at INTEGER NOT NULL,
      PRIMARY KEY (source, symbol, timeframe, time)
    )
  `)

  db.exec(`
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      symbol TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      data TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    )
  `)
}

/** Test-only teardown — closes the handle so a temp DB file can be deleted afterward. */
export function closeDb(): void {
  db?.close()
  db = null
}

function requireDb(): Database.Database {
  if (!db) throw new Error('localDb: initDb() must be called before use')
  return db
}

/** Returns cached candles for (source, symbol, timeframe) if any exist and the newest one was
 *  fetched within `maxAgeMs`; otherwise null (either nothing stored, or it's gone stale). */
export function getCachedCandles(
  source: string,
  symbol: string,
  timeframe: string,
  maxAgeMs: number
): Candle[] | null {
  const conn = requireDb()
  const rows = conn
    .prepare<[string, string, string], CandleRow>(
      `SELECT time, open, high, low, close, volume, fetched_at FROM candles
       WHERE source = ? AND symbol = ? AND timeframe = ?
       ORDER BY time ASC`
    )
    .all(source, symbol, timeframe)

  if (rows.length === 0) return null

  const newestFetchedAt = Math.max(...rows.map((r) => r.fetched_at))
  if (newestFetchedAt < Date.now() - maxAgeMs) return null

  return rows.map(({ time, open, high, low, close, volume }) => ({ time, open, high, low, close, volume }))
}

/** Returns whatever candle rows already exist for (source, symbol, timeframe) strictly older
 *  than `beforeTimeUnix`, newest-first up to `limit` rows, then reordered ascending by time —
 *  ready to prepend directly in front of whatever's currently loaded on the chart. Used by the
 *  chart's "reveal already-downloaded history for free" scroll wiring: a pure local read, never
 *  triggers a live fetch, and returns an empty array (not null) when nothing more is stored. */
export function getStoredCandlesBefore(
  source: string,
  symbol: string,
  timeframe: string,
  beforeTimeUnix: number,
  limit: number
): Candle[] {
  const conn = requireDb()
  const rows = conn
    .prepare<[string, string, string, number, number], CandleRow>(
      `SELECT time, open, high, low, close, volume, fetched_at FROM candles
       WHERE source = ? AND symbol = ? AND timeframe = ? AND time < ?
       ORDER BY time DESC
       LIMIT ?`
    )
    .all(source, symbol, timeframe, beforeTimeUnix, limit)
  return rows.map(({ time, open, high, low, close, volume }) => ({ time, open, high, low, close, volume })).reverse()
}

/** Persists a batch of candles for (source, symbol, timeframe) in a single transaction,
 *  replacing any existing row at the same (source, symbol, timeframe, time) key. */
export function storeCandles(source: string, symbol: string, timeframe: string, candles: Candle[]): void {
  if (candles.length === 0) return
  const conn = requireDb()
  const fetchedAt = Date.now()
  const insert = conn.prepare(
    `INSERT OR REPLACE INTO candles (source, symbol, timeframe, time, open, high, low, close, volume, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertAll = conn.transaction((rows: Candle[]) => {
    for (const c of rows) {
      insert.run(source, symbol, timeframe, c.time, c.open, c.high, c.low, c.close, c.volume, fetchedAt)
    }
  })
  insertAll(candles)
}

/** Returns cached news for `symbolsKey` (a single symbol, or the literal string "general" for
 *  unscoped market news) if any exist and the newest one was fetched within `maxAgeMs`. */
export function getCachedNews(symbolsKey: string, maxAgeMs: number): NewsItem[] | null {
  const conn = requireDb()
  const rows = conn
    .prepare<[string], NewsRow>(
      `SELECT id, symbols, source, headline, summary, url, published_at, fetched_at FROM news
       WHERE symbols = ?
       ORDER BY published_at DESC`
    )
    .all(symbolsKey)

  if (rows.length === 0) return null

  const newestFetchedAt = Math.max(...rows.map((r) => r.fetched_at))
  if (newestFetchedAt < Date.now() - maxAgeMs) return null

  return rows.map((r) => rowToNewsItem(r))
}

/** Persists a batch of news articles under `symbolsKey`, keyed by a sha1 hash of each
 *  article's URL (stable across sources, no reliance on source-specific id formats). */
export function storeNews(symbolsKey: string, items: NewsItem[]): void {
  if (items.length === 0) return
  const conn = requireDb()
  const fetchedAt = Date.now()
  const insert = conn.prepare(
    `INSERT OR REPLACE INTO news (id, symbols, source, headline, summary, url, published_at, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertAll = conn.transaction((rows: NewsItem[]) => {
    for (const item of rows) {
      const id = createHash('sha1').update(item.url).digest('hex')
      insert.run(id, symbolsKey, item.source, item.headline, item.summary, item.url, item.publishedAt, fetchedAt)
    }
  })
  insertAll(items)
}

/** Returns the cached company profile for `symbol` if present and fetched within
 *  `maxAgeMs`; otherwise null (either nothing stored, or it's gone stale). */
export function getCachedProfile(symbol: string, maxAgeMs: number): CompanyProfile | null {
  const conn = requireDb()
  const row = conn
    .prepare<[string], ProfileRow>(`SELECT symbol, source, data, fetched_at FROM profiles WHERE symbol = ?`)
    .get(symbol)

  if (!row) return null
  if (row.fetched_at < Date.now() - maxAgeMs) return null

  return JSON.parse(row.data) as CompanyProfile
}

/** Persists a company profile, keyed on `symbol` alone (one row per symbol, unlike the
 *  candles/news tables which key on source too — a symbol only ever has one current
 *  profile). */
export function storeProfile(symbol: string, source: string, profile: CompanyProfile): void {
  const conn = requireDb()
  const fetchedAt = Date.now()
  conn
    .prepare(`INSERT OR REPLACE INTO profiles (symbol, source, data, fetched_at) VALUES (?, ?, ?, ?)`)
    .run(symbol, source, JSON.stringify(profile), fetchedAt)
}

function rowToNewsItem(r: NewsRow): NewsItem {
  return {
    id: r.id,
    source: r.source ?? '',
    headline: r.headline ?? '',
    summary: r.summary ?? '',
    url: r.url ?? '',
    publishedAt: r.published_at ?? 0,
    relatedSymbols: r.symbols === 'general' ? [] : [r.symbols]
  }
}

// --- Export-oriented query helpers -----------------------------------------------------
// Not wired to any UI/IPC yet — implemented now since they're simple reads against the same
// tables, for a later pass that lets the user export what's been collected locally.

/** One row per distinct (source, symbol, timeframe) key currently stored, with row count and
 *  time range — a quick overview of what's been collected so far. */
export function getStoredSymbolsSummary(): StoredSymbolSummary[] {
  const conn = requireDb()
  return conn
    .prepare<[], StoredSymbolSummary>(
      `SELECT source, symbol, timeframe, COUNT(*) AS rowCount, MIN(time) AS oldestTime, MAX(time) AS newestTime
       FROM candles
       GROUP BY source, symbol, timeframe
       ORDER BY source, symbol, timeframe`
    )
    .all()
}

/** All stored candles for `symbol`, optionally narrowed to one `source` and/or one `timeframe`,
 *  ascending by time. A symbol/source pair can be cached under several timeframes at once (e.g.
 *  '1D' from a chart view and '1Y' from a portfolio risk calc) — pass `timeframe` to avoid mixing
 *  those separate series together. */
export function getCandleHistoryForExport(symbol: string, source?: string, timeframe?: string): Candle[] {
  const conn = requireDb()
  const clauses = ['symbol = ?']
  const params: string[] = [symbol]
  if (source) {
    clauses.push('source = ?')
    params.push(source)
  }
  if (timeframe) {
    clauses.push('timeframe = ?')
    params.push(timeframe)
  }
  const rows = conn
    .prepare<string[], CandleRow>(
      `SELECT time, open, high, low, close, volume, fetched_at FROM candles
       WHERE ${clauses.join(' AND ')}
       ORDER BY time ASC`
    )
    .all(...params)
  return rows.map(({ time, open, high, low, close, volume }) => ({ time, open, high, low, close, volume }))
}

/** All stored news, optionally narrowed to one `symbolsKey`, newest-published first. */
export function getNewsForExport(symbolsKey?: string): NewsItem[] {
  const conn = requireDb()
  const rows = symbolsKey
    ? conn
        .prepare<[string], NewsRow>(
          `SELECT id, symbols, source, headline, summary, url, published_at, fetched_at FROM news
           WHERE symbols = ?
           ORDER BY published_at DESC`
        )
        .all(symbolsKey)
    : conn
        .prepare<[], NewsRow>(
          `SELECT id, symbols, source, headline, summary, url, published_at, fetched_at FROM news
           ORDER BY published_at DESC`
        )
        .all()
  return rows.map((r) => rowToNewsItem(r))
}
