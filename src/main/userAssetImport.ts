import { dialog } from 'electron'
import { readFileSync } from 'fs'
import { extname } from 'path'
import * as XLSX from 'xlsx'
import { getUserAssets, insertUserAssets, type UserAssetRecord } from './localDb'

/**
 * Compliant personal-use import of restricted-exchange listing files (Phase 15). ASX, HKEX, JPX
 * and SET Thailand all restrict reuse of their site content — including their own bulk listing
 * files — to personal, non-commercial use, and require prior written consent to redistribute.
 * This app never fetches, caches, ships, or bundles a copy of any of those files itself: the
 * Customize panel only links to each exchange's own official download URL (a plain link is not
 * redistribution), and this module is a pure local parser/importer for a file the USER has
 * already personally downloaded onto THEIR OWN machine, via dialog.showOpenDialog. Nothing here
 * ever performs a network request.
 */

export type ExchangeFormat = 'ASX' | 'HKEX' | 'JPX' | 'SET'

export interface ParsedListingRow {
  symbol: string
  name: string
  sector?: string
  exchange: string
  country: string
}

export interface ImportUserAssetsResult {
  addedCount: number
  skippedCount: number
  format: ExchangeFormat | null
  canceled?: boolean
  error?: string
}

// --- Snapshot of already-bundled exchange-suffixed symbols ---------------------------------
// main/ cannot import src/renderer/src/data/assetUniverse.ts — this project's main process
// mirrors renderer-side shapes locally rather than importing across the main/renderer boundary
// (see the header comment on localDb.ts and certificate.ts for the same rule elsewhere in this
// codebase); the main-process tsconfig/electron-vite build doesn't even include src/renderer at
// all, so a direct import would fail to resolve. This is therefore a frozen snapshot of every
// .AX/.HK/.T symbol already hand-curated into GENERATED_STOCK_ASSETS as of the international-
// listings phase that preceded this one, so a full ASX/HKEX/JPX import doesn't re-add a company
// that's already bundled. If that curated list changes, update this snapshot to match — but a
// stale snapshot here can only ever under-report skippedCount, never produce a visible duplicate:
// the renderer independently re-checks against its own live ALL_ASSETS at merge time as a second,
// authoritative safety net (see mergeUserAssets in src/renderer/src/data/mockData.ts).
const BUNDLED_EXCHANGE_SUFFIXED_SYMBOLS = new Set<string>([
  // .AX (50)
  'BHP.AX',
  'CBA.AX',
  'NEM.AX',
  'WBC.AX',
  'NAB.AX',
  'ANZ.AX',
  'WES.AX',
  'MQG.AX',
  'XYZ.AX',
  'GMG.AX',
  'RIO.AX',
  'CSL.AX',
  'FMG.AX',
  'WDS.AX',
  'TLS.AX',
  'WOW.AX',
  'TCL.AX',
  'RMD.AX',
  'QBE.AX',
  'ALL.AX',
  'SIG.AX',
  'COL.AX',
  'NST.AX',
  'BXB.AX',
  'STO.AX',
  'NWS.AX',
  'EVN.AX',
  'CPU.AX',
  'JHX.AX',
  'SCG.AX',
  'SUN.AX',
  'FPH.AX',
  'IAG.AX',
  'REA.AX',
  'SGH.AX',
  'ORG.AX',
  'S32.AX',
  'LYC.AX',
  'SOL.AX',
  'QAN.AX',
  'PLS.AX',
  'MPL.AX',
  'ALQ.AX',
  'LNW.AX',
  'APA.AX',
  'CAR.AX',
  'COH.AX',
  'JBH.AX',
  'SGP.AX',
  'XRO.AX',
  // .HK (50)
  '0005.HK',
  '0700.HK',
  '9988.HK',
  '0939.HK',
  '1299.HK',
  '1398.HK',
  '0941.HK',
  '0388.HK',
  '1810.HK',
  '3690.HK',
  '0981.HK',
  '3988.HK',
  '2318.HK',
  '9999.HK',
  '0883.HK',
  '1211.HK',
  '6160.HK',
  '2628.HK',
  '0669.HK',
  '0857.HK',
  '0001.HK',
  '3968.HK',
  '9888.HK',
  '2899.HK',
  '0016.HK',
  '9618.HK',
  '0992.HK',
  '2388.HK',
  '3750.HK',
  '2269.HK',
  '1801.HK',
  '1088.HK',
  '1024.HK',
  '0002.HK',
  '9992.HK',
  '0175.HK',
  '2020.HK',
  '1109.HK',
  '0823.HK',
  '0386.HK',
  '1113.HK',
  '9961.HK',
  '0006.HK',
  '9633.HK',
  '2359.HK',
  '0003.HK',
  '1378.HK',
  '0288.HK',
  '2057.HK',
  '2015.HK',
  // .T (50)
  '8035.T',
  '6857.T',
  '9983.T',
  '9984.T',
  '285A.T',
  '6762.T',
  '4062.T',
  '6098.T',
  '4063.T',
  '6954.T',
  '9433.T',
  '5803.T',
  '6971.T',
  '6367.T',
  '6981.T',
  '4519.T',
  '9766.T',
  '8015.T',
  '6920.T',
  '4543.T',
  '6758.T',
  '6988.T',
  '6976.T',
  '7735.T',
  '6146.T',
  '7203.T',
  '9735.T',
  '8058.T',
  '7741.T',
  '7832.T',
  '2802.T',
  '8766.T',
  '4578.T',
  '4901.T',
  '4503.T',
  '5802.T',
  '8001.T',
  '8031.T',
  '7267.T',
  '4507.T',
  '4568.T',
  '7269.T',
  '4021.T',
  '2801.T',
  '6902.T',
  '6861.T',
  '6273.T',
  '8830.T',
  '7453.T',
  '5108.T'
])

function normalizeCell(cell: unknown): string {
  return (cell ?? '').toString().trim()
}

/** True for a value that means "no data" in one of these exchanges' own exports — ASX's "Not
 *  Applic", JPX's "-", or a genuinely blank cell — so these get treated as an absent optional
 *  field rather than junk sector text. */
function isNoDataValue(v: string): boolean {
  const t = v.trim()
  return t === '' || t === '-' || t.toLowerCase() === 'not applic'
}

// Column-header signatures for each of the 4 known formats, confirmed by fetching each exchange's
// real live file (see BUILD_LOG.md-style research for this phase): the leading N header cells,
// lower-cased and trimmed, in the exact column order each exchange actually ships.
const FORMAT_SIGNATURES: Record<ExchangeFormat, string[]> = {
  ASX: ['company name', 'asx code', 'gics industry group'],
  HKEX: ['stock code', 'name of securities', 'category'],
  JPX: ['effective date', 'local code', 'name (english)', 'section/products'],
  SET: ['symbol', 'company', 'market', 'industry', 'sector']
}

/** Scans the first few rows of a parsed grid for one of the 4 known header signatures (ASX and
 *  HKEX both ship 2 title/date lines before their real header row, JPX and SET don't — so this
 *  can't just assume row 0). Returns null (not a guess) when nothing matches, so an unrecognized
 *  file is reported clearly rather than parsed as whatever format happens to look closest. */
export function detectFormat(grid: string[][]): { format: ExchangeFormat; headerRowIndex: number } | null {
  const scanLimit = Math.min(grid.length, 6)
  for (let i = 0; i < scanLimit; i++) {
    const row = grid[i]
    if (!row) continue
    for (const format of Object.keys(FORMAT_SIGNATURES) as ExchangeFormat[]) {
      const signature = FORMAT_SIGNATURES[format]
      const isMatch = signature.every((expected, col) => normalizeCell(row[col]).toLowerCase() === expected)
      if (isMatch) return { format, headerRowIndex: i }
    }
  }
  return null
}

function parseAsx(grid: string[][], headerRowIndex: number): ParsedListingRow[] {
  const rows: ParsedListingRow[] = []
  for (let i = headerRowIndex + 1; i < grid.length; i++) {
    const row = grid[i]
    if (!row) continue
    const name = normalizeCell(row[0])
    const code = normalizeCell(row[1])
    if (!name || !code) continue
    const sector = normalizeCell(row[2])
    rows.push({
      symbol: `${code}.AX`,
      name,
      sector: isNoDataValue(sector) ? undefined : sector,
      exchange: 'ASX',
      country: 'Australia'
    })
  }
  return rows
}

function parseHkex(grid: string[][], headerRowIndex: number): ParsedListingRow[] {
  const rows: ParsedListingRow[] = []
  for (let i = headerRowIndex + 1; i < grid.length; i++) {
    const row = grid[i]
    if (!row) continue
    const code = normalizeCell(row[0])
    const name = normalizeCell(row[1])
    const category = normalizeCell(row[2])
    // HKEX's bulk file lists every instrument type it trades (equity warrants, CBBCs, ETPs, debt
    // securities, REITs, ...) — 'Equity' is the category for ordinary listed companies, which is
    // what this importer and the rest of the app's asset universe deal in; everything else would
    // flood search results with expiring derivative instruments rather than real companies.
    if (!code || !name || category.toLowerCase() !== 'equity') continue
    rows.push({
      symbol: `${code}.HK`,
      name,
      exchange: 'HKEX',
      country: 'Hong Kong'
    })
  }
  return rows
}

function parseJpx(grid: string[][], headerRowIndex: number): ParsedListingRow[] {
  const rows: ParsedListingRow[] = []
  for (let i = headerRowIndex + 1; i < grid.length; i++) {
    const row = grid[i]
    if (!row) continue
    const code = normalizeCell(row[1])
    const name = normalizeCell(row[2])
    const section = normalizeCell(row[3])
    // Only rows on an actual "Market" segment (Prime/Standard/Growth/PRO Market, domestic or
    // foreign) are individual company stocks — JPX's file also lists ETFs/ETNs, REIT/fund
    // products, and "Equity Contribution Securities", none of which are single-company listings.
    if (!code || !name || !section.includes('Market')) continue
    const sector = normalizeCell(row[5])
    rows.push({
      symbol: `${code}.T`,
      name,
      sector: isNoDataValue(sector) ? undefined : sector,
      exchange: 'TSE',
      country: 'Japan'
    })
  }
  return rows
}

function parseSet(grid: string[][], headerRowIndex: number): ParsedListingRow[] {
  const rows: ParsedListingRow[] = []
  for (let i = headerRowIndex + 1; i < grid.length; i++) {
    const row = grid[i]
    if (!row) continue
    const symbol = normalizeCell(row[0])
    const company = normalizeCell(row[1])
    if (!symbol || !company) continue
    const industry = normalizeCell(row[3])
    const sector = normalizeCell(row[4])
    rows.push({
      symbol: `${symbol}.BK`,
      name: company,
      sector: !isNoDataValue(sector) ? sector : !isNoDataValue(industry) ? industry : undefined,
      exchange: 'SET',
      country: 'Thailand'
    })
  }
  return rows
}

/** Pure entry point: detect which of the 4 known formats a parsed grid matches and parse it into
 *  {symbol, name, sector, exchange, country} rows with the matching suffix applied. Returns null
 *  (not a best-effort guess) when the grid doesn't match any known format. */
export function parseGrid(grid: string[][]): { format: ExchangeFormat; rows: ParsedListingRow[] } | null {
  const detected = detectFormat(grid)
  if (!detected) return null
  const { format, headerRowIndex } = detected
  const rows =
    format === 'ASX'
      ? parseAsx(grid, headerRowIndex)
      : format === 'HKEX'
        ? parseHkex(grid, headerRowIndex)
        : format === 'JPX'
          ? parseJpx(grid, headerRowIndex)
          : parseSet(grid, headerRowIndex)
  return { format, rows }
}

/** Splits parsed rows into ones to actually insert vs. ones to skip as already-known — either
 *  already bundled (BUNDLED_EXCHANGE_SUFFIXED_SYMBOLS) or already imported by the user before
 *  (`knownSymbols` also includes the user's existing userAssets rows, passed in by the caller).
 *  Also guards against the same symbol appearing twice within one file, so re-running an import
 *  against the same file twice (or a file with an accidental duplicate row) is always a safe,
 *  silent no-op for repeats, never a duplicate insert or a crash. */
export function dedupeAgainstKnown(
  rows: ParsedListingRow[],
  knownSymbols: ReadonlySet<string>
): { toInsert: ParsedListingRow[]; skippedCount: number } {
  const toInsert: ParsedListingRow[] = []
  const seenThisBatch = new Set<string>()
  let skippedCount = 0
  for (const row of rows) {
    if (knownSymbols.has(row.symbol) || seenThisBatch.has(row.symbol)) {
      skippedCount++
      continue
    }
    seenThisBatch.add(row.symbol)
    toInsert.push(row)
  }
  return { toInsert, skippedCount }
}

/** Minimal RFC4180-ish CSV line splitter — handles quoted fields, including embedded commas and
 *  escaped "" quotes, which is all ASX's own export needs. Not a general-purpose CSV library:
 *  this project's one spreadsheet dependency is the "xlsx" package (used below for the .xls/.xlsx
 *  formats), and ASX is the only one of the 4 that ships plain CSV. */
export function parseCsvText(text: string): string[][] {
  const lines = text.split(/\r\n|\n|\r/)
  const rows: string[][] = []
  for (const line of lines) {
    if (line.length === 0) {
      rows.push([])
      continue
    }
    const cells: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = false
          }
        } else {
          current += ch
        }
      } else if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        cells.push(current)
        current = ''
      } else {
        current += ch
      }
    }
    cells.push(current)
    rows.push(cells)
  }
  return rows
}

/** Some real-world xlsx exports — confirmed live against HKEX's own ListOfSecurities.xlsx, which
 *  ships a <dimension> tag declaring only 8 rows while the sheet actually contains 17,000+ — carry
 *  a stale dimension tag that understates the sheet's true populated range. SheetJS trusts that
 *  tag for `!ref` (and therefore for sheet_to_json's iteration bounds), silently truncating the
 *  parse to a handful of rows even though the real data is present in the file. Recomputing the
 *  true range from actually-populated cell addresses before extracting rows avoids silently
 *  importing a tiny, wrong fraction of the real file. A no-op when the declared range already
 *  covers everything (e.g. JPX's own file, whose dimension tag is accurate).
 *  Exported for direct unit testing against a hand-built worksheet with the same stale-dimension
 *  shape as the real bug, without needing a multi-megabyte fixture file. */
export function fixStaleSheetRange(ws: XLSX.WorkSheet): void {
  let maxRow = 0
  let maxCol = 0
  for (const key of Object.keys(ws)) {
    if (key[0] === '!') continue
    const match = key.match(/^([A-Z]+)([0-9]+)$/)
    if (!match) continue
    const row = parseInt(match[2], 10)
    const col = XLSX.utils.decode_col(match[1])
    if (row > maxRow) maxRow = row
    if (col > maxCol) maxCol = col
  }
  if (maxRow === 0) return
  const declared = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null
  if (declared && declared.e.r + 1 >= maxRow) return // declared range already covers every real row
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow - 1, c: maxCol } })
}

/** Reads a user-picked file into a plain grid of strings, dispatching on extension: real CSV text
 *  for .csv (ASX), the "xlsx" package for .xls/.xlsx (HKEX/JPX/SET). Impure (touches the
 *  filesystem) — deliberately kept separate from the pure detect/parse functions above so those
 *  can be unit tested without a real file on disk. */
function readGridFromFile(filePath: string): string[][] {
  const ext = extname(filePath).toLowerCase()
  if (ext === '.csv') {
    const text = readFileSync(filePath, 'utf-8')
    return parseCsvText(text)
  }
  const workbook = XLSX.readFile(filePath)
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  fixStaleSheetRange(worksheet)
  return XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: false, blankrows: false, defval: '' })
}

/** Triggers the native "pick a file" dialog, parses whatever the user picked, skips rows that are
 *  already bundled or already imported, and stores the rest. Never fetches anything over the
 *  network — the file must already exist on the user's own machine (they downloaded it themselves
 *  from the exchange's own link in the Customize panel). */
export async function importUserAssetsFile(): Promise<ImportUserAssetsResult> {
  try {
    const dialogResult = await dialog.showOpenDialog({
      filters: [{ name: 'Exchange listing files', extensions: ['csv', 'xls', 'xlsx'] }],
      properties: ['openFile']
    })
    if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
      return { addedCount: 0, skippedCount: 0, format: null, canceled: true }
    }

    const grid = readGridFromFile(dialogResult.filePaths[0])
    const parsed = parseGrid(grid)
    if (!parsed) {
      return { addedCount: 0, skippedCount: 0, format: null, error: 'unrecognized-format' }
    }

    const alreadyImported = new Set(getUserAssets().map((a) => a.symbol))
    const knownSymbols = new Set<string>([...BUNDLED_EXCHANGE_SUFFIXED_SYMBOLS, ...alreadyImported])
    const { toInsert, skippedCount } = dedupeAgainstKnown(parsed.rows, knownSymbols)

    if (toInsert.length > 0) {
      const records: UserAssetRecord[] = toInsert.map((r) => ({
        symbol: r.symbol,
        name: r.name,
        klass: 'stocks',
        sector: r.sector,
        country: r.country,
        exchange: r.exchange
      }))
      insertUserAssets(records)
    }

    return { addedCount: toInsert.length, skippedCount, format: parsed.format }
  } catch (e) {
    return { addedCount: 0, skippedCount: 0, format: null, error: String(e) }
  }
}
