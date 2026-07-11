import { ElectronAPI } from '@electron-toolkit/preload'
import type { PortfolioInsightsRequest, PortfolioInsightsResult } from '../main/aiInsights'

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
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: QiabApi
  }
}
