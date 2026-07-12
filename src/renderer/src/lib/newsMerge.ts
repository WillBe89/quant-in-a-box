import type { NewsItem } from '@renderer/types/market'

/**
 * Flattens several independently-fetched news feeds (one per category, typically) into a
 * single deduped, chronologically-sorted feed. Used by FinnhubDataService.getNews so that
 * `Promise.allSettled`-fetched per-category results can be combined into the one list the UI
 * renders, without duplicate articles (an article can occasionally show up under more than one
 * category feed) and with a single consistent newest-first order.
 */
export function mergeNewsFeeds(feeds: NewsItem[][]): NewsItem[] {
  const seenIds = new Set<string>()
  const merged: NewsItem[] = []
  for (const feed of feeds) {
    for (const item of feed) {
      if (seenIds.has(item.id)) continue
      seenIds.add(item.id)
      merged.push(item)
    }
  }
  return merged.sort((a, b) => b.publishedAt - a.publishedAt)
}
