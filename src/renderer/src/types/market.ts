export type AssetClass = 'stocks' | 'crypto' | 'bonds' | 'fx' | 're'

export interface Asset {
  symbol: string
  name: string
  klass: AssetClass
  price: number
  changePct: number
  /** true when `price` is a yield/percentage rather than a currency amount */
  isYield?: boolean
  /** Real metadata from a NASDAQ screener export, present only for stocks covered by that
   *  source — absent (not empty-string) when the source had no value for that field. */
  sector?: string
  industry?: string
  marketCap?: number
  country?: string
  ipoYear?: number
}

export interface Candle {
  time: number // unix seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y'

export type ChartStyleId = 'candles' | 'bars' | 'line' | 'area' | 'baseline'

export interface NewsItem {
  id: string
  source: string
  headline: string
  summary: string
  url: string
  publishedAt: number // unix seconds
  relatedSymbols: string[]
}

export interface OptionQuote {
  strike: number
  type: 'call' | 'put'
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
  impliedVol: number
  price: number
}

export interface PortfolioRiskStats {
  sharpe: number
  sortino: number
  volatilityAnnualized: number
  valueAtRisk95: number
  maxDrawdown: number
  beta: number
}

export type IndicatorId = 'ma20' | 'ma50' | 'boll' | 'rsi' | 'macd' | 'forecast'

export type ForecastMethodId = 'drift' | 'regression' | 'montecarlo'

export interface PortfolioPosition {
  symbol: string
  quantity: number
  costBasis: number // average price paid per unit
  addedAt: number // unix seconds
}

export interface Portfolio {
  id: string
  name: string
  positions: PortfolioPosition[]
  icon?: string
  color?: string
}

/** Everything the chart knows about whatever bar the cursor is currently over —
 *  drives the readout panel so hovering surfaces more than just OHLC. */
export interface ChartHoverInfo {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  prevClose: number | null
  ma20: number | null
  ma50: number | null
  bollUpper: number | null
  bollLower: number | null
}

export interface CompanyProfile {
  symbol: string
  name: string
  logo: string
  industry: string
  marketCapitalization: number // millions, per Finnhub convention
  shareOutstanding: number // millions, per Finnhub convention
  website: string
  ipo: string // ISO date string
  exchange: string
  currency: string
  country: string
}
