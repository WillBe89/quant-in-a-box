import { describe, expect, it } from 'vitest'
import { paginate } from './pagination'

describe('paginate', () => {
  it('slices the requested page at the given page size', () => {
    const items = Array.from({ length: 250 }, (_, i) => i)
    expect(paginate(items, 0, 100).pageItems).toEqual(items.slice(0, 100))
    expect(paginate(items, 1, 100).pageItems).toEqual(items.slice(100, 200))
    expect(paginate(items, 2, 100).pageItems).toEqual(items.slice(200, 250))
  })

  it('computes pageCount as the ceiling of items/pageSize', () => {
    expect(paginate(Array.from({ length: 250 }), 0, 100).pageCount).toBe(3)
    expect(paginate(Array.from({ length: 300 }), 0, 100).pageCount).toBe(3)
    expect(paginate(Array.from({ length: 1 }), 0, 100).pageCount).toBe(1)
  })

  it('clamps a stale page (e.g. after a filter shrinks the result set) into range', () => {
    const items = Array.from({ length: 120 }, (_, i) => i)
    const result = paginate(items, 5, 100)
    expect(result.safePage).toBe(1)
    expect(result.pageItems).toEqual(items.slice(100, 120))
  })

  it('never reports zero pages for an empty list', () => {
    const result = paginate([], 0, 100)
    expect(result.pageCount).toBe(1)
    expect(result.safePage).toBe(0)
    expect(result.pageItems).toEqual([])
  })

  it('clamps a negative page to the first page', () => {
    const items = Array.from({ length: 10 }, (_, i) => i)
    expect(paginate(items, -3, 100).safePage).toBe(0)
  })
})
