import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { PortfolioInsightsRequest } from '../main/aiInsights'

const api = {
  checkAiAvailability: () => ipcRenderer.invoke('ai:checkAvailability'),
  getPortfolioInsights: (request: PortfolioInsightsRequest) => ipcRenderer.invoke('ai:getPortfolioInsights', request)
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
