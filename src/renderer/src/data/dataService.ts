import type { Asset, AssetClass, Candle, NewsItem, OptionQuote, Timeframe } from '@renderer/types/market'
import { ASSETS_BY_CLASS, ALL_ASSETS, generateCandles, generateOptionChain, generateNews } from './mockData'
import * as finnhub from './finnhubAdapter'
import * as twelveData from './twelveDataAdapter'
import { getFinnhubKey, getTwelveDataKey } from './apiKeyStore'

/** True once a real API key is present (checked live, not cached — a key added via
 *  Customize takes effect immediately without restarting the app). */
export function hasLiveData(): boolean {
  return Boolean(getFinnhubKey()) || Boolean(getTwelveDataKey())
}

/** How long a cached candle batch for this timeframe is considered fresh enough to skip a
 *  live re-fetch — shorter timeframes move faster so they get shorter TTLs. */
function ttlForTimeframe(timeframe: Timeframe): number {
  if (timeframe === '1D' || timeframe === '1W') return 5 * 60 * 1000
  if (timeframe === '1M' || timeframe === '3M') return 15 * 60 * 1000
  return 60 * 60 * 1000 // '1Y' | '5Y'
}

const NEWS_TTL_MS = 15 * 60 * 1000

/** Same symbols→cache-key rule the news methods below already use to pick between
 *  company-news and general-news: one symbol keys on that symbol, anything else is general. */
function newsSymbolsKey(symbols?: string[]): string {
  return symbols && symbols.length === 1 ? symbols[0] : 'general'
}

export interface DataService {
  listAssets(klass: AssetClass | 'all'): Promise<Asset[]>
  getCandles(asset: Asset, timeframe: Timeframe): Promise<Candle[]>
  getOptionChain(asset: Asset): Promise<OptionQuote[]>
  /** `symbols`: the set of tickers news should be relevant to (e.g. the selected
   *  symbol, the watchlist, or portfolio holdings) — omit for general market news. */
  getNews(symbols?: string[]): Promise<NewsItem[]>
}

class MockDataService implements DataService {
  async listAssets(klass: AssetClass | 'all'): Promise<Asset[]> {
    return klass === 'all' ? ALL_ASSETS : ASSETS_BY_CLASS[klass]
  }
  async getCandles(asset: Asset, timeframe: Timeframe): Promise<Candle[]> {
    return generateCandles(asset, timeframe)
  }
  async getOptionChain(asset: Asset): Promise<OptionQuote[]> {
    return generateOptionChain(asset)
  }
  async getNews(symbols?: string[]): Promise<NewsItem[]> {
    return generateNews(symbols)
  }
}

/**
 * Live service backed by Finnhub. Falls back to mock data per-call if a fetch fails
 * (rate limit, unsupported symbol, offline) so the UI never goes blank.
 */
class FinnhubDataService implements DataService {
  private mock = new MockDataService()

  async listAssets(klass: AssetClass | 'all'): Promise<Asset[]> {
    // Symbol universe stays curated locally; only prices/candles/news are live.
    return this.mock.listAssets(klass)
  }

  async getCandles(asset: Asset, timeframe: Timeframe): Promise<Candle[]> {
    // Optional chaining: window.api is only injected inside a real Electron renderer
    // (via the preload bridge) — treat its absence as a cache miss rather than throwing,
    // matching how every other window.api call in this codebase already guards itself.
    const cached = await window.api
      ?.getCachedCandles('finnhub', asset.symbol, timeframe, ttlForTimeframe(timeframe))
      .catch(() => null)
    if (cached && cached.length) return cached
    try {
      const candles = await finnhub.fetchCandles(asset.symbol, timeframe)
      if (candles.length) {
        window.api?.storeCandles('finnhub', asset.symbol, timeframe, candles).catch(() => undefined)
        return candles
      }
      return this.mock.getCandles(asset, timeframe)
    } catch {
      return this.mock.getCandles(asset, timeframe)
    }
  }

  async getOptionChain(asset: Asset): Promise<OptionQuote[]> {
    // Finnhub's free tier doesn't include live options chains; keep this modeled
    // from the underlying's current price/volatility until a options data source is added.
    return this.mock.getOptionChain(asset)
  }

  async getNews(symbols?: string[]): Promise<NewsItem[]> {
    const symbolsKey = newsSymbolsKey(symbols)
    const cached = await window.api?.getCachedNews(symbolsKey, NEWS_TTL_MS).catch(() => null)
    if (cached && cached.length) return cached
    try {
      // Finnhub's company-news endpoint takes one symbol at a time; for a single
      // relevant symbol (the common case — viewing one asset) fetch its news
      // directly. For a broader set (watchlist/portfolio) general market news is
      // used instead of firing one request per symbol — revisit if that's too coarse.
      const news =
        symbols && symbols.length === 1 ? await finnhub.fetchCompanyNews(symbols[0]) : await finnhub.fetchGeneralNews()
      window.api?.storeNews(symbolsKey, news).catch(() => undefined)
      return news
    } catch {
      return this.mock.getNews(symbols)
    }
  }
}

/**
 * TwelveData's free tier covers bonds/FX (Finnhub's is thin there) but has no news/options
 * endpoints on the free tier — it only ever supplies candles, falling back to mock otherwise.
 */
class TwelveDataService implements DataService {
  private mock = new MockDataService()

  async listAssets(klass: AssetClass | 'all'): Promise<Asset[]> {
    return this.mock.listAssets(klass)
  }

  async getCandles(asset: Asset, timeframe: Timeframe): Promise<Candle[]> {
    const cached = await window.api
      ?.getCachedCandles('twelvedata', asset.symbol, timeframe, ttlForTimeframe(timeframe))
      .catch(() => null)
    if (cached && cached.length) return cached
    try {
      const candles = await twelveData.fetchCandles(asset.symbol, timeframe)
      if (candles.length) {
        window.api?.storeCandles('twelvedata', asset.symbol, timeframe, candles).catch(() => undefined)
        return candles
      }
      return this.mock.getCandles(asset, timeframe)
    } catch {
      return this.mock.getCandles(asset, timeframe)
    }
  }

  async getOptionChain(asset: Asset): Promise<OptionQuote[]> {
    return this.mock.getOptionChain(asset)
  }

  async getNews(symbols?: string[]): Promise<NewsItem[]> {
    return this.mock.getNews(symbols)
  }
}

/**
 * Delegates to whichever live service (if any) currently has a configured key, re-checked
 * on every call — so saving/clearing a key in Customize takes effect immediately, with no
 * app restart and no change needed at any `dataService.getCandles(...)`-style call site.
 */
class ReactiveDataService implements DataService {
  private mock = new MockDataService()
  private finnhubSvc = new FinnhubDataService()
  private twelveDataSvc = new TwelveDataService()

  /** Bonds/FX lean on TwelveData first (Finnhub's free-tier coverage is thin there per
   *  .env.example's original framing); everything else prefers Finnhub. */
  private pickLiveService(asset: Asset): DataService | null {
    const hasFinnhub = Boolean(getFinnhubKey())
    const hasTwelveData = Boolean(getTwelveDataKey())
    if ((asset.klass === 'bonds' || asset.klass === 'fx') && hasTwelveData) return this.twelveDataSvc
    if (hasFinnhub) return this.finnhubSvc
    if (hasTwelveData) return this.twelveDataSvc
    return null
  }

  async listAssets(klass: AssetClass | 'all'): Promise<Asset[]> {
    return this.mock.listAssets(klass)
  }

  async getCandles(asset: Asset, timeframe: Timeframe): Promise<Candle[]> {
    const svc = this.pickLiveService(asset)
    return svc ? svc.getCandles(asset, timeframe) : this.mock.getCandles(asset, timeframe)
  }

  async getOptionChain(asset: Asset): Promise<OptionQuote[]> {
    const svc = this.pickLiveService(asset)
    return svc ? svc.getOptionChain(asset) : this.mock.getOptionChain(asset)
  }

  async getNews(symbols?: string[]): Promise<NewsItem[]> {
    return Boolean(getFinnhubKey()) ? this.finnhubSvc.getNews(symbols) : this.mock.getNews(symbols)
  }
}

export const dataService: DataService = new ReactiveDataService()
