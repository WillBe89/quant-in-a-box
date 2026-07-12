import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Asset, AssetClass } from '@renderer/types/market'
import { useAppState } from '@renderer/state/AppStateContext'
import { ALL_ASSETS, ASSETS_BY_CLASS } from '@renderer/data/mockData'
import { searchAssets } from '@renderer/lib/assetSearch'
import { paginate } from '@renderer/lib/pagination'
import OverlayPanel from '@renderer/components/ui/OverlayPanel'
import Tooltip from '@renderer/components/ui/Tooltip'
import { IconClose } from '@renderer/components/icons/Icons'
import './asset-browser.css'

const PAGE_SIZE = 100

type SortColumn = 'symbol' | 'name' | 'price' | 'changePct'
interface SortState {
  column: SortColumn
  direction: 'asc' | 'desc'
}

// Same convention ChartSlot.tsx uses for the focused chart's price readout — kept as a small
// local copy (not worth extracting a shared formatter for a two-line function used in one place
// each) so a bond/FX yield still reads as a percentage here too.
function formatPrice(price: number, isYield?: boolean): string {
  if (isYield) return `${price.toFixed(2)}%`
  return price >= 1000
    ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : `$${price.toFixed(2)}`
}

export default function AssetBrowserPanel(): JSX.Element {
  const { t } = useTranslation()
  const {
    assetBrowserOpen,
    closeAssetBrowser,
    assetBrowserClassFilter,
    setAssetBrowserClassFilter,
    selectSymbol
  } = useAppState()

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<SortState | null>(null)

  // Same class list/order and translation keys as Topbar's chips (see Topbar.tsx CLASS_OPTIONS)
  // — kept as its own literal here rather than a shared import so this panel's in-body filter
  // chips don't have a compile-time dependency on Topbar's markup.
  const CLASS_OPTIONS: Array<{ id: AssetClass | 'all'; label: string }> = [
    { id: 'all', label: t('topbar.classAll') },
    { id: 'stocks', label: t('topbar.classStocks') },
    { id: 'crypto', label: t('topbar.classCrypto') },
    { id: 'bonds', label: t('topbar.classBonds') },
    { id: 'fx', label: t('topbar.classFx') },
    { id: 're', label: t('topbar.classRe') }
  ]

  const baseAssets = useMemo<Asset[]>(
    () => (assetBrowserClassFilter === 'all' ? ALL_ASSETS : ASSETS_BY_CLASS[assetBrowserClassFilter]),
    [assetBrowserClassFilter]
  )

  const matched = useMemo<Asset[]>(() => {
    const q = query.trim()
    return q ? searchAssets(baseAssets, q, baseAssets.length) : baseAssets
  }, [baseAssets, query])

  const sorted = useMemo<Asset[]>(() => {
    if (!sort) return matched
    const dir = sort.direction === 'asc' ? 1 : -1
    const column = sort.column
    return [...matched].sort((a, b) => {
      if (column === 'symbol') return a.symbol.localeCompare(b.symbol) * dir
      if (column === 'name') return a.name.localeCompare(b.name) * dir
      if (column === 'price') return (a.price - b.price) * dir
      return (a.changePct - b.changePct) * dir
    })
  }, [matched, sort])

  // Whenever the class filter or search text changes the result set's identity, a page number
  // left over from browsing a different, larger set could point past the end — reset to the
  // first page rather than showing a stale/empty page.
  useEffect(() => {
    setPage(0)
  }, [assetBrowserClassFilter, query])

  // This panel never unmounts (only its OverlayPanel wrapper animates in/out), so a search left
  // over from a previous visit would otherwise still be sitting in the box next time a Topbar
  // chip opens it fresh — confusingly showing "no results" for a class it was never searched
  // against. Only reset on the closed->open transition, not on every render, so narrowing the
  // class filter from a chip *inside* the already-open panel doesn't clobber an active search.
  useEffect(() => {
    if (assetBrowserOpen) setQuery('')
  }, [assetBrowserOpen])

  const { pageItems, pageCount, safePage } = useMemo(
    () => paginate(sorted, page, PAGE_SIZE),
    [sorted, page]
  )

  function toggleSort(column: SortColumn): void {
    setSort((prev) => {
      if (!prev || prev.column !== column) return { column, direction: 'asc' }
      return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
    })
  }

  function ariaSortFor(column: SortColumn): 'ascending' | 'descending' | 'none' {
    if (!sort || sort.column !== column) return 'none'
    return sort.direction === 'asc' ? 'ascending' : 'descending'
  }

  function sortArrow(column: SortColumn): string {
    if (!sort || sort.column !== column) return ''
    return sort.direction === 'asc' ? '▲' : '▼'
  }

  function handleSelect(asset: Asset): void {
    selectSymbol(asset)
    closeAssetBrowser()
  }

  function renderSortHeader(column: SortColumn, labelKey: string): JSX.Element {
    const arrow = sortArrow(column)
    return (
      <th aria-sort={ariaSortFor(column)}>
        <button className="asset-browser-sort" onClick={() => toggleSort(column)}>
          {t(labelKey)}
          {arrow && <span className="asset-browser-sort-arrow">{arrow}</span>}
        </button>
      </th>
    )
  }

  return (
    <OverlayPanel
      open={assetBrowserOpen}
      onClose={closeAssetBrowser}
      ariaLabel={t('assetBrowser.heading')}
      className="asset-browser-panel"
    >
      <div className="overlay-header">
        <div className="overlay-title">
          <span className="overlay-badge">{t('assetBrowser.badge')}</span>
          <h2>{t('assetBrowser.heading')}</h2>
        </div>
        <Tooltip label={t('common.close') ?? ''}>
          <button className="icon-btn" onClick={closeAssetBrowser} aria-label={t('common.close') ?? undefined}>
            <IconClose size={15} />
          </button>
        </Tooltip>
      </div>

      <div className="overlay-body">
        <p className="customize-intro">{t('assetBrowser.intro')}</p>

        <div className="asset-browser-controls">
          <div className="search-box asset-browser-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder={t('assetBrowser.searchPlaceholder') ?? undefined}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="class-filters">
            {CLASS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={'chip' + (assetBrowserClassFilter === opt.id ? ' active grad' : '')}
                onClick={() => setAssetBrowserClassFilter(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <p className="asset-browser-count">{t('assetBrowser.resultCount', { count: sorted.length })}</p>

        <div className="portfolio-table-wrap asset-browser-table-wrap">
          <table className="portfolio-table asset-browser-table">
            <thead>
              <tr>
                {renderSortHeader('symbol', 'assetBrowser.colSymbol')}
                {renderSortHeader('name', 'assetBrowser.colName')}
                {renderSortHeader('price', 'assetBrowser.colPrice')}
                {renderSortHeader('changePct', 'assetBrowser.colChange')}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((a, i) => (
                <tr
                  // Index, not a.symbol: the underlying universe has a handful of known
                  // symbol collisions (a few curated tickers — e.g. AAPL/NVDA/MSFT — also
                  // appear in the NASDAQ-screener-derived generated list), and a duplicate
                  // React key breaks reconciliation across re-sorts/re-filters. Safe here
                  // since pageItems is a fresh array identity on every filter/sort/page change.
                  key={i}
                  className="asset-browser-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(a)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelect(a)
                    }
                  }}
                >
                  <td className="portfolio-sym">{a.symbol}</td>
                  <td className="asset-browser-name">{a.name}</td>
                  <td className="tnum">{formatPrice(a.price, a.isYield)}</td>
                  <td className={'tnum ' + (a.changePct >= 0 ? 'up' : 'down')}>
                    {a.changePct >= 0 ? '+' : ''}
                    {a.changePct.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageItems.length === 0 && <div className="customize-empty">{t('assetBrowser.empty')}</div>}
        </div>

        <div className="asset-browser-pagination">
          <button className="customize-reset" disabled={safePage === 0} onClick={() => setPage((p) => p - 1)}>
            {t('assetBrowser.prevPage')}
          </button>
          <span className="asset-browser-page-indicator">
            {t('assetBrowser.pageIndicator', { page: safePage + 1, totalPages: pageCount })}
          </span>
          <button
            className="customize-reset"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('assetBrowser.nextPage')}
          </button>
        </div>
      </div>
    </OverlayPanel>
  )
}
