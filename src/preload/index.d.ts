import { ElectronAPI } from '@electron-toolkit/preload'
import type { PortfolioInsightsRequest, PortfolioInsightsResult } from '../main/aiInsights'

export interface AiAvailability {
  claudeCode: boolean
  apiKey: boolean
}

export interface QiabApi {
  checkAiAvailability: () => Promise<AiAvailability>
  getPortfolioInsights: (request: PortfolioInsightsRequest) => Promise<PortfolioInsightsResult>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: QiabApi
  }
}
