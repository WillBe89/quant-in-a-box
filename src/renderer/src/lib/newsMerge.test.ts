import { describe, expect, it } from 'vitest'
import { mergeNewsFeeds } from './newsMerge'
import type { NewsItem } from '@renderer/types/market'

function item(id: string, publishedAt: number, extra?: Partial<NewsItem>): NewsItem {
  return {
    id,
    source: 'Test',
    headline: `Headline ${id}`,
    summary: 'Summary',
    url: `https://example.com/${id}`,
    publishedAt,
    relatedSymbols: [],
    ...extra
  }
}

describe('mergeNewsFeeds', () => {
  it('flattens multiple feeds into one list', () => {
    const result = mergeNewsFeeds([[item('a', 100)], [item('b', 200)], [item('c', 300)]])
    expect(result.map((i) => i.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('sorts the merged result by publishedAt descending, newest first', () => {
    const result = mergeNewsFeeds([[item('old', 100)], [item('new', 300), item('mid', 200)]])
    expect(result.map((i) => i.id)).toEqual(['new', 'mid', 'old'])
  })

  it('dedupes articles that appear in more than one feed, keeping the first occurrence', () => {
    const result = mergeNewsFeeds([
      [item('dup', 100, { headline: 'First seen' })],
      [item('dup', 100, { headline: 'Second seen' })]
    ])
    expect(result).toHaveLength(1)
    expect(result[0].headline).toBe('First seen')
  })

  it('returns an empty array when every feed is empty', () => {
    expect(mergeNewsFeeds([[], [], []])).toEqual([])
  })

  it('returns an empty array for zero feeds', () => {
    expect(mergeNewsFeeds([])).toEqual([])
  })

  it('handles a single feed unchanged aside from sorting', () => {
    const result = mergeNewsFeeds([[item('a', 100), item('b', 300), item('c', 200)]])
    expect(result.map((i) => i.id)).toEqual(['b', 'c', 'a'])
  })
})
