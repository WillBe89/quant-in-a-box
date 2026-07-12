import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Asset } from '@renderer/types/market'

// coinGeckoAdapter.ts checks for a configured key via apiKeyStore.getCoinGeckoKey — mocking the
// module directly is the simplest way to control that without depending on `localStorage` or
// `import.meta.env.VITE_COINGECKO_API_KEY` (unset in this repo — see dailyQuoteAccumulator.test.ts
// for the same established workaround).
const getCoinGeckoKeyMock = vi.fn(() => undefined as string | undefined)
vi.mock('./apiKeyStore', () => ({
  getCoinGeckoKey: () => getCoinGeckoKeyMock()
}))

import { buildOhlcUrl, mapOhlcEntries, fetchCandles, type CoinGeckoOhlcEntry } from './coinGeckoAdapter'

function asset(overrides: Partial<Asset> = {}): Asset {
  return { symbol: 'BTC', name: 'Bitcoin', klass: 'crypto', price: 0, changePct: 0, ...overrides }
}

describe('buildOhlcUrl', () => {
  it('builds a keyless URL with vs_currency=usd and the days value for the timeframe', () => {
    const url = buildOhlcUrl('bitcoin', '1D', undefined)
    expect(url).toBe('https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=1')
  })

  it('maps each Timeframe to its documented CoinGecko days value', () => {
    expect(buildOhlcUrl('bitcoin', '1W', undefined)).toContain('days=7')
    expect(buildOhlcUrl('bitcoin', '1M', undefined)).toContain('days=30')
    expect(buildOhlcUrl('bitcoin', '3M', undefined)).toContain('days=90')
    expect(buildOhlcUrl('bitcoin', '1Y', undefined)).toContain('days=365')
    expect(buildOhlcUrl('bitcoin', '5Y', undefined)).toContain('days=max')
  })

  it('appends x_cg_demo_api_key only when a key is provided', () => {
    const keyed = buildOhlcUrl('ethereum', '1D', 'test-cg-key')
    expect(keyed).toContain('x_cg_demo_api_key=test-cg-key')

    const keyless = buildOhlcUrl('ethereum', '1D', undefined)
    expect(keyless).not.toContain('x_cg_demo_api_key')
  })

  it('URL-encodes the coingeckoId', () => {
    const url = buildOhlcUrl('some coin/id', '1D', undefined)
    expect(url).toContain('/coins/some%20coin%2Fid/ohlc')
  })
})

describe('mapOhlcEntries', () => {
  it('maps a raw OHLC tuple to a Candle, converting ms to unix seconds and zeroing volume', () => {
    const entries: CoinGeckoOhlcEntry[] = [[1752192000000, 64000, 64500, 63500, 64230]]
    expect(mapOhlcEntries(entries)).toEqual([
      { time: 1752192000, open: 64000, high: 64500, low: 63500, close: 64230, volume: 0 }
    ])
  })

  it('maps multiple entries preserving order', () => {
    const entries: CoinGeckoOhlcEntry[] = [
      [1000000, 1, 2, 0.5, 1.5],
      [2000000, 1.5, 2.5, 1, 2]
    ]
    expect(mapOhlcEntries(entries)).toEqual([
      { time: 1000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 0 },
      { time: 2000, open: 1.5, high: 2.5, low: 1, close: 2, volume: 0 }
    ])
  })

  it('returns an empty array for an empty input', () => {
    expect(mapOhlcEntries([])).toEqual([])
  })
})

describe('fetchCandles', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    getCoinGeckoKeyMock.mockReset().mockReturnValue(undefined)
  })

  it('returns [] without calling fetch when the asset has no coingeckoId', async () => {
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    const result = await fetchCandles(asset({ coingeckoId: undefined }), '1D')
    expect(result).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('calls the keyless endpoint when no CoinGecko key is configured', async () => {
    getCoinGeckoKeyMock.mockReturnValue(undefined)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [[1752192000000, 64000, 64500, 63500, 64230]]
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await fetchCandles(asset({ coingeckoId: 'bitcoin' }), '1D')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('/coins/bitcoin/ohlc')
    expect(calledUrl).not.toContain('x_cg_demo_api_key')
    expect(result).toEqual([{ time: 1752192000, open: 64000, high: 64500, low: 63500, close: 64230, volume: 0 }])
  })

  it('calls the keyed endpoint when a CoinGecko key is configured', async () => {
    getCoinGeckoKeyMock.mockReturnValue('real-cg-key')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [[1752192000000, 64000, 64500, 63500, 64230]]
    })
    global.fetch = fetchMock as unknown as typeof fetch

    await fetchCandles(asset({ coingeckoId: 'bitcoin' }), '1D')

    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('x_cg_demo_api_key=real-cg-key')
  })

  it('throws on a non-2xx response rather than silently returning []', async () => {
    getCoinGeckoKeyMock.mockReturnValue(undefined)
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) })
    global.fetch = fetchMock as unknown as typeof fetch

    await expect(fetchCandles(asset({ coingeckoId: 'bitcoin' }), '1D')).rejects.toThrow('CoinGecko OHLC failed: 429')
  })
})
