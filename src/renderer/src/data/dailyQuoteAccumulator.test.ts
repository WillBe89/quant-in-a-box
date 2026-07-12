import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Asset } from '@renderer/types/market'

// dailyQuoteAccumulator.ts checks for a configured key via apiKeyStore.getFinnhubKey, and
// finnhubAdapter.ts's fetchQuote does the same internally to build its `token=` query param —
// mocking the module directly is the simplest way to give both a key to work with, without
// depending on `localStorage` or `import.meta.env.VITE_FINNHUB_API_KEY` (unset in this repo — see
// historyDownload.test.ts for the same established workaround).
vi.mock('./apiKeyStore', () => ({
  getFinnhubKey: () => 'test-finnhub-key',
  getTwelveDataKey: () => undefined,
  setFinnhubKey: vi.fn(),
  clearFinnhubKey: vi.fn(),
  setTwelveDataKey: vi.fn(),
  clearTwelveDataKey: vi.fn()
}))

import type { FinnhubQuote } from './finnhubAdapter'
import { quoteToCandle, runDailyQuoteAccumulation, symbolsNeedingPoll, type PollLog } from './dailyQuoteAccumulator'

/** vitest's configured environment is plain Node (see vitest.config.ts), which has no
 *  `localStorage` global — unlike a real renderer window. Same in-memory polyfill already used in
 *  academyProgressStore.test.ts for the same reason. */
class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  clear(): void {
    this.store.clear()
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

function asset(symbol: string, klass: Asset['klass'] = 'stocks'): Asset {
  return { symbol, name: symbol, klass, price: 0, changePct: 0 }
}

describe('symbolsNeedingPoll', () => {
  it('excludes a symbol already polled today', () => {
    const pollLog: PollLog = { AAPL: '2026-07-11' }
    expect(symbolsNeedingPoll(['AAPL'], pollLog, '2026-07-11')).toEqual([])
  })

  it('includes a symbol last polled yesterday', () => {
    const pollLog: PollLog = { AAPL: '2026-07-10' }
    expect(symbolsNeedingPoll(['AAPL'], pollLog, '2026-07-11')).toEqual(['AAPL'])
  })

  it('includes a symbol with no poll-log entry at all', () => {
    expect(symbolsNeedingPoll(['AAPL'], {}, '2026-07-11')).toEqual(['AAPL'])
  })

  it('treats the day boundary as exact string equality, not Date parsing', () => {
    // Same entry, same day string -> excluded.
    expect(symbolsNeedingPoll(['AAPL'], { AAPL: '2026-07-11' }, '2026-07-11')).toEqual([])
    // A differently-formatted but calendar-equivalent string must NOT be treated as a match —
    // this function never parses through `Date`, only plain string comparison.
    expect(symbolsNeedingPoll(['AAPL'], { AAPL: '2026-7-11' }, '2026-07-11')).toEqual(['AAPL'])
  })

  it('filters a mixed batch, preserving relative order of the symbols still pending', () => {
    const pollLog: PollLog = { AAPL: '2026-07-11', MSFT: '2026-07-10' }
    expect(symbolsNeedingPoll(['AAPL', 'MSFT', 'NVDA'], pollLog, '2026-07-11')).toEqual(['MSFT', 'NVDA'])
  })
})

describe('quoteToCandle', () => {
  it('maps a Finnhub quote into a Candle, using the quote timestamp and volume 0', () => {
    const quote: FinnhubQuote = {
      price: 231.1,
      changePct: 0.44,
      open: 229.5,
      high: 232.0,
      low: 228.9,
      previousClose: 230.1,
      timestamp: 1752192000
    }
    expect(quoteToCandle(quote)).toEqual({
      time: 1752192000,
      open: 229.5,
      high: 232.0,
      low: 228.9,
      close: 231.1,
      volume: 0
    })
  })
})

describe('runDailyQuoteAccumulation', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    ;(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage()
    vi.stubGlobal('window', { api: { storeCandles: vi.fn().mockResolvedValue(undefined) } })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("skips a symbol whose fetch fails without aborting the rest of the batch", async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network hiccup')) // AAPL
      .mockResolvedValueOnce(jsonResponse({ c: 441.9, dp: -0.21, o: 440.0, h: 443.5, l: 438.2, pc: 442.8, t: 111 })) // MSFT
      .mockResolvedValueOnce(jsonResponse({ c: 142.87, dp: 2.36, o: 140.0, h: 144.0, l: 139.5, pc: 139.6, t: 222 })) // NVDA
    global.fetch = fetchMock as unknown as typeof fetch

    const runPromise = runDailyQuoteAccumulation([asset('AAPL'), asset('MSFT'), asset('NVDA')])
    await vi.runAllTimersAsync()
    await runPromise

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(window.api!.storeCandles).toHaveBeenCalledTimes(2)
    expect(window.api!.storeCandles).toHaveBeenCalledWith('finnhub', 'MSFT', '1Y', [
      { time: 111, open: 440.0, high: 443.5, low: 438.2, close: 441.9, volume: 0 }
    ])
    expect(window.api!.storeCandles).toHaveBeenCalledWith('finnhub', 'NVDA', '1Y', [
      { time: 222, open: 140.0, high: 144.0, low: 139.5, close: 142.87, volume: 0 }
    ])
    // The failed symbol must not be marked as polled — so it's retried next pass.
    const storedLog = JSON.parse(localStorage.getItem('qiab:dailyQuotePollLog:v1') ?? '{}')
    expect(storedLog.AAPL).toBeUndefined()
    expect(storedLog.MSFT).toBeDefined()
    expect(storedLog.NVDA).toBeDefined()
  })

  it('skips a symbol already polled today per the persisted poll-log, without fetching it', async () => {
    vi.useFakeTimers()
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('qiab:dailyQuotePollLog:v1', JSON.stringify({ AAPL: today }))
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ c: 441.9, dp: -0.21, o: 440.0, h: 443.5, l: 438.2, pc: 442.8, t: 333 }))
    global.fetch = fetchMock as unknown as typeof fetch

    const runPromise = runDailyQuoteAccumulation([asset('AAPL'), asset('MSFT')])
    await vi.runAllTimersAsync()
    await runPromise

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('symbol=MSFT'))
    expect(window.api!.storeCandles).toHaveBeenCalledTimes(1)
    expect(window.api!.storeCandles).toHaveBeenCalledWith('finnhub', 'MSFT', '1Y', expect.any(Array))
  })
})
