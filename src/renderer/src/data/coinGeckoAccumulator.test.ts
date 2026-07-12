import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Asset } from '@renderer/types/market'

// coinGeckoAccumulator.ts checks for a configured key via apiKeyStore.getCoinGeckoKey, and
// coinGeckoAdapter.ts's buildOhlcUrl accepts the resolved key as a plain parameter — mocking the
// module directly is the simplest way to control both without depending on `localStorage` or
// `import.meta.env.VITE_COINGECKO_API_KEY` (unset in this repo — same established workaround as
// dailyQuoteAccumulator.test.ts uses for Finnhub).
const getCoinGeckoKeyMock = vi.fn(() => 'test-coingecko-key' as string | undefined)
vi.mock('./apiKeyStore', () => ({
  getCoinGeckoKey: () => getCoinGeckoKeyMock()
}))

import type { CoinGeckoOhlcEntry } from './coinGeckoAdapter'
import {
  dailyCandleFromIntradayBars,
  runCoinGeckoAccumulation,
  symbolsNeedingPoll,
  type PollLog
} from './coinGeckoAccumulator'

/** vitest's configured environment is plain Node (see vitest.config.ts), which has no
 *  `localStorage` global — unlike a real renderer window. Same in-memory polyfill already used in
 *  dailyQuoteAccumulator.test.ts for the same reason. */
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

function asset(symbol: string, coingeckoId: string | undefined = symbol.toLowerCase()): Asset {
  return { symbol, name: symbol, klass: 'crypto', price: 0, changePct: 0, coingeckoId }
}

describe('symbolsNeedingPoll', () => {
  it('excludes a symbol already polled today', () => {
    const pollLog: PollLog = { BTC: '2026-07-11' }
    expect(symbolsNeedingPoll(['BTC'], pollLog, '2026-07-11')).toEqual([])
  })

  it('includes a symbol last polled yesterday', () => {
    const pollLog: PollLog = { BTC: '2026-07-10' }
    expect(symbolsNeedingPoll(['BTC'], pollLog, '2026-07-11')).toEqual(['BTC'])
  })

  it('includes a symbol with no poll-log entry at all', () => {
    expect(symbolsNeedingPoll(['BTC'], {}, '2026-07-11')).toEqual(['BTC'])
  })

  it('treats the day boundary as exact string equality, not Date parsing', () => {
    // Same entry, same day string -> excluded.
    expect(symbolsNeedingPoll(['BTC'], { BTC: '2026-07-11' }, '2026-07-11')).toEqual([])
    // A differently-formatted but calendar-equivalent string must NOT be treated as a match —
    // this function never parses through `Date`, only plain string comparison.
    expect(symbolsNeedingPoll(['BTC'], { BTC: '2026-7-11' }, '2026-07-11')).toEqual(['BTC'])
  })

  it('filters a mixed batch, preserving relative order of the symbols still pending', () => {
    const pollLog: PollLog = { BTC: '2026-07-11', ETH: '2026-07-10' }
    expect(symbolsNeedingPoll(['BTC', 'ETH', 'SOL'], pollLog, '2026-07-11')).toEqual(['ETH', 'SOL'])
  })
})

describe('dailyCandleFromIntradayBars', () => {
  it('derives open/high/low/close correctly from a single bar', () => {
    const entries: CoinGeckoOhlcEntry[] = [[1752192000000, 64000, 64500, 63500, 64230]]
    expect(dailyCandleFromIntradayBars(entries)).toEqual({
      time: 1752192000,
      open: 64000,
      high: 64500,
      low: 63500,
      close: 64230,
      volume: 0
    })
  })

  it('aggregates multiple bars: open from the first bar, close from the last, high/low as the true extremes across all bars', () => {
    // Deliberately non-trivial: the highest high and lowest low each come from a *middle* bar,
    // not the first or last — a fixture where every bar shared the same values wouldn't actually
    // prove the max/min logic is correct.
    const entries: CoinGeckoOhlcEntry[] = [
      [1000000, 100, 105, 98, 102],
      [1001800, 102, 110, 101, 108], // highest high (110) lives here
      [1003600, 108, 109, 95, 103], // lowest low (95) lives here
      [1005400, 103, 106, 100, 99] // last bar -> close
    ]
    expect(dailyCandleFromIntradayBars(entries)).toEqual({
      time: 1000,
      open: 100,
      high: 110,
      low: 95,
      close: 99,
      volume: 0
    })
  })

  it('throws on an empty array rather than returning a nonsensical candle', () => {
    expect(() => dailyCandleFromIntradayBars([])).toThrow()
  })
})

describe('runCoinGeckoAccumulation', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    ;(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage()
    vi.stubGlobal('window', { api: { storeCandles: vi.fn().mockResolvedValue(undefined) } })
    getCoinGeckoKeyMock.mockReset().mockReturnValue('test-coingecko-key')
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('no-ops with zero network calls when no CoinGecko key is configured', async () => {
    getCoinGeckoKeyMock.mockReturnValue(undefined)
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    await runCoinGeckoAccumulation([asset('BTC')])

    expect(fetchMock).not.toHaveBeenCalled()
    expect(window.api!.storeCandles).not.toHaveBeenCalled()
  })

  it("skips a symbol whose fetch fails without aborting the rest of the batch", async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network hiccup')) // BTC
      .mockResolvedValueOnce(jsonResponse([[1000000, 100, 110, 95, 105]])) // ETH, single bar
      .mockResolvedValueOnce(
        jsonResponse([
          [2000000, 50, 60, 40, 55],
          [2060000, 55, 58, 42, 53]
        ])
      ) // SOL, multi bar
    global.fetch = fetchMock as unknown as typeof fetch

    const runPromise = runCoinGeckoAccumulation([asset('BTC'), asset('ETH'), asset('SOL')])
    await vi.runAllTimersAsync()
    await runPromise

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(window.api!.storeCandles).toHaveBeenCalledTimes(2)
    expect(window.api!.storeCandles).toHaveBeenCalledWith('coingecko', 'ETH', '1Y', [
      { time: 1000, open: 100, high: 110, low: 95, close: 105, volume: 0 }
    ])
    expect(window.api!.storeCandles).toHaveBeenCalledWith('coingecko', 'SOL', '1Y', [
      { time: 2000, open: 50, high: 60, low: 40, close: 53, volume: 0 }
    ])
    // The failed symbol must not be marked as polled — so it's retried next pass.
    const storedLog = JSON.parse(localStorage.getItem('qiab:coinGeckoPollLog:v1') ?? '{}')
    expect(storedLog.BTC).toBeUndefined()
    expect(storedLog.ETH).toBeDefined()
    expect(storedLog.SOL).toBeDefined()
  })

  it('skips a symbol already polled today per the persisted poll-log, without fetching it', async () => {
    vi.useFakeTimers()
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('qiab:coinGeckoPollLog:v1', JSON.stringify({ BTC: today }))
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([[3000000, 10, 12, 9, 11]]))
    global.fetch = fetchMock as unknown as typeof fetch

    const runPromise = runCoinGeckoAccumulation([asset('BTC'), asset('ETH')])
    await vi.runAllTimersAsync()
    await runPromise

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/coins/eth/ohlc'))
    expect(window.api!.storeCandles).toHaveBeenCalledTimes(1)
    expect(window.api!.storeCandles).toHaveBeenCalledWith('coingecko', 'ETH', '1Y', expect.any(Array))
  })

  it('skips an asset with no coingeckoId at all, without crashing or making a network call for it', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([[4000000, 20, 22, 19, 21]]))
    global.fetch = fetchMock as unknown as typeof fetch

    // Built directly (not via the `asset()` helper) so `coingeckoId` is genuinely absent — a
    // default parameter still kicks in for an explicitly-passed `undefined`, which would defeat
    // the point of this fixture.
    const noIdAsset: Asset = { symbol: 'XRP', name: 'XRP', klass: 'crypto', price: 0, changePct: 0 }
    const runPromise = runCoinGeckoAccumulation([noIdAsset, asset('ETH')])
    await vi.runAllTimersAsync()
    await runPromise

    // Only ETH (which has a coingeckoId) triggers a fetch; XRP is skipped entirely.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/coins/eth/ohlc'))
    expect(window.api!.storeCandles).toHaveBeenCalledTimes(1)
    const storedLog = JSON.parse(localStorage.getItem('qiab:coinGeckoPollLog:v1') ?? '{}')
    expect(storedLog.XRP).toBeUndefined()
  })
})
