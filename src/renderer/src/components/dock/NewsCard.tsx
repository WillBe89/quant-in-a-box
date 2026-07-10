import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import { dataService } from '@renderer/data/dataService'
import CardHead from './CardHead'
import type { NewsItem } from '@renderer/types/market'

function timeAgo(unixSeconds: number, t: TFunction): string {
  const diffMin = Math.max(1, Math.round((Date.now() / 1000 - unixSeconds) / 60))
  if (diffMin < 60) return t('dock.news.minutesAgo', { count: diffMin })
  return t('dock.news.hoursAgo', { count: Math.round(diffMin / 60) })
}

export default function NewsCard(): JSX.Element {
  const { t } = useTranslation()
  const { symbol } = useAppState()
  const [news, setNews] = useState<NewsItem[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [openItem, setOpenItem] = useState<NewsItem | null>(null)

  useEffect(() => {
    let cancelled = false
    dataService.getNews(symbol.symbol).then((data) => {
      if (!cancelled) setNews(data)
    })
    return () => {
      cancelled = true
    }
  }, [symbol])

  return (
    <section className={'card' + (collapsed ? ' collapsed' : '') + (openItem ? ' reader-mode' : '')} data-card="news">
      <CardHead title={t('dock.news.title')} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="card-body">
        {openItem ? (
          <div className="reader">
            <button className="reader-back" onClick={() => setOpenItem(null)}>
              {t('dock.news.back')}
            </button>
            <div className="src">{openItem.source}</div>
            <h4>{openItem.headline}</h4>
            <div className="meta">
              {timeAgo(openItem.publishedAt, t)} · {t('dock.news.sideBySideNote')}
            </div>
            <p>{openItem.summary}</p>
            <a className="full-link" href={openItem.url} target="_blank" rel="noreferrer">
              {t('dock.news.openFull')}
            </a>
          </div>
        ) : (
          <div className="news-list">
            {news.map((item) => (
              <button key={item.id} className="news-item" onClick={() => setOpenItem(item)}>
                <div className="src">{item.source}</div>
                <div className="hd">{item.headline}</div>
                <div className="meta">{timeAgo(item.publishedAt, t)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
