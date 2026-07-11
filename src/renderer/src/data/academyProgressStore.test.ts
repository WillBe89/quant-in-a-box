import { beforeEach, describe, expect, it } from 'vitest'
import { clearAcademyProgress, loadAcademyProgress, saveAcademyProgress } from './academyProgressStore'
import { createEmptyAttemptRecord, type AcademyProgressState } from '@renderer/lib/badgeEarning'

/** vitest's configured environment is plain Node (see vitest.config.ts), which has no
 *  `localStorage` global — unlike a real renderer window. This tiny in-memory polyfill mirrors
 *  the Web Storage API surface this module actually touches (getItem/setItem/removeItem), the
 *  same workaround already noted in data/historyDownload.test.ts for apiKeyStore's localStorage
 *  fallback. */
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

beforeEach(() => {
  ;(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage()
})

describe('loadAcademyProgress', () => {
  it('returns an empty object when nothing is stored', () => {
    expect(loadAcademyProgress()).toEqual({})
  })

  it('returns an empty object for corrupt JSON rather than throwing', () => {
    localStorage.setItem('qiab:academyProgress:v1', '{not valid json')
    expect(() => loadAcademyProgress()).not.toThrow()
    expect(loadAcademyProgress()).toEqual({})
  })

  it('round-trips a valid state through save then load', () => {
    const state: AcademyProgressState = {
      assetTypes: { ...createEmptyAttemptRecord(), attemptCount: 2, bestScorePct: 90, passed: true, lastAttemptAt: 123, lastAttemptScorePct: 90 },
      final: createEmptyAttemptRecord()
    }
    saveAcademyProgress(state)
    expect(loadAcademyProgress()).toEqual(state)
  })

  it('drops an unknown module id key rather than propagating it', () => {
    localStorage.setItem(
      'qiab:academyProgress:v1',
      JSON.stringify({ notARealModule: createEmptyAttemptRecord(), risk: createEmptyAttemptRecord() })
    )
    const loaded = loadAcademyProgress()
    expect(loaded).toEqual({ risk: createEmptyAttemptRecord() })
    expect((loaded as Record<string, unknown>).notARealModule).toBeUndefined()
  })

  it('drops a malformed record (wrong field types) rather than crashing', () => {
    localStorage.setItem(
      'qiab:academyProgress:v1',
      JSON.stringify({ trend: { attemptCount: 'not-a-number', passed: true } })
    )
    expect(loadAcademyProgress()).toEqual({})
  })

  it('returns an empty object when the stored value is a JSON array, not an object', () => {
    localStorage.setItem('qiab:academyProgress:v1', JSON.stringify([1, 2, 3]))
    const loaded = loadAcademyProgress()
    for (const id of ['assetTypes', 'trend', 'risk', 'options', 'final'] as const) {
      expect(loaded[id]).toBeUndefined()
    }
  })
})

describe('clearAcademyProgress', () => {
  it('removes any stored progress', () => {
    saveAcademyProgress({ options: createEmptyAttemptRecord() })
    clearAcademyProgress()
    expect(loadAcademyProgress()).toEqual({})
  })
})
