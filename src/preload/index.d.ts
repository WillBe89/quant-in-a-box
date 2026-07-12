import { ElectronAPI } from '@electron-toolkit/preload'
import type { PortfolioInsightsRequest, PortfolioInsightsResult } from '../main/aiInsights'
import type { Candle, CompanyProfile, NewsItem, UserAssetRecord } from '../main/localDb'
import type { PortfolioReportInput, SaveWorkbookResult } from '../main/exportData'
import type { CertificateRequest, CertificateSaveResult } from '../main/certificate'
import type { ImportUserAssetsResult } from '../main/userAssetImport'

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
  getStoredCandlesBefore: (
    source: string,
    symbol: string,
    timeframe: string,
    beforeTimeUnix: number,
    limit: number
  ) => Promise<Candle[]>
  getCachedNews: (symbolsKey: string, maxAgeMs: number) => Promise<NewsItem[] | null>
  storeNews: (symbolsKey: string, items: NewsItem[]) => Promise<void>
  getCachedProfile: (symbol: string, maxAgeMs: number) => Promise<CompanyProfile | null>
  storeProfile: (symbol: string, source: string, profile: CompanyProfile) => Promise<void>
  exportPortfolioReport: (input: PortfolioReportInput) => Promise<SaveWorkbookResult>
  exportMarketArchive: (symbol?: string) => Promise<SaveWorkbookResult>
  downloadCertificate: (request: CertificateRequest) => Promise<CertificateSaveResult>
  importUserAssetsFile: () => Promise<ImportUserAssetsResult>
  getUserAssets: () => Promise<UserAssetRecord[]>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: QiabApi
  }
}
