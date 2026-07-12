import type { Asset, Candle } from '@renderer/types/market'
import { buildOhlcUrl, type CoinGeckoOhlcEntry } from './coinGeckoAdapter'
import { getCoinGeckoKey } from './apiKeyStore'

/**
 * Phase 8.9 — proactive CoinGecko real crypto history accumulation.
 *
 * coinGeckoAdapter.ts (Phase 8.8) is used reactively: only when a chart is actually open for a
 * crypto asset with no TwelveData coverage. This module mirrors dailyQuoteAccumulator.ts's shape
 * (Phase 8.6) instead — a periodic background pass that captures one real day of data per
 * relevant crypto asset — because a TwelveData-style single bulk call doesn't fit CoinGecko's
 * free/Demo tier: its OHLC endpoint auto-selects candle granularity from the `days` parameter with
 * no way to force daily resolution (see coinGeckoAdapter.ts's own `DAYS_BY_TIMEFRAME` comment).
 * `days=1` is the one value that's confirmed to return real, fine-grained (30-minute) bars — this
 * module fetches that once per relevant asset per day and collapses the bars it gets back into a
 * single daily candle, the same "one real day at a time" idea as the Finnhub accumulator, just
 * derived from several intraday bars instead of one `/quote` snapshot.
 */

const POLL_LOG_STORAGE_KEY = 'qiab:coinGeckoPollLog:v1'

/** Stagger between successive OHLC calls in the same batch. CoinGecko's free/Demo tier rate limit
 *  is roughly 30 calls/minute; this stays comfortably under that even for a large watchlist/
 *  portfolio, matching the conservative-stagger approach dailyQuoteAccumulator.ts and
 *  twelveDataBackfill.ts both already take for their own providers' limits. */
const STAGGER_MS = 2500

/** symbol -> last date (YYYY-MM-DD) it was successfully polled. Its own, separate poll-log —
 *  genuinely independent of dailyQuoteAccumulator.ts's Finnhub poll-log, since a symbol's Finnhub
 *  daily-quote status has no bearing on whether its CoinGecko daily candle has been captured yet. */
export type PollLog = Record<string, string>

/**
 * Pure: which of `symbols` still need polling on `todayStr` (a plain `YYYY-MM-DD` string), given
 * `pollLog`. Identical date-string-equality logic to dailyQuoteAccumulator.ts's own
 * `symbolsNeedingPoll` — a symbol with no entry, or whose entry is any date other than `todayStr`,
 * is included; a symbol already polled today is excluded. Dates are compared as plain strings (not
 * `Date` objects) so the day boundary is exact string equality — no timezone/rounding ambiguity.
 * `todayStr` is a parameter (never computed internally via `Date.now()`/`new Date()`) so this
 * stays trivially testable.
 */
export function symbolsNeedingPoll(symbols: string[], pollLog: PollLog, todayStr: string): string[] {
  return symbols.filter((symbol) => pollLog[symbol] !== todayStr)
}

/**
 * Pure: collapses the array of raw OHLC tuples CoinGecko's endpoint returns for `days=1` (real
 * 30-minute bars) into ONE daily Candle: `open` is the first bar's open, `high`/`low` are the
 * max/min across every bar, `close` is the last bar's close. `volume` is always 0 — CoinGecko's
 * OHLC endpoint never returns volume at any tier, the same accepted limitation
 * dailyQuoteAccumulator.ts already documents for Finnhub's `/quote`. `time` is the first bar's own
 * timestamp (converted from CoinGecko's milliseconds to this app's unix-seconds convention),
 * anchoring the derived daily candle to the start of the fetched window.
 *
 * Deliberately NOT a reuse of coinGeckoAdapter.ts's `mapOhlcEntries` — that function maps every
 * bar to its own Candle for chart display; this one aggregates many bars down into a single
 * Candle for accumulation. Throws on an empty `entries` array (nothing to aggregate); callers
 * catch and skip per-symbol, matching every other failure mode in `runCoinGeckoAccumulation`.
 */
export function dailyCandleFromIntradayBars(entries: CoinGeckoOhlcEntry[]): Candle {
  if (entries.length === 0) {
    throw new Error('dailyCandleFromIntradayBars: no bars to aggregate')
  }

  const [firstTimeMs, firstOpen] = entries[0]
  const lastClose = entries[entries.length - 1][4]

  let high = -Infinity
  let low = Infinity
  for (const [, , barHigh, barLow] of entries) {
    if (barHigh > high) high = barHigh
    if (barLow < low) low = barLow
  }

  return {
    time: Math.floor(firstTimeMs / 1000),
    open: firstOpen,
    high,
    low,
    close: lastClose,
    volume: 0
  }
}

/** Loads the persisted poll-log from localStorage, discarding anything that doesn't match the
 *  expected shape (corrupt JSON, non-string values) rather than letting it crash the app or
 *  silently propagate bad data — same defensive pattern as dailyQuoteAccumulator.ts's own loader. */
function loadPollLog(): PollLog {
  try {
    const raw = localStorage.getItem(POLL_LOG_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const result: PollLog = {}
    for (const [symbol, date] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof date === 'string') result[symbol] = date
    }
    return result
  } catch {
    return {}
  }
}

function savePollLog(log: PollLog): void {
  try {
    localStorage.setItem(POLL_LOG_STORAGE_KEY, JSON.stringify(log))
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

/** Fetches the raw `days=1` OHLC tuples for one CoinGecko asset id. Throws on a non-2xx response
 *  or an unexpected (non-array) response body — both are caught and skipped per-symbol by
 *  `runCoinGeckoAccumulation`, same as every other failure mode there. */
async function fetchDailyOhlcEntries(coingeckoId: string): Promise<CoinGeckoOhlcEntry[]> {
  const url = buildOhlcUrl(coingeckoId, '1D', getCoinGeckoKey())
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CoinGecko OHLC failed: ${res.status}`)
  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) throw new Error('CoinGecko OHLC: unexpected response shape')
  return data as CoinGeckoOhlcEntry[]
}

/**
 * Orchestrates one background accumulation pass. `assets` must already be filtered by the caller
 * to crypto-class assets that carry a `coingeckoId` (see App.tsx's wiring) — deliberately narrow,
 * never the full generated crypto universe, despite the generous 10,000-credits/month Demo-tier
 * budget.
 *
 * For each symbol not yet polled today (per the persisted poll-log), fetches CoinGecko's `days=1`
 * OHLC data for that asset's `coingeckoId`, derives one daily Candle via
 * `dailyCandleFromIntradayBars`, and stores it via the existing `storeCandles('coingecko', symbol,
 * '1Y', ...)` IPC path (no new IPC needed) — the same bucket coinGeckoAdapter.ts's own reactive
 * chart-fetch path already writes to. Calls are sequential with a fixed stagger between them (not
 * fired in parallel), matching dailyQuoteAccumulator.ts's approach. A single symbol's failure (bad
 * id, network hiccup, rate limit, or a fetch that succeeds but returns no bars) is caught and
 * skipped — not marked as polled, so it's simply retried on the next pass — without aborting the
 * rest of the batch. An asset with no `coingeckoId` at all can't be processed and is skipped the
 * same way, with zero network calls for it.
 *
 * No-ops immediately (no error, no network calls) if no CoinGecko key is currently configured —
 * unlike coinGeckoAdapter.ts's reactive chart fetch (which works keyless, a key there just raises
 * the rate limit), this proactive background pass only runs once Will has actually connected his
 * own key, matching his own request to "start pulling that too."
 *
 * The batch-resilience behavior above is covered by a mocked-fetch unit test in
 * coinGeckoAccumulator.test.ts. What isn't — and can't be, without a real CoinGecko key — is the
 * actual live network call and a real daily candle landing in SQLite; that's covered by live
 * verification instead, the same known boundary as every prior BYOK accumulator phase.
 */
export async function runCoinGeckoAccumulation(assets: Asset[]): Promise<void> {
  if (!getCoinGeckoKey()) return

  const today = todayDateStr()
  const pollLog = loadPollLog()
  const assetBySymbol = new Map(assets.map((a) => [a.symbol, a]))
  const symbols = [...assetBySymbol.keys()]
  const pending = symbolsNeedingPoll(symbols, pollLog, today)

  for (let i = 0; i < pending.length; i++) {
    const symbol = pending[i]
    const asset = assetBySymbol.get(symbol)
    if (asset?.coingeckoId) {
      try {
        const entries = await fetchDailyOhlcEntries(asset.coingeckoId)
        const candle = dailyCandleFromIntradayBars(entries)
        await window.api?.storeCandles('coingecko', symbol, '1Y', [candle])
        pollLog[symbol] = today
        savePollLog(pollLog)
      } catch {
        // Skip this symbol only; the rest of the batch continues.
      }
    }
    if (i < pending.length - 1) await delay(STAGGER_MS)
  }
}
