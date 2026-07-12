import type { Asset, Candle } from '@renderer/types/market'
import { fetchDailyHistory } from './twelveDataAdapter'
import { getTwelveDataKey } from './apiKeyStore'

/**
 * Phase 8.8 — proactive TwelveData bulk backfill.
 *
 * dailyQuoteAccumulator.ts (Phase 8.6) accumulates real history one real day at a time via
 * Finnhub's free `/quote` endpoint, because Finnhub's free tier has no bulk-history path at all.
 * TwelveData's free tier is different: a single `time_series` call at daily resolution can return
 * up to ~5,000 points (about 19 years) — so instead of waiting years for daily accumulation to
 * build up real history, this module fetches several years of real daily bars per relevant symbol
 * in one shot, whenever a TwelveData key is configured.
 *
 * Because multi-year daily history doesn't go stale the way a live quote does, this re-runs on a
 * roughly-monthly cadence per symbol (via a persisted backfill-log, symbol -> last-backfilled-date)
 * rather than daily — there's nothing to gain from re-fetching the same multi-year window every
 * few hours the way dailyQuoteAccumulator.ts's live-quote polling does.
 */

const BACKFILL_LOG_STORAGE_KEY = 'qiab:twelveDataBackfillLog:v1'

/** Roughly-monthly re-backfill cadence per symbol. */
export const BACKFILL_CADENCE_DAYS = 30

/** ~5 years of daily bars per symbol — comfortably under TwelveData's single-call cap of ~5,000
 *  daily points (~19 years), so one call per symbol is enough for a genuine multi-year backfill. */
export const BACKFILL_YEARS = 5
const BACKFILL_OUTPUTSIZE = BACKFILL_YEARS * 365

/** Bounded daily call budget dedicated to this backfill specifically — genuinely ramped up from
 *  roughly zero calls/day before this phase, while leaving real headroom under TwelveData's
 *  800-calls/day free-tier cap for ordinary per-view chart fetching (see dataService.ts). */
export const BACKFILL_DAILY_CALL_BUDGET = 250

/** Stagger between successive backfill calls, comfortably under TwelveData's free-tier
 *  8-calls-per-minute limit. */
const STAGGER_MS = 8000

/** symbol -> last date (YYYY-MM-DD) it was successfully backfilled. */
export type BackfillLog = Record<string, string>

/** Whole-day difference between two plain `YYYY-MM-DD` date strings, both parsed as UTC midnight —
 *  never through locale-sensitive `Date` parsing of anything but that exact fixed format. */
function daysBetween(fromDateStr: string, toDateStr: string): number {
  const from = Date.parse(`${fromDateStr}T00:00:00Z`)
  const to = Date.parse(`${toDateStr}T00:00:00Z`)
  return Math.round((to - from) / (24 * 60 * 60 * 1000))
}

/**
 * Pure: which of `symbols` are due for a fresh backfill on `todayStr` (a plain `YYYY-MM-DD`
 * string), given `log` and `cadenceDays`. A symbol with no log entry at all is always due; one
 * backfilled fewer than `cadenceDays` days ago is excluded. Unlike dailyQuoteAccumulator's
 * `symbolsNeedingPoll` (exact-string day-boundary equality — a live quote goes stale the instant
 * the calendar day turns over), this compares an actual elapsed-day count: multi-year daily
 * history doesn't need re-fetching every single day it stays open, just roughly once a month.
 * `todayStr` is a parameter (never computed internally) so this stays trivially testable.
 */
export function symbolsNeedingBackfill(
  symbols: string[],
  log: BackfillLog,
  todayStr: string,
  cadenceDays: number = BACKFILL_CADENCE_DAYS
): string[] {
  return symbols.filter((symbol) => {
    const last = log[symbol]
    return !last || daysBetween(last, todayStr) >= cadenceDays
  })
}

export interface BackfillStoreCall {
  source: 'twelvedata'
  symbol: string
  timeframe: string
  candles: Candle[]
}

/**
 * Pure: prepares the exact `storeCandles`-shaped call for one symbol's freshly-backfilled daily
 * candles. Stored under the '1Y' timeframe bucket — the same bucket historyDownload.ts's bulk
 * daily-candle download already uses for multi-year daily bars regardless of how many years were
 * actually requested (see that file's own comment), so daily rows are never split across two
 * different bucket keys depending on which feature happened to fetch them.
 */
export function toStoreCall(symbol: string, candles: Candle[]): BackfillStoreCall {
  return { source: 'twelvedata', symbol, timeframe: '1Y', candles }
}

/** Loads the persisted backfill-log from localStorage, discarding anything that doesn't match the
 *  expected shape — same defensive pattern as dailyQuoteAccumulator.ts's poll-log loader. */
function loadBackfillLog(): BackfillLog {
  try {
    const raw = localStorage.getItem(BACKFILL_LOG_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const result: BackfillLog = {}
    for (const [symbol, date] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof date === 'string') result[symbol] = date
    }
    return result
  } catch {
    return {}
  }
}

function saveBackfillLog(log: BackfillLog): void {
  try {
    localStorage.setItem(BACKFILL_LOG_STORAGE_KEY, JSON.stringify(log))
  } catch {
    // best-effort persistence; ignore quota/availability errors
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Orchestrates one background backfill pass: for each relevant symbol not yet backfilled within
 * the last `BACKFILL_CADENCE_DAYS` days (per the persisted backfill-log), fetches
 * `BACKFILL_YEARS` years of real daily bars in a single TwelveData `time_series` call and stores
 * them via the existing `storeCandles('twelvedata', symbol, '1Y', ...)` IPC path (no new IPC
 * needed). Bounded to `BACKFILL_DAILY_CALL_BUDGET` calls per pass — any symbols beyond the budget
 * are simply left for the next pass; the persisted log makes this safe, nothing is ever skipped
 * forever, only deferred. Calls are sequential with a fixed stagger between them, matching
 * dailyQuoteAccumulator.ts's approach, to stay well within TwelveData's free-tier rate limit.
 *
 * A single symbol's failure (bad ticker, network hiccup, rate limit, or a fetch that succeeds but
 * returns no candles) is caught/skipped without aborting the rest of the batch, and that symbol is
 * NOT marked as backfilled — so it's simply retried on the next pass.
 *
 * No-ops immediately (no error, no network calls) if no TwelveData key is currently configured.
 *
 * The pure pieces above (`symbolsNeedingBackfill`, `toStoreCall`) are unit-tested directly in
 * twelveDataBackfill.test.ts. This orchestration loop itself is not — there's no real TwelveData
 * key available in this environment, so it's covered by live verification instead, the same known
 * boundary as Phase 8.6's dailyQuoteAccumulator.
 */
export async function runTwelveDataBackfill(assets: Asset[]): Promise<void> {
  if (!getTwelveDataKey()) return

  const today = todayDateStr()
  const log = loadBackfillLog()
  const assetBySymbol = new Map(assets.map((a) => [a.symbol, a]))
  const symbols = [...assetBySymbol.keys()]
  const pending = symbolsNeedingBackfill(symbols, log, today).slice(0, BACKFILL_DAILY_CALL_BUDGET)

  for (let i = 0; i < pending.length; i++) {
    const symbol = pending[i]
    const asset = assetBySymbol.get(symbol)
    if (asset) {
      try {
        const candles = await fetchDailyHistory(asset, BACKFILL_OUTPUTSIZE)
        if (candles.length) {
          const call = toStoreCall(symbol, candles)
          await window.api?.storeCandles(call.source, call.symbol, call.timeframe, call.candles)
          log[symbol] = today
          saveBackfillLog(log)
        }
      } catch {
        // Skip this symbol only; not marked as backfilled, so it's retried on the next pass.
      }
    }
    if (i < pending.length - 1) await delay(STAGGER_MS)
  }
}
