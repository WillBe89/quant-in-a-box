import type { Asset, AssetClass, Candle, NewsItem, OptionQuote, Timeframe } from '@renderer/types/market'
import { blackScholes } from '@renderer/lib/quant'

export const ASSETS_BY_CLASS: Record<AssetClass, Asset[]> = {
  stocks: [
    { symbol: 'NVDA', name: 'NVIDIA Corp · NASDAQ', klass: 'stocks', price: 142.87, changePct: 2.36 },
    { symbol: 'AAPL', name: 'Apple Inc · NASDAQ', klass: 'stocks', price: 231.1, changePct: 0.44 },
    { symbol: 'MSFT', name: 'Microsoft Corp · NASDAQ', klass: 'stocks', price: 441.9, changePct: -0.21 }
  ],
  crypto: [
    { symbol: 'BTC', name: 'Bitcoin · Crypto', klass: 'crypto', price: 64230, changePct: -1.12 },
    { symbol: 'ETH', name: 'Ethereum · Crypto', klass: 'crypto', price: 3412, changePct: 1.87 },
    { symbol: 'SOL', name: 'Solana · Crypto', klass: 'crypto', price: 172.4, changePct: 4.02 }
  ],
  bonds: [
    { symbol: 'US10Y', name: '10Y Treasury Yield', klass: 'bonds', price: 4.28, changePct: 0.04, isYield: true },
    { symbol: 'US2Y', name: '2Y Treasury Yield', klass: 'bonds', price: 4.62, changePct: -0.02, isYield: true },
    { symbol: 'LQD', name: 'Inv. Grade Corp Bond ETF', klass: 'bonds', price: 109.3, changePct: 0.11 }
  ],
  fx: [
    { symbol: 'EURUSD', name: 'Euro / US Dollar', klass: 'fx', price: 1.0842, changePct: 0.18 },
    { symbol: 'GBPUSD', name: 'British Pound / USD', klass: 'fx', price: 1.2735, changePct: -0.09 },
    { symbol: 'XAUUSD', name: 'Gold Spot', klass: 'fx', price: 2384.2, changePct: 0.55 }
  ],
  re: [
    { symbol: 'VNQ', name: 'Vanguard Real Estate ETF (REIT proxy)', klass: 're', price: 88.41, changePct: 0.62 },
    { symbol: 'IYR', name: 'iShares US Real Estate ETF (REIT proxy)', klass: 're', price: 92.05, changePct: 0.58 }
  ]
}

export const ALL_ASSETS: Asset[] = Object.values(ASSETS_BY_CLASS).flat()

const TIMEFRAME_BARS: Record<Timeframe, number> = {
  '1D': 48,
  '1W': 60,
  '1M': 90,
  '3M': 90,
  '1Y': 120,
  '5Y': 150
}

const TIMEFRAME_STEP_SECONDS: Record<Timeframe, number> = {
  '1D': 30 * 60,
  '1W': 3 * 60 * 60,
  '1M': 24 * 60 * 60,
  '3M': 3 * 24 * 60 * 60,
  '1Y': 7 * 24 * 60 * 60,
  '5Y': 30 * 24 * 60 * 60
}

/** Deterministic-ish pseudo-random walk seeded from the symbol so re-renders stay stable per symbol. */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function hashSymbol(symbol: string): number {
  let h = 0
  for (let i = 0; i < symbol.length; i++) h = (h << 5) - h + symbol.charCodeAt(i)
  return Math.abs(h) || 1
}

export function generateCandles(asset: Asset, timeframe: Timeframe): Candle[] {
  const n = TIMEFRAME_BARS[timeframe]
  const step = TIMEFRAME_STEP_SECONDS[timeframe]
  const rand = seededRandom(hashSymbol(asset.symbol) + timeframe.length)
  const vol = asset.price * (asset.isYield ? 0.02 : 0.012)
  let price = asset.price * (1 - (asset.changePct / 100) * 3)
  const now = Math.floor(Date.now() / 1000 / step) * step
  const candles: Candle[] = []
  for (let i = 0; i < n; i++) {
    const open = price
    const drift = (rand() - 0.48) * vol
    const close = Math.max(open + drift, asset.price * 0.2)
    const high = Math.max(open, close) + rand() * vol * 0.6
    const low = Math.min(open, close) - rand() * vol * 0.6
    candles.push({
      time: now - (n - 1 - i) * step,
      open,
      high,
      low,
      close,
      // Scaled to a realistic share-volume range (hundreds of thousands to single-digit millions)
      // rather than the raw 0-1 fraction — this is displayed directly in the chart hover readout.
      volume: Math.round(200_000 + rand() * 7_800_000)
    })
    price = close
  }
  candles[candles.length - 1].close = asset.price
  return candles
}

export function generateOptionChain(asset: Asset): OptionQuote[] {
  const S = asset.price
  const strikes = [-0.06, -0.02, 0, 0.02, 0.06].map((pct) => Math.round(S * (1 + pct) * 100) / 100)
  const T = 30 / 365
  const r = 0.045
  const sigma = 0.35 + (Math.abs(asset.changePct) / 100) * 2
  return strikes.map((K) => {
    const g = blackScholes(S, K, T, r, sigma, 'call')
    return {
      strike: K,
      type: 'call',
      delta: g.delta,
      gamma: g.gamma,
      theta: g.theta,
      vega: g.vega,
      rho: g.rho,
      impliedVol: sigma,
      price: g.price
    }
  })
}

const NEWS_TEMPLATES: Array<Omit<NewsItem, 'id' | 'publishedAt'>> = [
  {
    source: 'Reuters',
    headline: 'Fed signals patience as inflation cools toward target',
    summary:
      'Policymakers held rates steady and reiterated a data-dependent path, noting three consecutive months of softer core inflation readings. Futures markets modestly increased bets on a cut later this year.',
    url: 'https://www.reuters.com/markets/',
    relatedSymbols: ['US10Y', 'US2Y', 'LQD']
  },
  {
    source: 'Bloomberg',
    headline: 'Chipmakers rally as AI infrastructure spend guidance beats estimates',
    summary:
      'Several major semiconductor suppliers raised forward guidance citing sustained demand from hyperscale data center buildouts, sending the sector to fresh highs in early trading.',
    url: 'https://www.bloomberg.com/markets',
    relatedSymbols: ['NVDA']
  },
  {
    source: 'MarketWatch',
    headline: '10-year yield ticks up ahead of this week’s Treasury auction',
    summary:
      'Yields drifted higher as traders positioned ahead of a $58B note auction, with dealers watching foreign demand metrics closely after last month’s soft bid-to-cover ratio.',
    url: 'https://www.marketwatch.com/investing/bonds',
    relatedSymbols: ['US10Y']
  },
  {
    source: 'Reuters',
    headline: 'Real estate ETFs gain as rate-cut bets lift rate-sensitive sectors',
    summary:
      'REIT-focused funds outperformed the broader market as investors rotated into sectors seen as most sensitive to an eventual easing in borrowing costs.',
    url: 'https://www.reuters.com/markets/us/',
    relatedSymbols: ['VNQ', 'IYR']
  },
  {
    source: 'CNBC',
    headline: 'Bitcoin slips below key level after large exchange outflows',
    summary:
      'On-chain data showed a notable uptick in exchange outflows overnight, which some analysts read as accumulation, even as spot price pulled back from recent highs.',
    url: 'https://www.cnbc.com/cryptoworld/',
    relatedSymbols: ['BTC', 'ETH']
  },
  {
    source: 'Bloomberg',
    headline: 'Apple supplier checks point to steady handset demand into year-end',
    summary:
      'Component-level checks across the supply chain suggest order volumes are holding up better than the cautious guidance implied last quarter, easing some concern about a demand air pocket.',
    url: 'https://www.bloomberg.com/markets',
    relatedSymbols: ['AAPL']
  },
  {
    source: 'Reuters',
    headline: 'Cloud spend reacceleration lifts enterprise software and infrastructure names',
    summary:
      'Several large enterprise customers signaled renewed multi-year commitments to cloud infrastructure spend, a read-through investors are treating as broadly positive for the sector.',
    url: 'https://www.reuters.com/technology/',
    relatedSymbols: ['MSFT']
  },
  {
    source: 'CoinDesk',
    headline: 'Ethereum network upgrade proposal advances toward testnet rollout',
    summary:
      'Core developers moved a long-discussed upgrade proposal into testnet staging, with a mainnet timeline still pending further review — historically a period of elevated volatility for the token.',
    url: 'https://www.coindesk.com/tech/',
    relatedSymbols: ['ETH']
  },
  {
    source: 'The Block',
    headline: 'Solana network activity hits multi-month high on renewed retail interest',
    summary:
      'On-chain transaction counts and active wallet metrics climbed to their highest levels in several months, though analysts caution activity metrics can be inflated by low-value automated transactions.',
    url: 'https://www.theblock.co/',
    relatedSymbols: ['SOL']
  },
  {
    source: 'Reuters',
    headline: 'Dollar steadies as traders weigh diverging central bank paths',
    summary:
      'The greenback held recent gains against major peers as markets priced in a slower pace of rate cuts domestically than in several other developed economies.',
    url: 'https://www.reuters.com/markets/currencies/',
    relatedSymbols: ['EURUSD', 'GBPUSD']
  },
  {
    source: 'MarketWatch',
    headline: 'Gold holds near highs as investors weigh safe-haven demand against rate path',
    summary:
      'Bullion prices consolidated near recent highs, with continued central bank buying offsetting some pressure from a steadier dollar and diminished expectations for near-term rate cuts.',
    url: 'https://www.marketwatch.com/investing/future/gold',
    relatedSymbols: ['XAUUSD']
  }
]

export function generateNews(relevantSymbols?: string[]): NewsItem[] {
  const now = Math.floor(Date.now() / 1000)
  const withIds = NEWS_TEMPLATES.map((item, i) => ({
    ...item,
    id: `mock-${i}`,
    publishedAt: now - (i + 1) * (25 * 60)
  }))
  if (!relevantSymbols || relevantSymbols.length === 0) return withIds
  const filtered = withIds.filter((item) => item.relatedSymbols.some((s) => relevantSymbols.includes(s)))
  // Fall back to the full feed rather than showing an empty card when nothing matches —
  // this small mock pool doesn't cover every symbol, and "no news" reads as broken, not filtered.
  return filtered.length > 0 ? filtered : withIds
}
