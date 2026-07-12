import type {
  Asset,
  AssetClass,
  Candle,
  CompanyProfile,
  NewsCategory,
  NewsItem,
  OptionQuote,
  Timeframe
} from '@renderer/types/market'
import { blackScholes } from '@renderer/lib/quant'
import { GENERATED_STOCK_ASSETS, GENERATED_CRYPTO_ASSETS } from './assetUniverse'
// Already-bundled local asset (also used for the app's own branding — see Topbar.tsx) reused
// here so mock-mode news thumbnails render with zero network dependency.
import newsThumb from '@renderer/assets/logo-just.png'

const CURATED_ASSETS_BY_CLASS: Record<AssetClass, Asset[]> = {
  stocks: [
    { symbol: 'NVDA', name: 'NVIDIA Corp · NASDAQ', klass: 'stocks', price: 142.87, changePct: 2.36 },
    { symbol: 'AAPL', name: 'Apple Inc · NASDAQ', klass: 'stocks', price: 231.1, changePct: 0.44 },
    { symbol: 'MSFT', name: 'Microsoft Corp · NASDAQ', klass: 'stocks', price: 441.9, changePct: -0.21 }
  ],
  crypto: [
    { symbol: 'BTC', name: 'Bitcoin · Crypto', klass: 'crypto', price: 64230, changePct: -1.12, coingeckoId: 'bitcoin' },
    { symbol: 'ETH', name: 'Ethereum · Crypto', klass: 'crypto', price: 3412, changePct: 1.87, coingeckoId: 'ethereum' },
    { symbol: 'SOL', name: 'Solana · Crypto', klass: 'crypto', price: 172.4, changePct: 4.02, coingeckoId: 'solana' }
  ],
  bonds: [
    { symbol: 'US10Y', name: '10Y Treasury Yield', klass: 'bonds', price: 4.28, changePct: 0.04, isYield: true },
    { symbol: 'US2Y', name: '2Y Treasury Yield', klass: 'bonds', price: 4.62, changePct: -0.02, isYield: true },
    { symbol: 'LQD', name: 'Inv. Grade Corp Bond ETF', klass: 'bonds', price: 109.3, changePct: 0.11 },
    { symbol: 'US1M', name: '1M Treasury Yield', klass: 'bonds', price: 5.32, changePct: 0.01, isYield: true },
    { symbol: 'US3M', name: '3M Treasury Yield', klass: 'bonds', price: 5.24, changePct: 0.01, isYield: true },
    { symbol: 'US6M', name: '6M Treasury Yield', klass: 'bonds', price: 5.05, changePct: -0.01, isYield: true },
    { symbol: 'US1Y', name: '1Y Treasury Yield', klass: 'bonds', price: 4.78, changePct: -0.02, isYield: true },
    { symbol: 'US5Y', name: '5Y Treasury Yield', klass: 'bonds', price: 4.15, changePct: 0.03, isYield: true },
    { symbol: 'US20Y', name: '20Y Treasury Yield', klass: 'bonds', price: 4.51, changePct: 0.02, isYield: true },
    { symbol: 'US30Y', name: '30Y Treasury Yield', klass: 'bonds', price: 4.46, changePct: 0.02, isYield: true },
    { symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', klass: 'bonds', price: 98.6, changePct: 0.08 },
    { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', klass: 'bonds', price: 72.9, changePct: 0.07 },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', klass: 'bonds', price: 92.4, changePct: 0.32 },
    { symbol: 'IEF', name: 'iShares 7-10 Year Treasury Bond ETF', klass: 'bonds', price: 95.1, changePct: 0.14 },
    { symbol: 'SHY', name: 'iShares 1-3 Year Treasury Bond ETF', klass: 'bonds', price: 82.3, changePct: 0.02 },
    { symbol: 'HYG', name: 'iShares iBoxx High Yield Corp Bond ETF', klass: 'bonds', price: 78.5, changePct: -0.09 },
    { symbol: 'JNK', name: 'SPDR Bloomberg High Yield Bond ETF', klass: 'bonds', price: 97.2, changePct: -0.08 },
    { symbol: 'MUB', name: 'iShares National Muni Bond ETF', klass: 'bonds', price: 106.8, changePct: 0.05 },
    { symbol: 'TIP', name: 'iShares TIPS Bond ETF', klass: 'bonds', price: 108.4, changePct: 0.06 },
    { symbol: 'BNDX', name: 'Vanguard Total International Bond ETF', klass: 'bonds', price: 48.9, changePct: 0.03 },
    { symbol: 'EMB', name: 'iShares JPM USD Emerging Markets Bond ETF', klass: 'bonds', price: 88.7, changePct: 0.15 },
    { symbol: 'VCIT', name: 'Vanguard Interm.-Term Corp Bond ETF', klass: 'bonds', price: 80.6, changePct: 0.1 },
    { symbol: 'VCSH', name: 'Vanguard Short-Term Corp Bond ETF', klass: 'bonds', price: 76.8, changePct: 0.03 },
    { symbol: 'SPTL', name: 'SPDR Portfolio Long Term Treasury ETF', klass: 'bonds', price: 30.2, changePct: 0.28 }
  ],
  fx: [
    { symbol: 'EURUSD', name: 'Euro / US Dollar', klass: 'fx', price: 1.0842, changePct: 0.18 },
    { symbol: 'GBPUSD', name: 'British Pound / USD', klass: 'fx', price: 1.2735, changePct: -0.09 },
    { symbol: 'XAUUSD', name: 'Gold Spot', klass: 'fx', price: 2384.2, changePct: 0.55 },
    { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', klass: 'fx', price: 157.32, changePct: 0.12 },
    { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', klass: 'fx', price: 0.8912, changePct: -0.06 },
    { symbol: 'AUDUSD', name: 'Australian Dollar / USD', klass: 'fx', price: 0.6614, changePct: 0.21 },
    { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', klass: 'fx', price: 1.3695, changePct: -0.04 },
    { symbol: 'NZDUSD', name: 'New Zealand Dollar / USD', klass: 'fx', price: 0.6098, changePct: 0.14 },
    { symbol: 'EURJPY', name: 'Euro / Japanese Yen', klass: 'fx', price: 170.58, changePct: 0.25 },
    { symbol: 'EURGBP', name: 'Euro / British Pound', klass: 'fx', price: 0.8514, changePct: -0.03 },
    { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', klass: 'fx', price: 200.36, changePct: 0.19 },
    { symbol: 'EURCHF', name: 'Euro / Swiss Franc', klass: 'fx', price: 0.9662, changePct: 0.02 },
    { symbol: 'AUDJPY', name: 'Australian Dollar / Japanese Yen', klass: 'fx', price: 104.06, changePct: 0.31 },
    { symbol: 'USDMXN', name: 'US Dollar / Mexican Peso', klass: 'fx', price: 18.24, changePct: -0.11 },
    { symbol: 'USDZAR', name: 'US Dollar / South African Rand', klass: 'fx', price: 18.02, changePct: 0.28 },
    { symbol: 'USDTRY', name: 'US Dollar / Turkish Lira', klass: 'fx', price: 32.85, changePct: 0.44 },
    { symbol: 'USDSEK', name: 'US Dollar / Swedish Krona', klass: 'fx', price: 10.62, changePct: -0.08 },
    { symbol: 'USDNOK', name: 'US Dollar / Norwegian Krone', klass: 'fx', price: 10.71, changePct: -0.07 },
    { symbol: 'XAGUSD', name: 'Silver Spot', klass: 'fx', price: 29.14, changePct: 0.62 },
    { symbol: 'XPTUSD', name: 'Platinum Spot', klass: 'fx', price: 967.5, changePct: 0.19 }
  ],
  re: [
    { symbol: 'VNQ', name: 'Vanguard Real Estate ETF (REIT proxy)', klass: 're', price: 88.41, changePct: 0.62 },
    { symbol: 'IYR', name: 'iShares US Real Estate ETF (REIT proxy)', klass: 're', price: 92.05, changePct: 0.58 },
    { symbol: 'O', name: 'Realty Income Corp', klass: 're', price: 56.3, changePct: 0.41 },
    { symbol: 'PLD', name: 'Prologis, Inc.', klass: 're', price: 108.9, changePct: -0.22 },
    { symbol: 'AMT', name: 'American Tower Corp', klass: 're', price: 196.4, changePct: 0.18 },
    { symbol: 'EQIX', name: 'Equinix, Inc.', klass: 're', price: 812.6, changePct: 0.55 },
    { symbol: 'PSA', name: 'Public Storage', klass: 're', price: 289.3, changePct: -0.14 },
    { symbol: 'SPG', name: 'Simon Property Group', klass: 're', price: 154.2, changePct: 0.33 },
    { symbol: 'AVB', name: 'AvalonBay Communities', klass: 're', price: 198.7, changePct: 0.09 },
    { symbol: 'EQR', name: 'Equity Residential', klass: 're', price: 65.8, changePct: 0.12 },
    { symbol: 'DLR', name: 'Digital Realty Trust', klass: 're', price: 152.4, changePct: 0.47 },
    { symbol: 'WELL', name: 'Welltower Inc.', klass: 're', price: 118.6, changePct: 0.29 },
    { symbol: 'CCI', name: 'Crown Castle Inc.', klass: 're', price: 104.2, changePct: -0.18 },
    { symbol: 'EXR', name: 'Extra Space Storage', klass: 're', price: 143.9, changePct: 0.06 },
    { symbol: 'MAA', name: 'Mid-America Apartment Communities', klass: 're', price: 137.5, changePct: 0.15 },
    { symbol: 'ESS', name: 'Essex Property Trust', klass: 're', price: 268.3, changePct: 0.21 },
    { symbol: 'SCHH', name: 'Schwab US REIT ETF', klass: 're', price: 20.1, changePct: 0.24 },
    { symbol: 'XLRE', name: 'Real Estate Select Sector SPDR Fund', klass: 're', price: 39.6, changePct: 0.27 },
    { symbol: 'RWR', name: 'SPDR Dow Jones REIT ETF', klass: 're', price: 92.8, changePct: 0.2 }
  ]
}

/** A few curated symbols (NVDA/AAPL/MSFT, BTC/ETH/SOL) are real tickers that also exist in the
 *  generated NASDAQ-Trader/CoinGecko-sourced universe below, which caused genuine duplicate-key
 *  React warnings anywhere both lists get rendered together (search results, the asset browser).
 *  Rather than dropping either copy outright: keep the curated entry's position (index 0 of
 *  `stocks`/`crypto` is relied on elsewhere as the default startup symbol - see
 *  AppStateContext.tsx's "Slot 0 keeps today's exact startup default" fallback), but merge in
 *  whatever richer metadata (sector/industry/marketCap/country/ipoYear) the generated version
 *  has, then drop that symbol from the generated array so it isn't rendered a second time. */
function dedupeCuratedAgainstGenerated(curated: Asset[], generated: Asset[]): [Asset[], Asset[]] {
  const generatedBySymbol = new Map(generated.map((a) => [a.symbol, a]))
  const mergedCurated = curated.map((c) => {
    const match = generatedBySymbol.get(c.symbol)
    return match
      ? {
          ...c,
          sector: match.sector,
          industry: match.industry,
          marketCap: match.marketCap,
          country: match.country,
          ipoYear: match.ipoYear,
          coingeckoId: match.coingeckoId
        }
      : c
  })
  const curatedSymbols = new Set(curated.map((c) => c.symbol))
  const dedupedGenerated = generated.filter((a) => !curatedSymbols.has(a.symbol))
  return [mergedCurated, dedupedGenerated]
}

const [mergedCuratedStocks, dedupedGeneratedStocks] = dedupeCuratedAgainstGenerated(
  CURATED_ASSETS_BY_CLASS.stocks,
  GENERATED_STOCK_ASSETS
)
const [mergedCuratedCrypto, dedupedGeneratedCrypto] = dedupeCuratedAgainstGenerated(
  CURATED_ASSETS_BY_CLASS.crypto,
  GENERATED_CRYPTO_ASSETS
)

export const ASSETS_BY_CLASS: Record<AssetClass, Asset[]> = {
  ...CURATED_ASSETS_BY_CLASS,
  stocks: [...mergedCuratedStocks, ...dedupedGeneratedStocks],
  crypto: [...mergedCuratedCrypto, ...dedupedGeneratedCrypto]
}

export const ALL_ASSETS: Asset[] = Object.values(ASSETS_BY_CLASS).flat()

/** Shared broad-market benchmark used for beta calculations wherever a single
 *  market proxy is needed (portfolio-level and single-symbol risk stats alike). */
export const SPX_PROXY_ASSET: Asset = {
  symbol: 'SPXPROXY',
  name: 'Broad market proxy',
  klass: 'stocks',
  price: 5500,
  changePct: 0.5
}

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

/** Mirrors main/localDb.ts's UserAssetRecord shape locally (see that file's own header comment
 *  for why main and renderer don't import each other's data modules directly) — one listing the
 *  user personally imported via Customize > Import local listings. */
export interface UserAssetRecord {
  symbol: string
  name: string
  klass: string
  sector?: string
  country?: string
  exchange?: string
}

/** Deterministic seeded price/changePct for a user-imported listing — same hashSymbol/
 *  seededRandom pair as every other generator in this file, reused directly rather than
 *  duplicated since this function lives in the same module they're already private to. Unlike
 *  the marketCap synthesis in generateCompanyProfile, there's no existing price to perturb here
 *  (a freshly-imported symbol has no baseline of its own), so a plausible-looking price and day
 *  change are synthesized directly from the symbol hash alone. */
function assetFromUserRecord(record: UserAssetRecord): Asset {
  const rand = seededRandom(hashSymbol(record.symbol))
  const price = Math.round((2 + rand() * 498) * 100) / 100
  const changePct = Math.round((rand() - 0.5) * 600) / 100
  return {
    symbol: record.symbol,
    name: record.name,
    klass: 'stocks',
    price,
    changePct,
    sector: record.sector,
    country: record.country,
    exchange: record.exchange
  }
}

/** Merges user-imported listings into the shared ALL_ASSETS/ASSETS_BY_CLASS.stocks arrays IN
 *  PLACE — called once at app startup, after the main process's data:getUserAssets IPC call
 *  resolves (see the effect in AppStateContext.tsx). Every existing
 *  `import { ALL_ASSETS } from '@renderer/data/mockData'` call site keeps working completely
 *  unchanged: since ALL_ASSETS/ASSETS_BY_CLASS.stocks are never reassigned (only ever pushed
 *  into), every module holding that same array reference sees the merged-in rows the moment
 *  this runs, with no code change required at any of those call sites — the static import
 *  becomes effectively dynamic at runtime.
 *  Idempotent and duplicate-safe: skips any record whose symbol is already present in ALL_ASSETS
 *  (whether bundled or already merged in) — a second, authoritative safety net on top of
 *  main/userAssetImport.ts's own dedupe, and what makes this safe to call more than once (e.g.
 *  React StrictMode's double-invoked effects in dev). */
export function mergeUserAssets(records: UserAssetRecord[]): void {
  const existingSymbols = new Set(ALL_ASSETS.map((a) => a.symbol))
  for (const record of records) {
    if (existingSymbols.has(record.symbol)) continue
    const asset = assetFromUserRecord(record)
    existingSymbols.add(asset.symbol)
    ASSETS_BY_CLASS.stocks.push(asset)
    ALL_ASSETS.push(asset)
  }
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
    relatedSymbols: ['US10Y', 'US2Y', 'LQD'],
    category: 'general'
  },
  {
    source: 'Bloomberg',
    headline: 'Chipmakers rally as AI infrastructure spend guidance beats estimates',
    summary:
      'Several major semiconductor suppliers raised forward guidance citing sustained demand from hyperscale data center buildouts, sending the sector to fresh highs in early trading.',
    url: 'https://www.bloomberg.com/markets',
    relatedSymbols: ['NVDA'],
    category: 'general',
    image: newsThumb
  },
  {
    source: 'MarketWatch',
    headline: '10-year yield ticks up ahead of this week’s Treasury auction',
    summary:
      'Yields drifted higher as traders positioned ahead of a $58B note auction, with dealers watching foreign demand metrics closely after last month’s soft bid-to-cover ratio.',
    url: 'https://www.marketwatch.com/investing/bonds',
    relatedSymbols: ['US10Y'],
    category: 'general'
  },
  {
    source: 'Reuters',
    headline: 'Real estate ETFs gain as rate-cut bets lift rate-sensitive sectors',
    summary:
      'REIT-focused funds outperformed the broader market as investors rotated into sectors seen as most sensitive to an eventual easing in borrowing costs.',
    url: 'https://www.reuters.com/markets/us/',
    relatedSymbols: ['VNQ', 'IYR'],
    category: 'general'
  },
  {
    source: 'CNBC',
    headline: 'Bitcoin slips below key level after large exchange outflows',
    summary:
      'On-chain data showed a notable uptick in exchange outflows overnight, which some analysts read as accumulation, even as spot price pulled back from recent highs.',
    url: 'https://www.cnbc.com/cryptoworld/',
    relatedSymbols: ['BTC', 'ETH'],
    category: 'crypto',
    image: newsThumb
  },
  {
    source: 'Bloomberg',
    headline: 'Apple supplier checks point to steady handset demand into year-end',
    summary:
      'Component-level checks across the supply chain suggest order volumes are holding up better than the cautious guidance implied last quarter, easing some concern about a demand air pocket.',
    url: 'https://www.bloomberg.com/markets',
    relatedSymbols: ['AAPL'],
    category: 'general'
  },
  {
    source: 'Reuters',
    headline: 'Cloud spend reacceleration lifts enterprise software and infrastructure names',
    summary:
      'Several large enterprise customers signaled renewed multi-year commitments to cloud infrastructure spend, a read-through investors are treating as broadly positive for the sector.',
    url: 'https://www.reuters.com/technology/',
    relatedSymbols: ['MSFT'],
    category: 'general'
  },
  {
    source: 'CoinDesk',
    headline: 'Ethereum network upgrade proposal advances toward testnet rollout',
    summary:
      'Core developers moved a long-discussed upgrade proposal into testnet staging, with a mainnet timeline still pending further review — historically a period of elevated volatility for the token.',
    url: 'https://www.coindesk.com/tech/',
    relatedSymbols: ['ETH'],
    category: 'crypto'
  },
  {
    source: 'The Block',
    headline: 'Solana network activity hits multi-month high on renewed retail interest',
    summary:
      'On-chain transaction counts and active wallet metrics climbed to their highest levels in several months, though analysts caution activity metrics can be inflated by low-value automated transactions.',
    url: 'https://www.theblock.co/',
    relatedSymbols: ['SOL'],
    category: 'crypto'
  },
  {
    source: 'Reuters',
    headline: 'Dollar steadies as traders weigh diverging central bank paths',
    summary:
      'The greenback held recent gains against major peers as markets priced in a slower pace of rate cuts domestically than in several other developed economies.',
    url: 'https://www.reuters.com/markets/currencies/',
    relatedSymbols: ['EURUSD', 'GBPUSD'],
    category: 'forex'
  },
  {
    source: 'MarketWatch',
    headline: 'Gold holds near highs as investors weigh safe-haven demand against rate path',
    summary:
      'Bullion prices consolidated near recent highs, with continued central bank buying offsetting some pressure from a steadier dollar and diminished expectations for near-term rate cuts.',
    url: 'https://www.marketwatch.com/investing/future/gold',
    relatedSymbols: ['XAUUSD'],
    category: 'forex',
    image: newsThumb
  },
  {
    source: 'Bloomberg',
    headline: 'Chipmaker to acquire AI inference startup in all-cash deal',
    summary:
      'The acquirer said the deal accelerates its push into specialized inference hardware and is expected to close within two quarters pending regulatory approval, with reports of the takeover premium sending the target’s shares sharply higher.',
    url: 'https://www.bloomberg.com/deals',
    // Deliberately overlaps with the default watchlist (NVDA) rather than a symbol outside it,
    // so this template is reachable via the symbol-relevance filter in the app's out-of-the-box
    // state, not just when a user has customized their watchlist to include a different stock.
    relatedSymbols: ['NVDA'],
    category: 'merger'
  }
]

const MOCK_INDUSTRIES = [
  'Software—Infrastructure',
  'Semiconductors',
  'Consumer Electronics',
  'Internet Retail',
  'Biotechnology',
  'Banks—Diversified',
  'Oil & Gas Integrated',
  'Aerospace & Defense'
]

/** Deterministic mock company profile for stocks-class assets, keyed off the same
 *  hashSymbol/seededRandom pair every other generator in this file uses. Returns null for
 *  any non-'stocks' asset class — the same rule the real Finnhub-backed path follows — so
 *  the "not available for this asset class" UI state is exercisable even with zero API keys
 *  configured. `logo` is deliberately left empty so the logo-fallback UI path is exercised
 *  in mock mode too, not just on a real-API failure. */
export function generateCompanyProfile(asset: Asset): CompanyProfile | null {
  if (asset.klass !== 'stocks') return null
  const seed = hashSymbol(asset.symbol)
  const rand = seededRandom(seed)
  // Real data from a NASDAQ screener export (see assetUniverse.ts) takes priority per-field;
  // anything the source didn't have for this symbol falls back to the existing synthetic
  // generation, same seeded approach as before.
  const marketCapitalization = asset.marketCap
    ? Math.round(asset.marketCap / 1_000_000) // real, in dollars -> millions
    : Math.round(asset.price * (500 + rand() * 15_000)) // synthetic, already in millions
  const shareOutstanding =
    asset.marketCap && asset.price > 0
      ? Math.round(marketCapitalization / asset.price)
      : Math.round(500 + rand() * 15_000)
  const industry = asset.industry ?? asset.sector ?? MOCK_INDUSTRIES[seed % MOCK_INDUSTRIES.length]
  const ipoYear = asset.ipoYear ?? 1990 + Math.floor(rand() * 34)
  const ipoMonth = 1 + Math.floor(rand() * 12)
  const ipoDay = 1 + Math.floor(rand() * 28)
  const ipo = `${ipoYear}-${String(ipoMonth).padStart(2, '0')}-${String(ipoDay).padStart(2, '0')}`
  return {
    symbol: asset.symbol,
    name: asset.name.split(' · ')[0],
    logo: '',
    industry,
    marketCapitalization,
    shareOutstanding,
    website: `https://www.${asset.symbol.toLowerCase()}.example.com`,
    ipo,
    exchange: 'NASDAQ',
    currency: 'USD',
    country: asset.country === 'United States' ? 'US' : (asset.country ?? 'US')
  }
}

export function generateNews(relevantSymbols?: string[], categories?: NewsCategory[]): NewsItem[] {
  const now = Math.floor(Date.now() / 1000)
  const withIds = NEWS_TEMPLATES.map((item, i) => ({
    ...item,
    id: `mock-${i}`,
    publishedAt: now - (i + 1) * (25 * 60)
  }))

  let pool = withIds
  if (relevantSymbols && relevantSymbols.length > 0) {
    const filtered = withIds.filter((item) => item.relatedSymbols.some((s) => relevantSymbols.includes(s)))
    // Fall back to the full feed rather than showing an empty card when nothing matches —
    // this small mock pool doesn't cover every symbol, and "no news" reads as broken, not filtered.
    pool = filtered.length > 0 ? filtered : withIds
  }

  // Unlike the symbol fallback above, a category filter that matches nothing is a real,
  // intentional result (the user toggled every matching category off) — no fallback here.
  if (categories && categories.length > 0) {
    pool = pool.filter((item) => categories.includes(item.category as NewsCategory))
  }

  return pool
}
