import type { Asset, AssetClass, Candle, NewsItem, OptionQuote, Timeframe } from '@renderer/types/market'
import { ASSETS_BY_CLASS, ALL_ASSETS, generateCandles, generateOptionChain, generateNews } from './mockData'
import * as finnhub from './finnhubAdapter'

/** True once a real API key is present — flips the app from mock data to live fetches. */
export const HAS_LIVE_DATA = Boolean(import.meta.env.VITE_FINNHUB_API_KEY)

export interface DataService {
  listAssets(klass: AssetClass | 'all'): Promise<Asset[]>
  getCandles(asset: Asset, timeframe: Timeframe): Promise<Candle[]>
  getOptionChain(asset: Asset): Promise<OptionQuote[]>
  getNews(symbol?: string): Promise<NewsItem[]>
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
  async getNews(): Promise<NewsItem[]> {
    return generateNews()
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
    try {
      const candles = await finnhub.fetchCandles(asset.symbol, timeframe)
      return candles.length ? candles : this.mock.getCandles(asset, timeframe)
    } catch {
      return this.mock.getCandles(asset, timeframe)
    }
  }

  async getOptionChain(asset: Asset): Promise<OptionQuote[]> {
    // Finnhub's free tier doesn't include live options chains; keep this modeled
    // from the underlying's current price/volatility until a options data source is added.
    return this.mock.getOptionChain(asset)
  }

  async getNews(symbol?: string): Promise<NewsItem[]> {
    try {
      return symbol ? await finnhub.fetchCompanyNews(symbol) : await finnhub.fetchGeneralNews()
    } catch {
      return this.mock.getNews()
    }
  }
}

export const dataService: DataService = HAS_LIVE_DATA ? new FinnhubDataService() : new MockDataService()
