import type { Candle } from '@renderer/types/market'
import { fetchCandlesInRange } from './finnhubAdapter'

/**
 * Explicit, user-initiated bulk historical-candle download (Phase 8) — see the "Download
 * historical data" section of the Customize panel. This is deliberately a standalone code path,
 * not a method on `DataService`: `dataService.getCandles` is the passive, cache-then-fetch flow
 * every chart view uses on every render; this only ever runs when the user picks a symbol, picks
 * a number of years, and clicks the download button after seeing the call-count estimate.
 * Finnhub-only — TwelveData is never used here (its free tier's 800-calls-per-period budget is
 * too thin to spend on speculative bulk history, per the original scoping discussion).
 */

const SECONDS_PER_DAY = 24 * 60 * 60
const DAYS_PER_YEAR = 365

/**
 * Finnhub does not document a per-call range cap for daily ('D') resolution candles. This
 * constant is an ASSUMPTION, not a confirmed limit — it stands in until a real key is available
 * to test against and either find documented behavior or observe what actually happens (e.g. a
 * silent truncation, or an error) when a single request spans a very long range. Correct this
 * constant if that turns out to matter.
 *
 * Chosen as 20 years of daily bars because that's also the largest years-of-history preset this
 * app's download UI offers — so in ordinary use through the UI, `estimateCandleDownloadCalls`
 * below always returns 1, and the multi-call scaling only matters if something (a future larger
 * preset, or a direct caller) ever asks for more than this.
 */
export const ASSUMED_MAX_DAYS_PER_CANDLE_CALL = 20 * DAYS_PER_YEAR

/**
 * How many Finnhub `/stock/candle` calls a bulk daily-candle download of `years` of history is
 * expected to cost: 1 up to `ASSUMED_MAX_DAYS_PER_CANDLE_CALL`, scaling beyond it by simple
 * ceiling division. This is exactly the number shown to the user, baked into the download
 * button's own label, before they click — the estimate is never hidden behind the click.
 */
export function estimateCandleDownloadCalls(years: number): number {
  const requestedDays = years * DAYS_PER_YEAR
  return Math.max(1, Math.ceil(requestedDays / ASSUMED_MAX_DAYS_PER_CANDLE_CALL))
}

export interface DownloadHistoricalCandlesParams {
  symbol: string
  years: number
}

export interface HistoryDownloadResult {
  symbol: string
  candleCount: number
  callsMade: number
}

/**
 * Orchestrates one symbol's bulk download: computes the from/to unix range for Finnhub's daily
 * ('D') resolution from the requested `years`, fetches it (split across `estimateCandleDownloadCalls`
 * sequential calls if the range exceeds the assumed per-call cap), and on success stores the
 * combined result via the existing `storeCandles` IPC path — always under the '1Y' timeframe
 * bucket (the same bucket daily-resolution candles already use elsewhere; see
 * RESOLUTION_BY_TIMEFRAME in finnhubAdapter.ts), regardless of how many years were requested, so
 * daily rows are never mixed under a different timeframe key.
 *
 * Rejects on any failure — a bad HTTP status, Finnhub's no-data sentinel, or a local storage
 * write failure — and never partially stores a failed or incomplete download. No mock fallback:
 * this is the one path in the app that must fail loudly rather than paper over a real problem.
 */
export async function downloadHistoricalCandles(
  params: DownloadHistoricalCandlesParams
): Promise<HistoryDownloadResult> {
  const { symbol, years } = params
  const toSeconds = Math.floor(Date.now() / 1000)
  const fromSeconds = toSeconds - years * DAYS_PER_YEAR * SECONDS_PER_DAY
  const callsNeeded = estimateCandleDownloadCalls(years)
  const chunkSeconds = Math.ceil((toSeconds - fromSeconds) / callsNeeded)

  const candles: Candle[] = []
  for (let i = 0; i < callsNeeded; i++) {
    const chunkFrom = fromSeconds + i * chunkSeconds
    const chunkTo = i === callsNeeded - 1 ? toSeconds : Math.min(toSeconds, chunkFrom + chunkSeconds)
    const chunk = await fetchCandlesInRange(symbol, 'D', chunkFrom, chunkTo)
    candles.push(...chunk)
  }

  // Reuses the existing write-side IPC call unchanged — no new IPC needed for storing.
  // Deliberately NOT `.catch()`-swallowed the way dataService.ts's passive per-view fetch paths
  // treat storeCandles failures: this is an explicit, user-initiated action, so a local-storage
  // write failure here must surface to the user as a failure too, not vanish silently.
  await window.api?.storeCandles('finnhub', symbol, '1Y', candles)

  return { symbol, candleCount: candles.length, callsMade: callsNeeded }
}
