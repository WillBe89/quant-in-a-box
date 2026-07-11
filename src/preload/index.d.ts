import { ElectronAPI } from '@electron-toolkit/preload'
import type { PortfolioInsightsRequest, PortfolioInsightsResult } from '../main/aiInsights'
import type { Candle, NewsItem } from '../main/localDb'

export interface AiAvailability {
  claudeCode: boolean
  apiKey: boolean
}

export interface AnthropicKeyStatus {
  configured: boolean
}

export interface SaveKeyResult {
  ok: boolean
  reason?: string
}

export interface QiabApi {
  checkAiAvailability: () => Promise<AiAvailability>
  getPortfolioInsights: (request: PortfolioInsightsRequest) => Promise<PortfolioInsightsResult>
  getAnthropicKeyStatus: () => Promise<AnthropicKeyStatus>
  setAnthropicKey: (key: string) => Promise<SaveKeyResult>
  clearAnthropicKey: () => Promise<void>
  getCachedCandles: (source: string, symbol: string, timeframe: string, maxAgeMs: number) => Promise<Candle[] | null>
  storeCandles: (source: string, symbol: string, timeframe: string, candles: Candle[]) => Promise<void>
  getCachedNews: (symbolsKey: string, maxAgeMs: number) => Promise<NewsItem[] | null>
  storeNews: (symbolsKey: string, items: NewsItem[]) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: QiabApi
  }
}
