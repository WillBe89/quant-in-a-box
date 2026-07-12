import type { Asset, Candle } from '@renderer/types/market'
import { fetchQuote, type FinnhubQuote } from './finnhubAdapter'
import { getFinnhubKey } from './apiKeyStore'

/**
 * Phase 8.6 — daily real-price accumulation via Finnhub's free `/quote` endpoint.
 *
 * Phase 8's bulk historical download and this app's ordinary per-view chart fetching both go
 * through Finnhub's `/stock/candle` endpoint (see finnhubAdapter.ts), which requires a paid plan
 * and 403s on a free key — confirmed against a real key (see the Phase 8 report). That means
 * every chart for a free-tier user has been silently rendering generated mock data this whole
 * time, with no visible indication.
 *
 * `/quote`, in contrast, IS available on Finnhub's free tier: it returns today's price snapshot
 * (current price, day open/high/low, previous close) for a symbol — not history, just today. This
 * module uses it to accumulate one real daily candle per relevant symbol per day, going forward,
 * building real history one real day at a time. It deliberately does NOT attempt to backfill the
 * past — that's a separate, longer-term, non-urgent effort out of scope here.
 */

const POLL_LOG_STORAGE_KEY = 'qiab:dailyQuotePollLog:v1'

/** Stagger between successive `/quote` calls in the same batch, comfortably under Finnhub's
 *  free-tier 60-requests-per-minute limit even for a large watchlist/portfolio. */
const STAGGER_MS = 1200

/** symbol -> last date (YYYY-MM-DD) it was successfully polled. */
export type PollLog = Record<string, string>

/**
 * Pure: which of `symbols` still need polling on `todayStr` (a plain `YYYY-MM-DD` string), given
 * `pollLog`. A symbol with no entry, or whose entry is any date other than `todayStr`, is
 * included; a symbol already polled today is excluded. Dates are compared as plain strings (not
 * `Date` objects) so the day boundary is exact string equality — no timezone/rounding ambiguity.
 * `todayStr` is a parameter (never computed internally via `Date.now()`/`new Date()`) so this
 * stays trivially testable.
 */
export function symbolsNeedingPoll(symbols: string[], pollLog: PollLog, todayStr: string): string[] {
  return symbols.filter((symbol) => pollLog[symbol] !== todayStr)
}

/**
 * Pure: maps one Finnhub `/quote` response into a single daily Candle, using the quote's own
 * timestamp for the candle's `time`. `volume` is not available from `/quote` at any tier, so it's
 * set to 0 — an accepted limitation, not a correctness gap: this app's risk/return math
 * (Sharpe/Sortino/VaR/etc in lib/quant.ts) only ever uses close-to-close returns, never volume.
 */
export function quoteToCandle(quote: FinnhubQuote): Candle {
  return {
    time: quote.timestamp,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    close: quote.price,
    volume: 0
  }
}

/** Loads the persisted poll-log from localStorage, discarding anything that doesn't match the
 *  expected shape (corrupt JSON, non-string values) rather than letting it crash the app or
 *  silently propagate bad data — same defensive pattern as academyProgressStore.ts. */
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

/**
 * Orchestrates one background accumulation pass. `assets` must already be filtered by the caller
 * to 'stocks'/'re' (real-estate assets are plain equity/ETF/REIT tickers on the same Finnhub
 * pipeline as stocks) — not because dataService.ts's `pickLiveService` routing exempts the other
 * classes (it doesn't: crypto routes through Finnhub identically to stocks/re whenever a Finnhub
 * key is configured, and bonds/fx only escape to TwelveData when a TwelveData key is *also*
 * configured), but because crypto's bare-ticker and bonds/fx's yield-series/forex-pair symbols
 * wouldn't resolve as ordinary stock quotes via Finnhub's `/quote` endpoint regardless of routing
 * — see App.tsx's `DAILY_QUOTE_ASSET_CLASSES` comment for the full explanation.
 *
 * For each symbol not yet polled today (per the persisted poll-log), fetches `/quote`, maps the
 * result to one daily Candle, and stores it via the existing `storeCandles('finnhub', symbol,
 * '1Y', ...)` IPC path (no new IPC needed). Calls are sequential with a fixed stagger between
 * them (not fired in parallel) to stay well within Finnhub's free-tier rate limit. A single
 * symbol's failure (bad ticker, network hiccup, rate limit) is caught and skipped — logged
 * nowhere, so it's simply retried on the next pass — without aborting the rest of the batch.
 *
 * No-ops immediately (no error, no network calls) if no Finnhub key is currently configured.
 *
 * The batch-resilience behavior above (one symbol's failure not blocking the rest) is covered by
 * a mocked-fetch unit test in dailyQuoteAccumulator.test.ts. What isn't — and can't be, without a
 * real Finnhub key — is the actual live network call and a real quote landing in SQLite; that's
 * covered by live verification instead, the same known boundary as Phase 8.
 */
export async function runDailyQuoteAccumulation(assets: Asset[]): Promise<void> {
  if (!getFinnhubKey()) return

  const today = todayDateStr()
  const pollLog = loadPollLog()
  const symbols = [...new Set(assets.map((asset) => asset.symbol))]
  const pending = symbolsNeedingPoll(symbols, pollLog, today)

  for (let i = 0; i < pending.length; i++) {
    const symbol = pending[i]
    try {
      const quote = await fetchQuote(symbol)
      const candle = quoteToCandle(quote)
      await window.api?.storeCandles('finnhub', symbol, '1Y', [candle])
      pollLog[symbol] = today
      savePollLog(pollLog)
    } catch {
      // Skip this symbol only; the rest of the batch continues.
    }
    if (i < pending.length - 1) await delay(STAGGER_MS)
  }
}
