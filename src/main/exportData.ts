import { dialog } from 'electron'
import { writeFileSync } from 'fs'
import * as XLSX from 'xlsx'
import type { NewsItem } from './localDb'

/**
 * Excel export builders for the local data export feature. The renderer (portfolio report) and
 * main/index.ts (market archive) have already resolved every number these sheets need — these
 * functions only lay already-computed, plain data into worksheets; they never recompute anything
 * themselves.
 */

export interface PortfolioReportHoldingRow {
  symbol: string
  name: string
  quantity: number
  costBasis: number
  currentPrice: number
  marketValue: number
  pnl: number
  pnlPct: number
  weightPct: number
}

export interface PortfolioReportStats {
  sharpe: number
  sortino: number
  volatilityAnnualized: number
  valueAtRisk95: number
  maxDrawdown: number
  beta: number
}

export interface PortfolioReportClassRow {
  label: string
  marketValue: number
  pct: number
}

export interface PortfolioReportInput {
  portfolioName: string
  rows: PortfolioReportHoldingRow[]
  stats: PortfolioReportStats
  classBreakdown: PortfolioReportClassRow[]
}

/** A single candle row already tagged with which (symbol, source, timeframe) it came from —
 *  see the one-line comment on buildMarketArchiveWorkbook for why every row carries these,
 *  regardless of whether the export scope was one symbol or "everything stored". */
export interface MarketArchiveCandleRow {
  symbol: string
  source: string
  timeframe: string
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface MarketArchiveInput {
  candles: MarketArchiveCandleRow[]
  news: NewsItem[]
}

export interface SaveWorkbookResult {
  ok: boolean
  path?: string
  canceled?: boolean
  error?: string
}

/** Builds the 3-sheet portfolio report workbook (Holdings / Risk Stats / Class Breakdown) from
 *  data the renderer has already resolved — pure data-shaping, no recomputation. */
export function buildPortfolioReportWorkbook(input: PortfolioReportInput): Buffer {
  const workbook = XLSX.utils.book_new()

  const holdingsSheet = XLSX.utils.json_to_sheet(
    input.rows.map((r) => ({
      Symbol: r.symbol,
      Name: r.name,
      Quantity: r.quantity,
      'Cost Basis': r.costBasis,
      'Current Price': r.currentPrice,
      'Market Value': r.marketValue,
      'P&L $': r.pnl,
      'P&L %': r.pnlPct,
      'Weight %': r.weightPct
    }))
  )
  XLSX.utils.book_append_sheet(workbook, holdingsSheet, 'Holdings')

  const riskSheet = XLSX.utils.aoa_to_sheet([
    ['Statistic', 'Value'],
    ['Sharpe Ratio', input.stats.sharpe],
    ['Sortino Ratio', input.stats.sortino],
    ['Volatility (Annualized)', input.stats.volatilityAnnualized],
    ['Value at Risk (95%)', input.stats.valueAtRisk95],
    ['Max Drawdown', input.stats.maxDrawdown],
    ['Beta', input.stats.beta]
  ])
  XLSX.utils.book_append_sheet(workbook, riskSheet, 'Risk Stats')

  const classSheet = XLSX.utils.json_to_sheet(
    input.classBreakdown.map((c) => ({
      'Asset Class': c.label,
      'Market Value': c.marketValue,
      'Weight %': c.pct
    }))
  )
  XLSX.utils.book_append_sheet(workbook, classSheet, 'Class Breakdown')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/** Builds the 2-sheet market archive workbook (Candles / News). `getCandleHistoryForExport`
 *  returns bare Time/OHLCV with no symbol/source/timeframe of its own, so rather than branching
 *  on export scope (one symbol vs. "everything stored") into two different sheet shapes, the
 *  caller (main/index.ts) always tags each row with its (symbol, source, timeframe) first — one
 *  flat "Candles" sheet then works uniformly for both scopes. */
export function buildMarketArchiveWorkbook(input: MarketArchiveInput): Buffer {
  const workbook = XLSX.utils.book_new()

  const candlesSheet = XLSX.utils.json_to_sheet(
    input.candles.map((c) => ({
      Symbol: c.symbol,
      Source: c.source,
      Timeframe: c.timeframe,
      Time: new Date(c.time * 1000).toISOString(),
      Open: c.open,
      High: c.high,
      Low: c.low,
      Close: c.close,
      Volume: c.volume
    }))
  )
  XLSX.utils.book_append_sheet(workbook, candlesSheet, 'Candles')

  const newsSheet = XLSX.utils.json_to_sheet(
    input.news.map((n) => ({
      Headline: n.headline,
      Source: n.source,
      Summary: n.summary,
      URL: n.url,
      'Published At': new Date(n.publishedAt * 1000).toISOString(),
      'Related Symbols': n.relatedSymbols.join(', ')
    }))
  )
  XLSX.utils.book_append_sheet(workbook, newsSheet, 'News')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/** Strips everything except alphanumerics/dash/space/underscore, for turning user-controlled
 *  text (a portfolio name, a symbol) into a filesystem-safe default filename. */
export function sanitizeFileNamePart(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9\- _]/g, '').trim()
  return cleaned || 'export'
}

/** Shows a native save dialog defaulted to `defaultFileName` and, unless the user cancels,
 *  writes `buffer` to wherever they picked. The one legitimate error-boundary in this feature,
 *  since it's the one place that touches the filesystem and a native dialog. */
export async function saveWorkbookViaDialog(buffer: Buffer, defaultFileName: string): Promise<SaveWorkbookResult> {
  try {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultFileName,
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
    })
    if (result.canceled || !result.filePath) {
      return { ok: false, canceled: true }
    }
    writeFileSync(result.filePath, buffer)
    return { ok: true, path: result.filePath }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
