import { useEffect, useState } from 'react'
import { useAppState } from '@renderer/state/AppStateContext'
import { dataService } from '@renderer/data/dataService'
import CardHead from './CardHead'
import type { NewsItem } from '@renderer/types/market'

function timeAgo(unixSeconds: number): string {
  const diffMin = Math.max(1, Math.round((Date.now() / 1000 - unixSeconds) / 60))
  if (diffMin < 60) return `${diffMin}m ago`
  return `${Math.round(diffMin / 60)}h ago`
}

export default function NewsCard(): JSX.Element {
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
      <CardHead title="Market news" collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="card-body">
        {openItem ? (
          <div className="reader">
            <button className="reader-back" onClick={() => setOpenItem(null)}>
              ← Back to headlines
            </button>
            <div className="src">{openItem.source}</div>
            <h4>{openItem.headline}</h4>
            <div className="meta">{timeAgo(openItem.publishedAt)} · displayed side-by-side with your chart</div>
            <p>{openItem.summary}</p>
            <a className="full-link" href={openItem.url} target="_blank" rel="noreferrer">
              Open full article ↗
            </a>
          </div>
        ) : (
          <div className="news-list">
            {news.map((item) => (
              <button key={item.id} className="news-item" onClick={() => setOpenItem(item)}>
                <div className="src">{item.source}</div>
                <div className="hd">{item.headline}</div>
                <div className="meta">{timeAgo(item.publishedAt)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
