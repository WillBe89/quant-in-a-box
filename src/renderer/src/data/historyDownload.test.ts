import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// finnhubAdapter.ts reads the API key via apiKeyStore.ts, which itself falls back to
// `localStorage` (not present under vitest's node test environment) and then
// `import.meta.env.VITE_FINNHUB_API_KEY` (unset in this repo — see IMPORTANT CONSTRAINT in the
// Phase 8 brief: no real key exists in this environment). Mocking apiKeyStore directly is the
// simplest way to give fetchCandlesInRange/downloadHistoricalCandles a key to work with, without
// depending on either of those fallbacks.
vi.mock('./apiKeyStore', () => ({
  getFinnhubKey: () => 'test-finnhub-key',
  getTwelveDataKey: () => undefined,
  setFinnhubKey: vi.fn(),
  clearFinnhubKey: vi.fn(),
  setTwelveDataKey: vi.fn(),
  clearTwelveDataKey: vi.fn()
}))

import { fetchCandlesInRange, FinnhubCandleRangeError } from './finnhubAdapter'
import {
  ASSUMED_MAX_DAYS_PER_CANDLE_CALL,
  downloadHistoricalCandles,
  estimateCandleDownloadCalls
} from './historyDownload'

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

describe('estimateCandleDownloadCalls', () => {
  it('returns 1 for small ranges well under the assumed cap', () => {
    expect(estimateCandleDownloadCalls(1)).toBe(1)
    expect(estimateCandleDownloadCalls(5)).toBe(1)
  })

  it('returns 1 exactly at the assumed cap boundary', () => {
    const capYears = ASSUMED_MAX_DAYS_PER_CANDLE_CALL / 365
    expect(estimateCandleDownloadCalls(capYears)).toBe(1)
  })

  it('scales to 2 just beyond the assumed cap', () => {
    const capYears = ASSUMED_MAX_DAYS_PER_CANDLE_CALL / 365
    expect(estimateCandleDownloadCalls(capYears + 1)).toBe(2)
  })

  it('scales by simple ceiling division well beyond the cap', () => {
    const capYears = ASSUMED_MAX_DAYS_PER_CANDLE_CALL / 365
    expect(estimateCandleDownloadCalls(capYears * 2)).toBe(2)
    expect(estimateCandleDownloadCalls(capYears * 2 + 1)).toBe(3)
  })
})

describe('fetchCandlesInRange', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('maps a successful response into Candle[]', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        s: 'ok',
        t: [100, 200],
        o: [1, 2],
        h: [1.5, 2.5],
        l: [0.5, 1.5],
        c: [1.2, 2.2],
        v: [1000, 2000]
      })
    )
    const candles = await fetchCandlesInRange('AAPL', 'D', 0, 1000)
    expect(candles).toEqual([
      { time: 100, open: 1, high: 1.5, low: 0.5, close: 1.2, volume: 1000 },
      { time: 200, open: 2, high: 2.5, low: 1.5, close: 2.2, volume: 2000 }
    ])
  })

  it('throws FinnhubCandleRangeError with status 403 on a forbidden response', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 403))
    await expect(fetchCandlesInRange('AAPL', 'D', 0, 1000)).rejects.toMatchObject({
      status: 403
    })
    await expect(fetchCandlesInRange('AAPL', 'D', 0, 1000)).rejects.toBeInstanceOf(FinnhubCandleRangeError)
  })

  it('throws FinnhubCandleRangeError with status 429 on a rate-limited response', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 429))
    await expect(fetchCandlesInRange('AAPL', 'D', 0, 1000)).rejects.toMatchObject({
      status: 429
    })
  })

  it('throws FinnhubCandleRangeError on any other non-2xx status', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 500))
    await expect(fetchCandlesInRange('AAPL', 'D', 0, 1000)).rejects.toMatchObject({
      status: 500
    })
  })

  it('throws (never returns []) on Finnhub\'s documented no-data sentinel', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ s: 'no_data' }, 200))
    await expect(fetchCandlesInRange('AAPL', 'D', 0, 1000)).rejects.toBeInstanceOf(FinnhubCandleRangeError)
  })
})

describe('downloadHistoricalCandles', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.stubGlobal('window', { api: { storeCandles: vi.fn().mockResolvedValue(undefined) } })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.unstubAllGlobals()
  })

  it('fetches once for a range within the assumed cap and stores under the 1Y timeframe bucket', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ s: 'ok', t: [1], o: [1], h: [1], l: [1], c: [1], v: [1] })
    )
    const result = await downloadHistoricalCandles({ symbol: 'AAPL', years: 5 })
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ symbol: 'AAPL', candleCount: 1, callsMade: 1 })
    expect(window.api!.storeCandles).toHaveBeenCalledWith('finnhub', 'AAPL', '1Y', [
      { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 }
    ])
  })

  it('splits into multiple sequential calls when years exceeds the assumed cap, merging results', async () => {
    const capYears = ASSUMED_MAX_DAYS_PER_CANDLE_CALL / 365
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ s: 'ok', t: [1], o: [1], h: [1], l: [1], c: [1], v: [1] }))
      .mockResolvedValueOnce(jsonResponse({ s: 'ok', t: [2], o: [2], h: [2], l: [2], c: [2], v: [2] }))
    global.fetch = fetchMock
    const result = await downloadHistoricalCandles({ symbol: 'MSFT', years: capYears + 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.callsMade).toBe(2)
    expect(result.candleCount).toBe(2)
    expect(window.api!.storeCandles).toHaveBeenCalledWith('finnhub', 'MSFT', '1Y', [
      { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 },
      { time: 2, open: 2, high: 2, low: 2, close: 2, volume: 2 }
    ])
  })

  it('rejects and never stores anything when the underlying fetch fails (fail loudly, no partial write)', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 403))
    await expect(downloadHistoricalCandles({ symbol: 'AAPL', years: 5 })).rejects.toBeInstanceOf(
      FinnhubCandleRangeError
    )
    expect(window.api!.storeCandles).not.toHaveBeenCalled()
  })
})
