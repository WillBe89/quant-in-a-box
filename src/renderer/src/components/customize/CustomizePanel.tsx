import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState, type NewsSource } from '@renderer/state/AppStateContext'
import { ALL_ASSETS } from '@renderer/data/mockData'
import type { Asset } from '@renderer/types/market'
import { IconClose } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import './customize.css'

const NEWS_SOURCES: NewsSource[] = ['selected', 'watchlist', 'portfolio']

export default function CustomizePanel(): JSX.Element | null {
  const { t } = useTranslation()
  const { customizeOpen, closeCustomize, watchlist, toggleWatchlist, resetWatchlist, newsSource, setNewsSource } =
    useAppState()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Asset | null>(null)

  useEffect(() => {
    if (!customizeOpen) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') closeCustomize()
    }
    window.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [customizeOpen, closeCustomize])

  if (!customizeOpen) return null

  const matches =
    query.trim().length > 0
      ? ALL_ASSETS.filter(
          (a) =>
            !watchlist.some((w) => w.symbol === a.symbol) &&
            (a.symbol.toLowerCase().includes(query.toLowerCase()) || a.name.toLowerCase().includes(query.toLowerCase()))
        ).slice(0, 6)
      : []

  function handleAdd(): void {
    if (!selected) return
    toggleWatchlist(selected)
    setQuery('')
    setSelected(null)
  }

  return (
    <div className="customize-scrim" onClick={closeCustomize}>
      <div
        className="customize-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('customize.heading')}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="customize-header">
          <div className="customize-title">
            <span className="customize-badge">{t('customize.badge')}</span>
            <h2>{t('customize.heading')}</h2>
          </div>
          <Tooltip label={t('common.close') ?? ''}>
            <button className="icon-btn" onClick={closeCustomize} aria-label={t('common.close') ?? undefined}>
              <IconClose size={15} />
            </button>
          </Tooltip>
        </div>

        <div className="customize-body">
          <h3 className="customize-section-heading">{t('customize.watchlistHeading')}</h3>
          <p className="customize-intro">{t('customize.intro')}</p>

          <div className="customize-add">
            <div className="customize-add-field">
              <input
                type="text"
                placeholder={t('customize.addPlaceholder') ?? undefined}
                value={selected ? selected.symbol : query}
                onChange={(e) => {
                  setSelected(null)
                  setQuery(e.target.value)
                }}
              />
              {matches.length > 0 && !selected && (
                <div className="customize-add-results">
                  {matches.map((a) => (
                    <button key={a.symbol} onClick={() => setSelected(a)}>
                      <span className="sr-sym">{a.symbol}</span>
                      <span className="sr-name">{a.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="customize-add-btn" onClick={handleAdd}>
              {t('customize.addBtn')}
            </button>
          </div>

          {watchlist.length === 0 ? (
            <div className="customize-empty">{t('customize.empty')}</div>
          ) : (
            <div className="customize-list">
              {watchlist.map((a) => (
                <div className="customize-list-item" key={a.symbol}>
                  <div className="customize-list-info">
                    <span className="customize-list-sym">{a.symbol}</span>
                    <span className="customize-list-name">{a.name}</span>
                  </div>
                  <Tooltip label={t('customize.remove') ?? ''}>
                    <button
                      className="customize-remove"
                      onClick={() => toggleWatchlist(a)}
                      aria-label={t('customize.remove') ?? undefined}
                    >
                      <IconClose size={12} />
                    </button>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}

          <button className="customize-reset" onClick={resetWatchlist}>
            {t('customize.reset')}
          </button>

          <h3 className="customize-section-heading customize-section-spaced">{t('customize.newsHeading')}</h3>
          <p className="customize-intro">{t('customize.newsIntro')}</p>
          <div className="customize-segmented">
            {NEWS_SOURCES.map((s) => (
              <button
                key={s}
                className={'customize-segmented-item' + (newsSource === s ? ' active' : '')}
                onClick={() => setNewsSource(s)}
              >
                {t(`customize.news${s.charAt(0).toUpperCase()}${s.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
