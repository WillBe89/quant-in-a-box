import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { detectFormat, parseGrid, dedupeAgainstKnown, parseCsvText, fixStaleSheetRange } from './userAssetImport'

// Sample header + data rows shaped exactly like each of the 4 real exchange files, confirmed by
// fetching each one live while building this feature (see BUILD_LOG.md-style research notes for
// this phase) — not invented/guessed layouts. ASX and HKEX both carry 2 title/date lines before
// their real header row; JPX and SET don't.

const ASX_SAMPLE: string[][] = [
  ['ASX listed companies as at Sun Jul 12 15:30:05 AEST 2026'],
  [],
  ['Company name', 'ASX code', 'GICS industry group'],
  ['1414 DEGREES LIMITED', '14D', 'Capital Goods'],
  ['29METALS LIMITED', '29M', 'Materials'],
  ['360 CAPITAL MORTGAGE REIT', 'TCF', 'Not Applic']
]

const HKEX_SAMPLE: string[][] = [
  ['List of Securities'],
  ['Updated as at 13/07/2026'],
  [
    'Stock Code',
    'Name of Securities',
    'Category',
    'Sub-Category',
    'Board Lot',
    'ISIN',
    'Expiry Date',
    'Subject to Stamp Duty',
    'Shortsell Eligible',
    'CAS Eligible',
    'VCM Eligible',
    'Admitted to CCASS',
    'Debt Securities Board Lot (Nominal)',
    'Debt Securities Investor Type',
    'POS Eligible',
    'Spread Table',
    'Trading Currency',
    'RMB Counter'
  ],
  [
    '00001',
    'CKH HOLDINGS',
    'Equity',
    'Equity Securities (Main Board)',
    '500',
    'KYG217651051',
    '',
    'Y',
    'Y',
    'Y',
    'Y',
    'Y',
    '',
    '',
    'Y',
    '1',
    'HKD',
    ''
  ],
  [
    '28115',
    'BI-CLPG@EC2612A',
    'Derivative Warrants',
    '',
    '5,000',
    'HK0001296877',
    '23/12/2026',
    ' ',
    ' ',
    ' ',
    ' ',
    'Y',
    '',
    '',
    ' ',
    '6',
    'HKD',
    ''
  ]
]

const JPX_SAMPLE: string[][] = [
  [
    'Effective Date',
    'Local Code',
    'Name (English)',
    'Section/Products',
    '33 Sector(Code)',
    '33 Sector(name)',
    '17 Sector(Code)',
    '17 Sector(name)',
    'Size Code (New Index Series)',
    'Size (New Index Series)'
  ],
  ['20260630', '1301', 'KYOKUYO CO.,LTD.', 'Prime Market (Domestic)', '50', 'Fishery, Agriculture and Forestry', '1', 'FOODS', '6', 'TOPIX Small 1'],
  ['20260630', '1305', 'iFreeETF TOPIX (Yearly Dividend Type)', 'ETFs/ ETNs', '-', '-', '-', '-', '-', '-']
]

const SET_SAMPLE: string[][] = [
  ['Symbol', 'Company', 'Market', 'Industry', 'Sector'],
  ['PTT', 'PTT Public Company Limited', 'SET', 'Resources', 'Energy & Utilities'],
  ['CPALL', 'CP All Public Company Limited', 'SET', 'Services', 'Commerce']
]

describe('detectFormat', () => {
  it('detects ASX past its 2 leading title/date lines', () => {
    expect(detectFormat(ASX_SAMPLE)).toEqual({ format: 'ASX', headerRowIndex: 2 })
  })

  it('detects HKEX past its 2 leading title/date lines', () => {
    expect(detectFormat(HKEX_SAMPLE)).toEqual({ format: 'HKEX', headerRowIndex: 2 })
  })

  it('detects JPX with its header on row 0', () => {
    expect(detectFormat(JPX_SAMPLE)).toEqual({ format: 'JPX', headerRowIndex: 0 })
  })

  it('detects SET with its header on row 0', () => {
    expect(detectFormat(SET_SAMPLE)).toEqual({ format: 'SET', headerRowIndex: 0 })
  })

  it('returns null for a file matching none of the 4 known formats, rather than guessing', () => {
    const randomSpreadsheet = [
      ['Ticker', 'Full Name', 'Whatever'],
      ['XYZ', 'Some Company', 'thing']
    ]
    expect(detectFormat(randomSpreadsheet)).toBeNull()
  })

  it('returns null for an empty grid', () => {
    expect(detectFormat([])).toBeNull()
  })
})

describe('parseGrid — ASX', () => {
  it('parses rows into {symbol, name, sector, exchange, country} with the .AX suffix', () => {
    const result = parseGrid(ASX_SAMPLE)
    expect(result?.format).toBe('ASX')
    expect(result?.rows).toEqual([
      { symbol: '14D.AX', name: '1414 DEGREES LIMITED', sector: 'Capital Goods', exchange: 'ASX', country: 'Australia' },
      { symbol: '29M.AX', name: '29METALS LIMITED', sector: 'Materials', exchange: 'ASX', country: 'Australia' },
      // "Not Applic" is ASX's own no-data marker — comes through as an absent sector, not a
      // literal "Not Applic" string.
      { symbol: 'TCF.AX', name: '360 CAPITAL MORTGAGE REIT', sector: undefined, exchange: 'ASX', country: 'Australia' }
    ])
  })
})

describe('parseGrid — HKEX', () => {
  it('keeps only Equity-category rows, dropping warrants/CBBCs/etc., with the .HK suffix and no sector', () => {
    const result = parseGrid(HKEX_SAMPLE)
    expect(result?.format).toBe('HKEX')
    expect(result?.rows).toEqual([
      { symbol: '00001.HK', name: 'CKH HOLDINGS', sector: undefined, exchange: 'HKEX', country: 'Hong Kong' }
    ])
  })
})

describe('parseGrid — JPX', () => {
  it('keeps only rows on an actual Market segment, dropping ETFs/ETNs, with the .T suffix', () => {
    const result = parseGrid(JPX_SAMPLE)
    expect(result?.format).toBe('JPX')
    expect(result?.rows).toEqual([
      {
        symbol: '1301.T',
        name: 'KYOKUYO CO.,LTD.',
        sector: 'Fishery, Agriculture and Forestry',
        exchange: 'TSE',
        country: 'Japan'
      }
    ])
  })

  it('keeps an alphanumeric local code as-is (JPX codes aren’t always purely numeric)', () => {
    const grid = [JPX_SAMPLE[0], ['20260630', '285A', 'Kioxia Holdings Corporation', 'Prime Market (Domestic)', '5', 'Information & Communication', '9', 'ELECTRIC APPLIANCES & PRECISION INSTRUMENTS', '5', 'TOPIX Mid400']]
    const result = parseGrid(grid)
    expect(result?.rows[0].symbol).toBe('285A.T')
  })
})

describe('parseGrid — SET', () => {
  it('parses rows into {symbol, name, sector, exchange, country} with the .BK suffix', () => {
    const result = parseGrid(SET_SAMPLE)
    expect(result?.format).toBe('SET')
    expect(result?.rows).toEqual([
      { symbol: 'PTT.BK', name: 'PTT Public Company Limited', sector: 'Energy & Utilities', exchange: 'SET', country: 'Thailand' },
      { symbol: 'CPALL.BK', name: 'CP All Public Company Limited', sector: 'Commerce', exchange: 'SET', country: 'Thailand' }
    ])
  })

  it('falls back to Industry when Sector is blank', () => {
    const grid = [SET_SAMPLE[0], ['ABC', 'ABC Company', 'mai', 'Technology', '']]
    const result = parseGrid(grid)
    expect(result?.rows[0].sector).toBe('Technology')
  })
})

describe('parseGrid — unrecognized format', () => {
  it('returns null rather than crashing or guessing at a format', () => {
    expect(parseGrid([['a', 'b'], ['1', '2']])).toBeNull()
  })
})

describe('dedupeAgainstKnown', () => {
  const rows = parseGrid(ASX_SAMPLE)!.rows

  it('skips rows already present in the known-symbols set (bundled or previously imported)', () => {
    const known = new Set(['14D.AX'])
    const { toInsert, skippedCount } = dedupeAgainstKnown(rows, known)
    expect(skippedCount).toBe(1)
    expect(toInsert.map((r) => r.symbol)).toEqual(['29M.AX', 'TCF.AX'])
  })

  it('inserts everything when nothing is known yet', () => {
    const { toInsert, skippedCount } = dedupeAgainstKnown(rows, new Set())
    expect(skippedCount).toBe(0)
    expect(toInsert).toHaveLength(3)
  })

  it('is a safe no-op re-import: re-running against the same rows with them now "known" skips all of them', () => {
    const known = new Set(rows.map((r) => r.symbol))
    const { toInsert, skippedCount } = dedupeAgainstKnown(rows, known)
    expect(toInsert).toHaveLength(0)
    expect(skippedCount).toBe(3)
  })

  it('also de-dupes a repeated symbol within the same file/batch, not just against knownSymbols', () => {
    const withDuplicate = [...rows, rows[0]]
    const { toInsert, skippedCount } = dedupeAgainstKnown(withDuplicate, new Set())
    expect(toInsert).toHaveLength(3)
    expect(skippedCount).toBe(1)
  })
})

describe('parseCsvText', () => {
  it('splits a plain comma-separated line', () => {
    expect(parseCsvText('a,b,c')).toEqual([['a', 'b', 'c']])
  })

  it('handles quoted fields, including one with an embedded comma', () => {
    expect(parseCsvText('"1414 DEGREES LIMITED","14D","Capital Goods"')).toEqual([
      ['1414 DEGREES LIMITED', '14D', 'Capital Goods']
    ])
    expect(parseCsvText('"Smith, Jones & Co","SJC","Financials"')).toEqual([['Smith, Jones & Co', 'SJC', 'Financials']])
  })

  it('unescapes doubled quotes inside a quoted field', () => {
    expect(parseCsvText('"Say ""hi""","X","Y"')).toEqual([['Say "hi"', 'X', 'Y']])
  })

  it('splits on real CSV newlines into separate rows, including a genuinely blank line', () => {
    expect(parseCsvText('a,b\r\n\r\nc,d')).toEqual([['a', 'b'], [], ['c', 'd']])
  })
})

describe('fixStaleSheetRange', () => {
  it('recomputes the true range when the declared dimension understates the real data (the confirmed live HKEX bug)', () => {
    // Mirrors the real bug found fetching HKEX's own file: <dimension ref="A1:R8"/> even though
    // the sheet actually has data out to row 100.
    const ws: XLSX.WorkSheet = { '!ref': 'A1:R8' }
    ws['A1'] = { t: 's', v: 'header' }
    ws['A100'] = { t: 's', v: '00113' }
    ws['C100'] = { t: 's', v: 'a value' }
    fixStaleSheetRange(ws)
    const range = XLSX.utils.decode_range(ws['!ref']!)
    expect(range.e.r).toBe(99) // 0-indexed row 99 == spreadsheet row 100
    expect(range.e.c).toBeGreaterThanOrEqual(2) // at least out to column C
  })

  it('is a no-op when the declared range already covers all real data (JPX’s own file)', () => {
    const ws: XLSX.WorkSheet = { '!ref': 'A1:C3' }
    ws['A1'] = { t: 's', v: 'x' }
    ws['C3'] = { t: 's', v: 'y' }
    fixStaleSheetRange(ws)
    expect(ws['!ref']).toBe('A1:C3')
  })

  it('does nothing to an empty worksheet', () => {
    const ws: XLSX.WorkSheet = {}
    expect(() => fixStaleSheetRange(ws)).not.toThrow()
    expect(ws['!ref']).toBeUndefined()
  })
})
