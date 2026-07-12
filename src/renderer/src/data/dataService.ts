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
import {
  ASSETS_BY_CLASS,
  ALL_ASSETS,
  generateCandles,
  generateOptionChain,
  generateNews,
  generateCompanyProfile
} from './mockData'
import * as finnhub from './finnhubAdapter'
import * as twelveData from './twelveDataAdapter'
import * as coinGecko from './coinGeckoAdapter'
import { getFinnhubKey, getTwelveDataKey } from './apiKeyStore'
import { mergeNewsFeeds } from '@renderer/lib/newsMerge'

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
const PROFILE_TTL_MS = 24 * 60 * 60 * 1000

/** Same symbols→cache-key rule the news methods below already use to pick between
 *  company-news and general-news: one symbol keys on that symbol, anything else is general. */
function newsSymbolsKey(symbols?: string[]): string {
  return isSingleSymbolNews(symbols) ? symbols![0] : 'general'
}

/** True only when `symbols` is exactly one ticker — the one case where "news relevant to this
 *  view" has an unambiguous single subject (the selected asset) and therefore no category
 *  dimension to filter by. Exported so the UI can hide the category chip row in that case
 *  (see NewsCard.tsx) using the exact same rule the data layer uses to pick company-news over
 *  general-news. */
export function isSingleSymbolNews(symbols?: string[]): boolean {
  return Boolean(symbols && symbols.length === 1)
}

export interface DataService {
  listAssets(klass: AssetClass | 'all'): Promise<Asset[]>
  getCandles(asset: Asset, timeframe: Timeframe): Promise<Candle[]>
  getOptionChain(asset: Asset): Promise<OptionQuote[]>
  /** `symbols`: the set of tickers news should be relevant to (e.g. the selected
   *  symbol, the watchlist, or portfolio holdings) — omit for general market news.
   *  `categories`: which general-news categories to include — ignored when `symbols`
   *  is a single ticker (see `isSingleSymbolNews`), since company news has no category axis. */
  getNews(symbols?: string[], categories?: NewsCategory[]): Promise<NewsItem[]>
  getCompanyProfile(asset: Asset): Promise<CompanyProfile | null>
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
  async getNews(symbols?: string[], categories?: NewsCategory[]): Promise<NewsItem[]> {
    return generateNews(symbols, categories)
  }
  async getCompanyProfile(asset: Asset): Promise<CompanyProfile | null> {
    return generateCompanyProfile(asset)
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

  async getNews(symbols?: string[], categories?: NewsCategory[]): Promise<NewsItem[]> {
    // Finnhub's company-news endpoint takes one symbol at a time; for a single relevant
    // symbol (the common case — viewing one asset) fetch its news directly, with no category
    // dimension involved. For a broader set (watchlist/portfolio/general) each active category
    // is fetched independently below so one category failing never blanks the others.
    if (isSingleSymbolNews(symbols)) {
      const symbolsKey = newsSymbolsKey(symbols)
      const cached = await window.api?.getCachedNews(symbolsKey, NEWS_TTL_MS).catch(() => null)
      if (cached && cached.length) return cached
      try {
        const news = await finnhub.fetchCompanyNews(symbols![0])
        window.api?.storeNews(symbolsKey, news).catch(() => undefined)
        return news
      } catch {
        return this.mock.getNews(symbols, categories)
      }
    }

    const activeCategories: NewsCategory[] = categories && categories.length > 0 ? categories : ['general']
    const settled = await Promise.allSettled(
      activeCategories.map(async (category) => {
        // Per-category cache key so one category's fetch failing (and falling back to a
        // stale/missing cache entry) never affects another category's freshness.
        const cacheKey = `general:${category}`
        const cached = await window.api?.getCachedNews(cacheKey, NEWS_TTL_MS).catch(() => null)
        if (cached && cached.length) return cached
        const news = await finnhub.fetchGeneralNews(category)
        window.api?.storeNews(cacheKey, news).catch(() => undefined)
        return news
      })
    )
    const feeds = settled
      .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
      .map((r) => r.value)
    // Only fall back to mock data if every single category's fetch (and its cache) failed —
    // one failing category should never blank out the others.
    if (feeds.length === 0) return this.mock.getNews(symbols, categories)
    return mergeNewsFeeds(feeds)
  }

  async getCompanyProfile(asset: Asset): Promise<CompanyProfile | null> {
    if (asset.klass !== 'stocks') return null
    const cached = await window.api?.getCachedProfile(asset.symbol, PROFILE_TTL_MS).catch(() => null)
    if (cached) return cached
    try {
      const profile = await finnhub.fetchCompanyProfile(asset.symbol)
      if (profile) {
        window.api?.storeProfile(asset.symbol, 'finnhub', profile).catch(() => undefined)
        return profile
      }
      return this.mock.getCompanyProfile(asset)
    } catch {
      return this.mock.getCompanyProfile(asset)
    }
  }
}

/**
 * TwelveData's free tier covers real multi-year daily history for stocks, bonds, FX, AND crypto
 * (Phase 8.8 widened this from bonds/FX-only, once Finnhub's candle endpoint was confirmed
 * paid-tier-only across every asset class, and TwelveData's own free tier was confirmed to
 * genuinely include crypto — pair-notation symbols like "BTC/USD", handled transparently by
 * twelveDataAdapter.ts). It has no news/options endpoints on the free tier — it only ever supplies
 * candles, falling back to mock otherwise.
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
      const candles = await twelveData.fetchCandles(asset, timeframe)
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

  async getNews(symbols?: string[], categories?: NewsCategory[]): Promise<NewsItem[]> {
    return this.mock.getNews(symbols, categories)
  }

  async getCompanyProfile(asset: Asset): Promise<CompanyProfile | null> {
    // No live TwelveData profile endpoint in scope — matches how this class already
    // delegates getOptionChain/getNews to mock.
    return this.mock.getCompanyProfile(asset)
  }
}

/**
 * Phase 8.8 — CoinGecko-backed crypto candle source, used when no TwelveData key is configured
 * (TwelveData is preferred first for crypto too — see ReactiveDataService.pickLiveService below).
 * Works with or without a CoinGecko key (the public OHLC endpoint already returns real history
 * keyless; a key just raises the rate limit — see coinGeckoAdapter.ts). Has no news/options/quote
 * endpoint in scope here, matching TwelveDataService's own shape; an asset with no `coingeckoId`
 * can never be served by the adapter and falls straight to mock.
 */
class CoinGeckoDataService implements DataService {
  private mock = new MockDataService()

  async listAssets(klass: AssetClass | 'all'): Promise<Asset[]> {
    return this.mock.listAssets(klass)
  }

  async getCandles(asset: Asset, timeframe: Timeframe): Promise<Candle[]> {
    const cached = await window.api
      ?.getCachedCandles('coingecko', asset.symbol, timeframe, ttlForTimeframe(timeframe))
      .catch(() => null)
    if (cached && cached.length) return cached
    try {
      const candles = await coinGecko.fetchCandles(asset, timeframe)
      if (candles.length) {
        window.api?.storeCandles('coingecko', asset.symbol, timeframe, candles).catch(() => undefined)
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

  async getNews(symbols?: string[], categories?: NewsCategory[]): Promise<NewsItem[]> {
    return this.mock.getNews(symbols, categories)
  }

  async getCompanyProfile(asset: Asset): Promise<CompanyProfile | null> {
    return this.mock.getCompanyProfile(asset)
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
  private coinGeckoSvc = new CoinGeckoDataService()

  /**
   * Phase 8.8 widened this considerably. Finnhub's candle endpoint is confirmed paid-tier-only
   * across every asset class on the free tier (stocks, crypto, forex, and bonds alike) — so
   * preferring TwelveData first, whenever a key is configured, only ever helps and never
   * regresses anyone still Finnhub-only (this used to apply to bonds/fx only; now it's every
   * class TwelveData covers).
   *
   * Crypto gets its own fallback chain instead of ever touching Finnhub for candles: TwelveData
   * first (confirmed to genuinely cover crypto on its free tier, via pair-notation symbols
   * handled transparently by twelveDataAdapter.ts), then CoinGecko's public OHLC endpoint
   * (coinGeckoAdapter.ts — works with or without a CoinGecko key) when no TwelveData key is
   * configured. Finnhub is never used for crypto candles at all, since its candle endpoint would
   * just 403 there too.
   */
  private pickLiveService(asset: Asset): DataService | null {
    const hasFinnhub = Boolean(getFinnhubKey())
    const hasTwelveData = Boolean(getTwelveDataKey())

    if (asset.klass === 'crypto') {
      if (hasTwelveData) return this.twelveDataSvc
      return this.coinGeckoSvc
    }

    if (hasTwelveData) return this.twelveDataSvc
    if (hasFinnhub) return this.finnhubSvc
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

  async getNews(symbols?: string[], categories?: NewsCategory[]): Promise<NewsItem[]> {
    return Boolean(getFinnhubKey())
      ? this.finnhubSvc.getNews(symbols, categories)
      : this.mock.getNews(symbols, categories)
  }

  async getCompanyProfile(asset: Asset): Promise<CompanyProfile | null> {
    // Finnhub-only, mirroring how getNews above routes (Finnhub-if-key-else-mock, no
    // TwelveData involved).
    if (asset.klass !== 'stocks') return null
    return getFinnhubKey() ? this.finnhubSvc.getCompanyProfile(asset) : this.mock.getCompanyProfile(asset)
  }
}

export const dataService: DataService = new ReactiveDataService()
