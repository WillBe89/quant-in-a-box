import { describe, expect, it } from 'vitest'
import { MODEL_PORTFOLIOS, type ModelPortfolioPreset } from './modelPortfolios'
import { ALL_ASSETS } from './mockData'
import type { AssetClass } from '@renderer/types/market'

/** Sums the weight of a preset's holdings that resolve to a given asset class. Unresolvable
 *  symbols contribute 0 (the "every symbol resolves" test below catches that separately). */
function classWeight(preset: ModelPortfolioPreset, klass: AssetClass): number {
  return preset.holdings.reduce((sum, h) => {
    const asset = ALL_ASSETS.find((a) => a.symbol === h.symbol)
    return asset && asset.klass === klass ? sum + h.weight : sum
  }, 0)
}

function byId(id: string): ModelPortfolioPreset {
  const preset = MODEL_PORTFOLIOS.find((p) => p.id === id)
  if (!preset) throw new Error(`missing preset ${id}`)
  return preset
}

describe('MODEL_PORTFOLIOS', () => {
  it('has exactly one preset per id: conservative, balanced, growth', () => {
    expect(MODEL_PORTFOLIOS.map((p) => p.id).sort()).toEqual(['balanced', 'conservative', 'growth'])
  })

  it.each(MODEL_PORTFOLIOS.map((p) => p.id))('%s holdings weights sum to ~1.0', (id) => {
    const preset = byId(id)
    const total = preset.holdings.reduce((sum, h) => sum + h.weight, 0)
    expect(Math.abs(total - 1)).toBeLessThan(0.01)
  })

  it('every symbol referenced in every preset resolves in ALL_ASSETS', () => {
    for (const preset of MODEL_PORTFOLIOS) {
      for (const holding of preset.holdings) {
        const resolved = ALL_ASSETS.some((a) => a.symbol === holding.symbol)
        expect(resolved, `${preset.id}: symbol ${holding.symbol} should resolve in ALL_ASSETS`).toBe(true)
      }
    }
  })

  it('conservative has more bond-class weight than growth (regression guard on relative risk)', () => {
    const conservative = byId('conservative')
    const growth = byId('growth')
    expect(classWeight(conservative, 'bonds')).toBeGreaterThan(classWeight(growth, 'bonds'))
  })

  it('growth has more (stocks+crypto)-class weight than conservative (regression guard on relative risk)', () => {
    const conservative = byId('conservative')
    const growth = byId('growth')
    const riskWeight = (preset: ModelPortfolioPreset): number =>
      classWeight(preset, 'stocks') + classWeight(preset, 'crypto')
    expect(riskWeight(growth)).toBeGreaterThan(riskWeight(conservative))
  })
})
