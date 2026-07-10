import type { Asset, Candle, NewsItem, Timeframe } from '@renderer/types/market'

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
  const key = import.meta.env.VITE_FINNHUB_API_KEY
  if (!key) throw new Error('VITE_FINNHUB_API_KEY is not set — see .env.example')
  return key
}

/**
 * Real-quote fetch for a single symbol via Finnhub's /quote endpoint.
 * NOTE: not yet wired into the UI — the app runs on mock data until a key is present
 * (see dataService.ts). This exists so connecting a key later is a one-line swap.
 */
export async function fetchQuote(symbol: string): Promise<Pick<Asset, 'price' | 'changePct'>> {
  const res = await fetch(`${BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey()}`)
  if (!res.ok) throw new Error(`Finnhub quote failed: ${res.status}`)
  const data = await res.json()
  return { price: data.c, changePct: data.dp }
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
    relatedSymbols: [symbol]
  }))
}

export async function fetchGeneralNews(): Promise<NewsItem[]> {
  const url = `${BASE_URL}/news?category=general&token=${apiKey()}`
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
    relatedSymbols: []
  }))
}
