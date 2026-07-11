import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { getPortfolioInsights, isClaudeCliAvailable, type PortfolioInsightsRequest } from './aiInsights'
import { loadAnthropicKeyIntoMemory, getAnthropicKey, saveAnthropicKey, clearAnthropicKey } from './secureSettings'
import {
  initDb,
  getCachedCandles,
  storeCandles,
  getCachedNews,
  storeNews,
  getCachedProfile,
  storeProfile,
  getStoredSymbolsSummary,
  getCandleHistoryForExport,
  getNewsForExport,
  getStoredCandlesBefore,
  type Candle,
  type CompanyProfile,
  type NewsItem
} from './localDb'
import {
  buildPortfolioReportWorkbook,
  buildMarketArchiveWorkbook,
  saveWorkbookViaDialog,
  sanitizeFileNamePart,
  type PortfolioReportInput,
  type MarketArchiveCandleRow
} from './exportData'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0A0E14',
    titleBarStyle: 'hiddenInset',
    // Same relative path in dev and packaged builds — resources/ is packaged
    // alongside out/ (see package.json's build.files), so this resolves either way.
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.quantinabox.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  loadAnthropicKeyIntoMemory()
  initDb()

  ipcMain.handle('ai:checkAvailability', async () => ({
    claudeCode: await isClaudeCliAvailable(),
    apiKey: Boolean(getAnthropicKey())
  }))

  ipcMain.handle('ai:getPortfolioInsights', async (_event, request: PortfolioInsightsRequest) =>
    getPortfolioInsights(request)
  )

  ipcMain.handle('settings:getAnthropicKeyStatus', async () => ({ configured: Boolean(getAnthropicKey()) }))

  ipcMain.handle('settings:setAnthropicKey', async (_event, key: string) => saveAnthropicKey(key))

  ipcMain.handle('settings:clearAnthropicKey', async () => {
    clearAnthropicKey()
  })

  ipcMain.handle(
    'data:getCachedCandles',
    async (_event, source: string, symbol: string, timeframe: string, maxAgeMs: number) =>
      getCachedCandles(source, symbol, timeframe, maxAgeMs)
  )

  ipcMain.handle(
    'data:storeCandles',
    async (_event, source: string, symbol: string, timeframe: string, candles: Candle[]) => {
      storeCandles(source, symbol, timeframe, candles)
    }
  )

  ipcMain.handle(
    'data:getStoredCandlesBefore',
    async (_event, source: string, symbol: string, timeframe: string, beforeTimeUnix: number, limit: number) =>
      getStoredCandlesBefore(source, symbol, timeframe, beforeTimeUnix, limit)
  )

  ipcMain.handle('data:getCachedNews', async (_event, symbolsKey: string, maxAgeMs: number) =>
    getCachedNews(symbolsKey, maxAgeMs)
  )

  ipcMain.handle('data:storeNews', async (_event, symbolsKey: string, items: NewsItem[]) => {
    storeNews(symbolsKey, items)
  })

  ipcMain.handle('data:getCachedProfile', async (_event, symbol: string, maxAgeMs: number) =>
    getCachedProfile(symbol, maxAgeMs)
  )

  ipcMain.handle('data:storeProfile', async (_event, symbol: string, source: string, profile: CompanyProfile) => {
    storeProfile(symbol, source, profile)
  })

  ipcMain.handle('data:exportPortfolioReport', async (_event, input: PortfolioReportInput) => {
    const buffer = buildPortfolioReportWorkbook(input)
    const defaultFileName = `${sanitizeFileNamePart(input.portfolioName)}-report.xlsx`
    return saveWorkbookViaDialog(buffer, defaultFileName)
  })

  ipcMain.handle('data:exportMarketArchive', async (_event, symbol?: string) => {
    const allSummaries = getStoredSymbolsSummary()
    const summaries = symbol ? allSummaries.filter((s) => s.symbol === symbol) : allSummaries

    // One fetch per (source, symbol, timeframe) triple — a symbol/source pair can be cached
    // under several timeframes at once (e.g. '1D' from a chart view, '1Y' from a portfolio risk
    // calc), so filtering by timeframe here keeps each row correctly labeled and un-duplicated.
    const candles: MarketArchiveCandleRow[] = summaries.flatMap((s) =>
      getCandleHistoryForExport(s.symbol, s.source, s.timeframe).map((c) => ({
        symbol: s.symbol,
        source: s.source,
        timeframe: s.timeframe,
        ...c
      }))
    )
    const news = getNewsForExport(symbol)

    const buffer = buildMarketArchiveWorkbook({ candles, news })
    const defaultFileName = `market-archive-${sanitizeFileNamePart(symbol ?? 'all')}.xlsx`
    return saveWorkbookViaDialog(buffer, defaultFileName)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
