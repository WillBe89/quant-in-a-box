/** Plain-pagination math shared by anything paging a large in-memory array (see
 *  AssetBrowserPanel.tsx, which pages the 13k+-entry asset universe). Deliberately not a
 *  virtualization scheme — this codebase prefers hand-rolled Prev/Next paging over pulling in a
 *  virtualization dependency when a plain page slice is fast enough (13k items sorted/filtered
 *  in memory is trivial), so this stays a tiny, dependency-free helper. */
export interface PageResult<T> {
  pageItems: T[]
  pageCount: number
  /** `page` clamped into `[0, pageCount - 1]` — always a valid index, even if `page` was stale
   *  (e.g. the caller was on page 5 of a filtered set and the filter just shrank to 2 pages). */
  safePage: number
}

export function paginate<T>(items: T[], page: number, pageSize: number): PageResult<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(0, page), pageCount - 1)
  const start = safePage * pageSize
  return { pageItems: items.slice(start, start + pageSize), pageCount, safePage }
}
