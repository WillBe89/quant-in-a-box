import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState, type NewsSource, type DockCardId } from '@renderer/state/AppStateContext'
import { ALL_ASSETS } from '@renderer/data/mockData'
import { searchAssets } from '@renderer/lib/assetSearch'
import type { Asset } from '@renderer/types/market'
import { IconClose } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import OverlayPanel from '@renderer/components/ui/OverlayPanel'
import './customize.css'

const NEWS_SOURCES: NewsSource[] = ['selected', 'watchlist', 'portfolio']
const DOCK_CARD_IDS: DockCardId[] = ['risk', 'options', 'news']

function PortfolioRow({ id, name }: { id: string; name: string }): JSX.Element {
  const { t } = useTranslation()
  const { renamePortfolio, deletePortfolio } = useAppState()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [nameTaken, setNameTaken] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function commitRename(): void {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === name) {
      setDraft(name)
      setEditing(false)
      setNameTaken(false)
      return
    }
    if (renamePortfolio(id, trimmed)) {
      setEditing(false)
      setNameTaken(false)
    } else {
      setNameTaken(true)
    }
  }

  return (
    <div className="customize-list-item">
      <div className="customize-list-info portfolio-rename-info">
        {editing ? (
          <input
            className="portfolio-rename-input"
            value={draft}
            autoFocus
            onChange={(e) => {
              setDraft(e.target.value)
              setNameTaken(false)
            }}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setDraft(name)
                setEditing(false)
                setNameTaken(false)
              }
            }}
          />
        ) : (
          <button className="portfolio-rename-trigger" onClick={() => setEditing(true)}>
            {name}
          </button>
        )}
        {nameTaken && <span className="portfolio-rename-error">{t('customize.portfolioNameTaken')}</span>}
      </div>
      {confirmingDelete ? (
        <button
          className="customize-remove portfolio-delete-confirm"
          onClick={() => deletePortfolio(id)}
          onBlur={() => setConfirmingDelete(false)}
        >
          {t('customize.confirmDelete')}
        </button>
      ) : (
        <Tooltip label={t('customize.deletePortfolio') ?? ''}>
          <button
            className="customize-remove"
            onClick={() => setConfirmingDelete(true)}
            aria-label={t('customize.deletePortfolio') ?? undefined}
          >
            <IconClose size={12} />
          </button>
        </Tooltip>
      )}
    </div>
  )
}

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
    resetDockLayout,
    portfolios
  } = useAppState()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Asset | null>(null)

  const matches = useMemo(() => {
    const available = ALL_ASSETS.filter((a) => !watchlist.some((w) => w.symbol === a.symbol))
    return searchAssets(available, query)
  }, [query, watchlist])

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

        <h3 className="customize-section-heading customize-section-spaced">{t('customize.portfoliosHeading')}</h3>
        <p className="customize-intro">{t('customize.portfoliosSub')}</p>
        {portfolios.length === 0 ? (
          <div className="customize-empty">{t('customize.noPortfolios')}</div>
        ) : (
          <div className="customize-list">
            {portfolios.map((p) => (
              <PortfolioRow key={p.id} id={p.id} name={p.name} />
            ))}
          </div>
        )}
      </div>
    </OverlayPanel>
  )
}
