import type { Candle, CompanyProfile, NewsCategory, NewsItem, Timeframe } from '@renderer/types/market'
import { getFinnhubKey } from './apiKeyStore'

const BASE_URL = 'https://finnhub.io/api/v1'

const RESOLUTION_BY_TIMEFRAME: Record<Timeframe, string> = {
  '1D': '5',
  '1W': '15',
  '1M': '60',
  '3M': 'D',
  '1Y': 'D',
  '5Y': 'W'
}

const LOOKBACK_SECONDS: Record<Timeframe, number> = {
  '1D': 24 * 60 * 60,
  '1W': 7 * 24 * 60 * 60,
  '1M': 30 * 24 * 60 * 60,
  '3M': 90 * 24 * 60 * 60,
  '1Y': 365 * 24 * 60 * 60,
  '5Y': 5 * 365 * 24 * 60 * 60
}

function apiKey(): string {
  const key = getFinnhubKey()
  if (!key) throw new Error('No Finnhub API key configured — add one in Customize, or set VITE_FINNHUB_API_KEY')
  return key
}

/**
 * Full shape of Finnhub's free-tier `/quote` endpoint, widened (Phase 8.6) from the original
 * `{ price, changePct }` pair so a full daily OHLC candle can be built from a single call — see
 * `quoteToCandle` in data/dailyQuoteAccumulator.ts. `/quote` is the one candle-adjacent endpoint
 * Finnhub's free tier actually permits; `/stock/candle` (fetchCandles/fetchCandlesInRange below)
 * requires a paid plan and 403s on a free key (confirmed against a real key — see the Phase 8
 * report). There is no volume field here at any tier; callers building a Candle from this fill
 * that field with 0.
 */
export interface FinnhubQuote {
  /** current price */
  price: number
  /** percent change vs previous close */
  changePct: number
  /** today's open */
  open: number
  /** today's high */
  high: number
  /** today's low */
  low: number
  /** previous close */
  previousClose: number
  /** quote timestamp, unix seconds */
  timestamp: number
}

/**
 * Real-quote fetch for a single symbol via Finnhub's free /quote endpoint.
 * Originally returned only `{ price, changePct }` for a future UI use that never materialized;
 * widened in Phase 8.6 to power data/dailyQuoteAccumulator.ts's background daily-candle
 * accumulation (see that file). Still not wired into any per-view chart display itself.
 */
export async function fetchQuote(symbol: string): Promise<FinnhubQuote> {
  const res = await fetch(`${BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey()}`)
  if (!res.ok) throw new Error(`Finnhub quote failed: ${res.status}`)
  const data = await res.json()
  return {
    price: data.c,
    changePct: data.dp,
    open: data.o,
    high: data.h,
    low: data.l,
    previousClose: data.pc,
    timestamp: data.t
  }
}

export async function fetchCandles(symbol: string, timeframe: Timeframe): Promise<Candle[]> {
  const to = Math.floor(Date.now() / 1000)
  const from = to - LOOKBACK_SECONDS[timeframe]
  const resolution = RESOLUTION_BY_TIMEFRAME[timeframe]
  const url = `${BASE_URL}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Finnhub candle failed: ${res.status}`)
  const data = await res.json()
  if (data.s !== 'ok') return []
  const candles: Candle[] = []
  for (let i = 0; i < data.t.length; i++) {
    candles.push({
      time: data.t[i],
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i]
    })
  }
  return candles
}

/**
 * Thrown by `fetchCandlesInRange` on any non-2xx response, carrying the real HTTP status so
 * callers can tell a 403 (plan/tier problem — Finnhub's free tier may not permit `/stock/candle`
 * at all, an open question as of writing) apart from a 429 (rate limited) apart from anything
 * else. Also thrown (with the 2xx status that produced it) when Finnhub's response body itself
 * reports its documented "no data" sentinel (`s !== 'ok'`) — that case is a failure for this
 * function's purposes too, not an empty-but-successful result.
 */
export class FinnhubCandleRangeError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'FinnhubCandleRangeError'
    this.status = status
  }
}

/**
 * Explicit-range candle fetch for the bulk historical-download feature (see
 * src/renderer/src/data/historyDownload.ts). Unlike `fetchCandles` above — which uses a fixed
 * lookback window and silently returns `[]` on Finnhub's "no data" sentinel — this never
 * substitutes an empty or synthetic result: any failure throws `FinnhubCandleRangeError` so the
 * download flow can fail loudly and specifically instead of quietly doing nothing.
 */
export async function fetchCandlesInRange(
  symbol: string,
  resolution: string,
  fromUnixSeconds: number,
  toUnixSeconds: number
): Promise<Candle[]> {
  const url = `${BASE_URL}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${fromUnixSeconds}&to=${toUnixSeconds}&token=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new FinnhubCandleRangeError(res.status, `Finnhub candle range fetch failed: HTTP ${res.status}`)
  }
  const data = await res.json()
  if (data.s !== 'ok') {
    throw new FinnhubCandleRangeError(
      res.status,
      `Finnhub returned no data for ${symbol} in the requested range (status: ${data.s})`
    )
  }
  const candles: Candle[] = []
  for (let i = 0; i < data.t.length; i++) {
    candles.push({
      time: data.t[i],
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i]
    })
  }
  return candles
}

export async function fetchCompanyNews(symbol: string): Promise<NewsItem[]> {
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const url = `${BASE_URL}/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Finnhub news failed: ${res.status}`)
  const data = await res.json()
  return (data as any[]).map((item) => ({
    id: String(item.id),
    source: item.source,
    headline: item.headline,
    summary: item.summary,
    url: item.url,
    publishedAt: item.datetime,
    relatedSymbols: [symbol],
    image: item.image || undefined
  }))
}

export async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  const url = `${BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Finnhub profile failed: ${res.status}`)
  const data = await res.json()
  // Finnhub returns HTTP 200 with an empty {} body for an unknown/delisted symbol rather
  // than a 404 — a truthy response is not the same as a valid one.
  if (!data || !data.name) return null
  return {
    symbol,
    name: data.name,
    logo: data.logo ?? '',
    industry: data.finnhubIndustry ?? '',
    marketCapitalization: data.marketCapitalization ?? 0,
    shareOutstanding: data.shareOutstanding ?? 0,
    website: data.weburl ?? '',
    ipo: data.ipo ?? '',
    exchange: data.exchange ?? '',
    currency: data.currency ?? '',
    country: data.country ?? ''
  }
}

export async function fetchGeneralNews(category: NewsCategory): Promise<NewsItem[]> {
  const url = `${BASE_URL}/news?category=${encodeURIComponent(category)}&token=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Finnhub general news failed: ${res.status}`)
  const data = await res.json()
  return (data as any[]).map((item) => ({
    id: String(item.id),
    source: item.source,
    headline: item.headline,
    summary: item.summary,
    url: item.url,
    publishedAt: item.datetime,
    relatedSymbols: [],
    image: item.image || undefined,
    // Finnhub's own response may or may not echo the requested category back reliably —
    // prefer whatever it reports, falling back to the category we actually requested.
    category: item.category ?? category
  }))
}
