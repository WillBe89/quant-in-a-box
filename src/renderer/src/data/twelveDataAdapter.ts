import type { Asset, Candle, Timeframe } from '@renderer/types/market'
import { getTwelveDataKey } from './apiKeyStore'

const BASE_URL = 'https://api.twelvedata.com'

const INTERVAL_BY_TIMEFRAME: Record<Timeframe, string> = {
  '1D': '5min',
  '1W': '15min',
  '1M': '1h',
  '3M': '1day',
  '1Y': '1day',
  '5Y': '1week'
}

const OUTPUTSIZE_BY_TIMEFRAME: Record<Timeframe, number> = {
  '1D': 288,
  '1W': 672,
  '1M': 720,
  '3M': 90,
  '1Y': 365,
  '5Y': 260
}

function apiKey(): string {
  const key = getTwelveDataKey()
  if (!key) throw new Error('No TwelveData API key configured — add one in Customize, or set VITE_TWELVE_DATA_API_KEY')
  return key
}

/**
 * TwelveData expects crypto symbols in base/quote pair notation (e.g. "BTC/USD"), confirmed
 * against TwelveData's own docs and asset catalog (whose crypto entries are literally shaped
 * `{"symbol": "BTC/USD"}`) — unlike this app's `Asset.symbol`, which stores crypto as a bare
 * ticker ("BTC") to match Finnhub/CoinGecko's conventions instead. Only crypto gets this
 * transformation; stocks/bonds/fx already pass their bare `Asset.symbol` straight through
 * unchanged, exactly as before this fix, so that existing working path is untouched.
 */
function symbolForRequest(asset: Asset): string {
  return asset.klass === 'crypto' ? `${asset.symbol}/USD` : asset.symbol
}

interface TwelveDataQuote {
  close: string
  percent_change: string
}

export async function fetchQuote(asset: Asset): Promise<Pick<Asset, 'price' | 'changePct'>> {
  const symbol = symbolForRequest(asset)
  const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TwelveData quote failed: ${res.status}`)
  const data = (await res.json()) as TwelveDataQuote & { status?: string; message?: string }
  if (data.status === 'error') throw new Error(data.message || 'TwelveData quote error')
  return { price: parseFloat(data.close), changePct: parseFloat(data.percent_change) }
}

interface TwelveDataSeriesValue {
  datetime: string
  open: string
  high: string
  low: string
  close: string
  volume: string
}

interface TwelveDataSeriesResponse {
  values?: TwelveDataSeriesValue[]
  status: string
  message?: string
}

/**
 * TwelveData returns intraday datetimes as "YYYY-MM-DD HH:mm:ss" (space, no offset) and
 * daily/weekly ones as bare "YYYY-MM-DD". With `timezone=UTC` requested, both need an
 * explicit "Z" to parse as UTC — otherwise engines interpret the space-separated intraday
 * form as local time, silently shifting every intraday candle by the machine's UTC offset.
 */
function parseUtcDatetime(raw: string): number {
  const iso = raw.includes(' ') ? raw.replace(' ', 'T') + 'Z' : raw + 'T00:00:00Z'
  return Math.floor(new Date(iso).getTime() / 1000)
}

// TwelveData returns values most-recent-first; this app expects ascending chronological order.
function mapSeriesValues(values: TwelveDataSeriesValue[]): Candle[] {
  return values
    .slice()
    .reverse()
    .map((v) => ({
      time: parseUtcDatetime(v.datetime),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseFloat(v.volume) || 0
    }))
}

export async function fetchCandles(asset: Asset, timeframe: Timeframe): Promise<Candle[]> {
  const interval = INTERVAL_BY_TIMEFRAME[timeframe]
  const outputsize = OUTPUTSIZE_BY_TIMEFRAME[timeframe]
  const symbol = symbolForRequest(asset)
  const url =
    `${BASE_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}` +
    `&outputsize=${outputsize}&timezone=UTC&apikey=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TwelveData time_series failed: ${res.status}`)
  const data = (await res.json()) as TwelveDataSeriesResponse
  if (data.status === 'error' || !data.values) return []
  return mapSeriesValues(data.values)
}

/**
 * Phase 8.8 — genuine multi-year bulk backfill fetch, used by twelveDataBackfill.ts. A single
 * TwelveData `time_series` call at daily ('1day') resolution can return up to ~5,000 points (about
 * 19 years) per TwelveData's documented per-call cap — `outputsize` here is expected to stay
 * comfortably under that (twelveDataBackfill.ts requests ~5 years, ~1,825 points). Unlike
 * `fetchCandles` above (which maps a `Timeframe` to a pre-set interval/outputsize pair for ordinary
 * per-view chart fetching), this always requests daily bars explicitly regardless of `Timeframe`,
 * since a backfill's whole point is real daily-resolution history.
 */
export async function fetchDailyHistory(asset: Asset, outputsize: number): Promise<Candle[]> {
  const symbol = symbolForRequest(asset)
  const url =
    `${BASE_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day` +
    `&outputsize=${outputsize}&timezone=UTC&apikey=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TwelveData time_series failed: ${res.status}`)
  const data = (await res.json()) as TwelveDataSeriesResponse
  if (data.status === 'error' || !data.values) return []
  return mapSeriesValues(data.values)
}
