import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useAppState, ALL_NEWS_CATEGORIES } from '@renderer/state/AppStateContext'
import { dataService, isSingleSymbolNews } from '@renderer/data/dataService'
import CardHead from './CardHead'
import type { DockCardProps } from './dockCardProps'
import { IconArrowLeft, IconCrypto, IconExternalLink, IconFx } from '@renderer/components/icons/Icons'
import type { NewsCategory, NewsItem } from '@renderer/types/market'

function timeAgo(unixSeconds: number, t: TFunction): string {
  const diffMin = Math.max(1, Math.round((Date.now() / 1000 - unixSeconds) / 60))
  if (diffMin < 60) return t('dock.news.minutesAgo', { count: diffMin })
  return t('dock.news.hoursAgo', { count: Math.round(diffMin / 60) })
}

// Only crypto/FX have an existing icon that reads clearly at chip size (IconCrypto/IconFx,
// already used elsewhere for those same asset classes) — general/merger stay text-only chips
// rather than inventing new glyphs for them.
const CATEGORY_ICONS: Partial<Record<NewsCategory, (props: { size?: number }) => JSX.Element>> = {
  crypto: IconCrypto,
  forex: IconFx
}

export function useNewsFeed(): { news: NewsItem[]; relevantSymbols: string[] } {
  const { symbol, newsSource, watchlist, allPortfolioSymbols, newsCategories } = useAppState()
  const [news, setNews] = useState<NewsItem[]>([])

  const relevantSymbols =
    newsSource === 'watchlist'
      ? watchlist.map((a) => a.symbol)
      : newsSource === 'portfolio'
        ? allPortfolioSymbols
        : [symbol.symbol]

  useEffect(() => {
    let cancelled = false
    dataService.getNews(relevantSymbols, newsCategories).then((data) => {
      if (!cancelled) setNews(data)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsSource, symbol, watchlist, allPortfolioSymbols, newsCategories])

  return { news, relevantSymbols }
}

/** Renders nothing (not a broken-image placeholder) if there's no image or it fails to load —
 *  a graceful degrade rather than a visible broken-link icon. `size` picks between the small
 *  48px list-row thumbnail and the larger 16:9 reader-view thumbnail. */
function NewsThumbnail({ src, alt, size }: { src?: string; alt: string; size: 'sm' | 'lg' }): JSX.Element | null {
  const [errored, setErrored] = useState(false)
  useEffect(() => {
    setErrored(false)
  }, [src])
  if (!src || errored) return null
  return (
    <img
      className={`news-thumb news-thumb-${size}`}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
    />
  )
}

function NewsCategoryChips({
  active,
  onToggle
}: {
  active: NewsCategory[]
  onToggle: (cat: NewsCategory) => void
}): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="news-cat-row" role="group">
      {ALL_NEWS_CATEGORIES.map((cat) => {
        const Icon = CATEGORY_ICONS[cat]
        const isOn = active.includes(cat)
        return (
          <button
            key={cat}
            type="button"
            className={'news-cat-chip' + (isOn ? ' on' : '')}
            aria-pressed={isOn}
            onClick={() => onToggle(cat)}
          >
            {Icon ? <Icon size={12} /> : <span className="dot" />}
            {t(`dock.news.category.${cat}`)}
          </button>
        )
      })}
    </div>
  )
}

export function NewsCardBody({
  news,
  openItem,
  onOpenItem,
  onBack,
  relevantSymbols,
  newsCategories,
  onToggleCategory
}: {
  news: NewsItem[]
  openItem: NewsItem | null
  onOpenItem: (item: NewsItem) => void
  onBack: () => void
  relevantSymbols: string[]
  newsCategories: NewsCategory[]
  onToggleCategory: (cat: NewsCategory) => void
}): JSX.Element {
  const { t } = useTranslation()
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const lastOpenedId = useRef<string | null>(null)

  useEffect(() => {
    if (openItem) {
      lastOpenedId.current = openItem.id
      backButtonRef.current?.focus()
    } else if (lastOpenedId.current) {
      itemRefs.current[lastOpenedId.current]?.focus()
    }
  }, [openItem])

  return openItem ? (
    <div className="reader">
      <button className="reader-back" ref={backButtonRef} onClick={onBack}>
        <IconArrowLeft size={12} /> {t('dock.news.back')}
      </button>
      <NewsThumbnail src={openItem.image} alt={openItem.headline} size="lg" />
      <div className="src">{openItem.source}</div>
      <h4>{openItem.headline}</h4>
      <div className="meta">
        {timeAgo(openItem.publishedAt, t)} · {t('dock.news.sideBySideNote')}
      </div>
      <p>{openItem.summary}</p>
      <a className="full-link" href={openItem.url} target="_blank" rel="noreferrer">
        {t('dock.news.openFull')} <IconExternalLink size={12} />
      </a>
    </div>
  ) : (
    <>
      {/* A single-asset news view has no category dimension to filter by — hide the row
       *  entirely rather than showing it disabled. */}
      {!isSingleSymbolNews(relevantSymbols) && (
        <NewsCategoryChips active={newsCategories} onToggle={onToggleCategory} />
      )}
      <div className="news-list">
        {news.map((item) => (
          <button
            key={item.id}
            ref={(el) => {
              itemRefs.current[item.id] = el
            }}
            className="news-item"
            onClick={() => onOpenItem(item)}
          >
            <div className="news-item-row">
              <NewsThumbnail src={item.image} alt={item.headline} size="sm" />
              <div className="news-item-text">
                <div className="src">{item.source}</div>
                <div className="hd">{item.headline}</div>
                <div className="meta">{timeAgo(item.publishedAt, t)}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

export default function NewsCard(props: DockCardProps): JSX.Element {
  const { t } = useTranslation()
  const { newsCategories, toggleNewsCategory } = useAppState()
  const { news, relevantSymbols } = useNewsFeed()
  const [collapsed, setCollapsed] = useState(false)
  const [openItem, setOpenItem] = useState<NewsItem | null>(null)

  return (
    <section className={'card' + (collapsed ? ' collapsed' : '') + (openItem ? ' reader-mode' : '')} data-card="news">
      <CardHead
        title={t('dock.news.title')}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        {...props}
      />
      <div className="card-body">
        <NewsCardBody
          news={news}
          openItem={openItem}
          onOpenItem={setOpenItem}
          onBack={() => setOpenItem(null)}
          relevantSymbols={relevantSymbols}
          newsCategories={newsCategories}
          onToggleCategory={toggleNewsCategory}
        />
      </div>
    </section>
  )
}
