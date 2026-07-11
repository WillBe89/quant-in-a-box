import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { PortfolioInsightsRequest } from '../main/aiInsights'
import type { Candle, CompanyProfile, NewsItem } from '../main/localDb'
import type { PortfolioReportInput, SaveWorkbookResult } from '../main/exportData'

const api = {
  checkAiAvailability: () => ipcRenderer.invoke('ai:checkAvailability'),
  getPortfolioInsights: (request: PortfolioInsightsRequest) => ipcRenderer.invoke('ai:getPortfolioInsights', request),
  getAnthropicKeyStatus: () => ipcRenderer.invoke('settings:getAnthropicKeyStatus'),
  setAnthropicKey: (key: string) => ipcRenderer.invoke('settings:setAnthropicKey', key),
  clearAnthropicKey: () => ipcRenderer.invoke('settings:clearAnthropicKey'),
  getCachedCandles: (source: string, symbol: string, timeframe: string, maxAgeMs: number) =>
    ipcRenderer.invoke('data:getCachedCandles', source, symbol, timeframe, maxAgeMs),
  storeCandles: (source: string, symbol: string, timeframe: string, candles: Candle[]) =>
    ipcRenderer.invoke('data:storeCandles', source, symbol, timeframe, candles),
  getCachedNews: (symbolsKey: string, maxAgeMs: number) =>
    ipcRenderer.invoke('data:getCachedNews', symbolsKey, maxAgeMs),
  storeNews: (symbolsKey: string, items: NewsItem[]) => ipcRenderer.invoke('data:storeNews', symbolsKey, items),
  getCachedProfile: (symbol: string, maxAgeMs: number) =>
    ipcRenderer.invoke('data:getCachedProfile', symbol, maxAgeMs),
  storeProfile: (symbol: string, source: string, profile: CompanyProfile) =>
    ipcRenderer.invoke('data:storeProfile', symbol, source, profile),
  exportPortfolioReport: (input: PortfolioReportInput): Promise<SaveWorkbookResult> =>
    ipcRenderer.invoke('data:exportPortfolioReport', input),
  exportMarketArchive: (symbol?: string): Promise<SaveWorkbookResult> =>
    ipcRenderer.invoke('data:exportMarketArchive', symbol)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
