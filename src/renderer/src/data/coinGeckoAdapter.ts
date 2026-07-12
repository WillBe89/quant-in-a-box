import type { Asset, Candle, Timeframe } from '@renderer/types/market'
import { getCoinGeckoKey } from './apiKeyStore'

/**
 * Phase 8.8 — CoinGecko candle adapter, the free-tier crypto fallback for when no TwelveData key
 * is configured (see dataService.ts's `pickLiveService`). Unlike Finnhub — confirmed premium-only
 * for candles across every asset class, crypto included — CoinGecko's public `/coins/{id}/ohlc`
 * endpoint already returns real OHLC history with no key at all; a key (the `x_cg_demo_api_key`
 * query parameter, confirmed via CoinGecko's own docs — a query parameter, not a header, on the
 * free/Demo tier) just raises the rate limit.
 *
 * Only ever usable for an asset that carries a `coingeckoId` (see Asset.coingeckoId) — matched
 * against CoinGecko's public markets list when the asset universe was generated. An asset without
 * one cannot be served here at all; callers fall back to mock in that case.
 */

const BASE_URL = 'https://api.coingecko.com/api/v3'

/**
 * CoinGecko's free/Demo tier auto-selects OHLC candle granularity from the `days` parameter —
 * there is no way to force daily resolution on this tier (the `interval=daily` override is
 * documented as a paid-plan-only capability). Confirmed granularity, straight from CoinGecko's own
 * docs:
 *   - days 1-2:  30-minute candles
 *   - days 3-30: 4-hour candles   (finer than daily)
 *   - days 31+:  4-day candles    (coarser than daily)
 * This app maps its own Timeframe buttons to the closest `days` value below. The honest
 * consequence: a '1D'/'1W'/'1M' chart gets several real bars per day (finer than daily), while a
 * '3M'/'1Y'/'5Y' chart gets one real bar roughly every 4 days (coarser than daily) — this adapter
 * maps whatever CoinGecko actually returns rather than pretending it's uniform daily resolution at
 * every zoom level.
 */
const DAYS_BY_TIMEFRAME: Record<Timeframe, string> = {
  '1D': '1',
  '1W': '7',
  '1M': '30',
  '3M': '90',
  '1Y': '365',
  '5Y': 'max'
}

/** Raw OHLC tuple CoinGecko's /ohlc endpoint returns: [timestamp_ms, open, high, low, close].
 *  There is no volume field on this endpoint at any tier. */
export type CoinGeckoOhlcEntry = [number, number, number, number, number]

/**
 * Pure: builds the `/coins/{id}/ohlc` request URL. Appends the CoinGecko key as the
 * `x_cg_demo_api_key` query parameter when one is configured; omitted entirely otherwise, since
 * the public endpoint already works keyless (just at a lower rate limit).
 */
export function buildOhlcUrl(coingeckoId: string, timeframe: Timeframe, key: string | undefined): string {
  const params = new URLSearchParams({ vs_currency: 'usd', days: DAYS_BY_TIMEFRAME[timeframe] })
  if (key) params.set('x_cg_demo_api_key', key)
  return `${BASE_URL}/coins/${encodeURIComponent(coingeckoId)}/ohlc?${params.toString()}`
}

/**
 * Pure: maps CoinGecko's raw OHLC tuples into this app's Candle shape. `time` converts CoinGecko's
 * milliseconds to this app's unix-seconds convention; `volume` is always 0 (this endpoint never
 * returns volume at any tier).
 */
export function mapOhlcEntries(entries: CoinGeckoOhlcEntry[]): Candle[] {
  return entries.map(([timeMs, open, high, low, close]) => ({
    time: Math.floor(timeMs / 1000),
    open,
    high,
    low,
    close,
    volume: 0
  }))
}

/**
 * Live candle fetch for one crypto asset. Returns `[]` (never throws) when `asset` has no
 * `coingeckoId` — dataService.ts's CoinGeckoDataService treats that identically to a failed fetch
 * and falls back to mock, matching every other live adapter's per-call fallback behavior in this
 * app.
 */
export async function fetchCandles(asset: Asset, timeframe: Timeframe): Promise<Candle[]> {
  if (!asset.coingeckoId) return []
  const url = buildOhlcUrl(asset.coingeckoId, timeframe, getCoinGeckoKey())
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CoinGecko OHLC failed: ${res.status}`)
  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []
  return mapOhlcEntries(data as CoinGeckoOhlcEntry[])
}
