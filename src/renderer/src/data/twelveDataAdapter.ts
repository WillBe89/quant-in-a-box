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

interface TwelveDataQuote {
  close: string
  percent_change: string
}

export async function fetchQuote(symbol: string): Promise<Pick<Asset, 'price' | 'changePct'>> {
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

export async function fetchCandles(symbol: string, timeframe: Timeframe): Promise<Candle[]> {
  const interval = INTERVAL_BY_TIMEFRAME[timeframe]
  const outputsize = OUTPUTSIZE_BY_TIMEFRAME[timeframe]
  const url =
    `${BASE_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}` +
    `&outputsize=${outputsize}&timezone=UTC&apikey=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TwelveData time_series failed: ${res.status}`)
  const data = (await res.json()) as TwelveDataSeriesResponse
  if (data.status === 'error' || !data.values) return []
  // TwelveData returns values most-recent-first; this app expects ascending chronological order.
  return data.values
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
