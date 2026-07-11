import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState, type NewsSource, type DockCardId } from '@renderer/state/AppStateContext'
import { ALL_ASSETS } from '@renderer/data/mockData'
import type { Asset } from '@renderer/types/market'
import { IconClose } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import OverlayPanel from '@renderer/components/ui/OverlayPanel'
import './customize.css'

const NEWS_SOURCES: NewsSource[] = ['selected', 'watchlist', 'portfolio']
const DOCK_CARD_IDS: DockCardId[] = ['risk', 'options', 'news']

export default function CustomizePanel(): JSX.Element {
  const { t } = useTranslation()
  const {
    customizeOpen,
    closeCustomize,
    watchlist,
    toggleWatchlist,
    resetWatchlist,
    newsSource,
    setNewsSource,
    dockHidden,
    toggleDockCardHidden,
    resetDockLayout
  } = useAppState()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Asset | null>(null)

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
    <OverlayPanel
      open={customizeOpen}
      onClose={closeCustomize}
      ariaLabel={t('customize.heading')}
      className="customize-panel"
    >
      <div className="overlay-header">
        <div className="overlay-title">
          <span className="overlay-badge">{t('customize.badge')}</span>
          <h2>{t('customize.heading')}</h2>
        </div>
        <Tooltip label={t('common.close') ?? ''}>
          <button className="icon-btn" onClick={closeCustomize} aria-label={t('common.close') ?? undefined}>
            <IconClose size={15} />
          </button>
        </Tooltip>
      </div>

      <div className="overlay-body">
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

        <h3 className="customize-section-heading customize-section-spaced">{t('customize.dockSectionsHeading')}</h3>
        <p className="customize-intro">{t('customize.dockSectionsSub')}</p>
        <div className="customize-list">
          {DOCK_CARD_IDS.map((id) => (
            <label className="customize-list-item customize-toggle-item" key={id}>
              <span className="customize-list-info">
                <span className="customize-list-sym">{t(`dock.${id}.title`)}</span>
              </span>
              <input type="checkbox" checked={!dockHidden.includes(id)} onChange={() => toggleDockCardHidden(id)} />
            </label>
          ))}
        </div>
        <button className="customize-reset" onClick={resetDockLayout}>
          {t('customize.resetLayoutBtn')}
        </button>
      </div>
    </OverlayPanel>
  )
}
