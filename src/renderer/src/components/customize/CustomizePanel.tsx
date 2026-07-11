import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useAppState,
  useDockLayout,
  type NewsSource,
  type DockCardId,
  type GlassTier
} from '@renderer/state/AppStateContext'
import { ALL_ASSETS } from '@renderer/data/mockData'
import { searchAssets } from '@renderer/lib/assetSearch'
import {
  getFinnhubKey,
  setFinnhubKey,
  clearFinnhubKey,
  getTwelveDataKey,
  setTwelveDataKey,
  clearTwelveDataKey
} from '@renderer/data/apiKeyStore'
import { estimateCandleDownloadCalls, downloadHistoricalCandles } from '@renderer/data/historyDownload'
import { FinnhubCandleRangeError } from '@renderer/data/finnhubAdapter'
import type { Asset } from '@renderer/types/market'
import { IconClose } from '@renderer/components/icons/Icons'
import { resolvePortfolioIcon, resolvePortfolioColor } from '@renderer/lib/portfolioStyle'
import PortfolioStylePicker from '@renderer/components/portfolio/PortfolioStylePicker'
import Tooltip from '@renderer/components/ui/Tooltip'
import OverlayPanel from '@renderer/components/ui/OverlayPanel'
import './customize.css'

const NEWS_SOURCES: NewsSource[] = ['selected', 'watchlist', 'portfolio']
const DOCK_CARD_IDS: DockCardId[] = ['risk', 'options', 'news']
const GLASS_TIERS: GlassTier[] = ['panels', 'chrome', 'chart']

function PortfolioRow({
  id,
  name,
  icon,
  color
}: {
  id: string
  name: string
  icon?: string
  color?: string
}): JSX.Element {
  const { t } = useTranslation()
  const { renamePortfolio, deletePortfolio, updatePortfolioStyle } = useAppState()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [nameTaken, setNameTaken] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const Icon = resolvePortfolioIcon(icon)
  const resolvedColor = resolvePortfolioColor(color)

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
      <div className="portfolio-row-main">
        <PortfolioStylePicker
          icon={icon}
          color={color}
          onChange={(style) => updatePortfolioStyle(id, style)}
          renderTrigger={(onClick) => (
            <Tooltip label={t('customize.portfolioStyle.trigger') ?? ''}>
              <button
                className="portfolio-style-trigger"
                style={{ color: resolvedColor }}
                onClick={onClick}
                aria-label={t('customize.portfolioStyle.trigger') ?? undefined}
              >
                <Icon size={15} />
              </button>
            </Tooltip>
          )}
        />
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

function ApiKeyRow({
  label,
  configured,
  statusLabel,
  onSave,
  onClear
}: {
  label: string
  configured: boolean
  statusLabel: string
  onSave: (value: string) => void | Promise<void>
  onClear: () => void | Promise<void>
}): JSX.Element {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave(): Promise<void> {
    const trimmed = value.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await onSave(trimmed)
      setValue('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="apikey-row">
      <div className="apikey-row-head">
        <span className="apikey-label">{label}</span>
        <span className={'apikey-status' + (configured ? ' ok' : '')}>{statusLabel}</span>
      </div>
      <div className="customize-add">
        <div className="customize-add-field">
          <input
            type="password"
            placeholder={t('customize.apiKeys.placeholder') ?? undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
            }}
          />
        </div>
        <button className="customize-add-btn" onClick={handleSave} disabled={saving || !value.trim()}>
          {t('customize.apiKeys.saveBtn')}
        </button>
        {configured && (
          <button className="customize-reset" onClick={onClear}>
            {t('customize.apiKeys.clearBtn')}
          </button>
        )}
      </div>
    </div>
  )
}

type ArchiveExportStatus = 'success' | 'canceled' | 'error' | null

const ARCHIVE_STATUS_CLEAR_MS = 4000

const HISTORY_DOWNLOAD_YEAR_PRESETS = [1, 2, 5, 10, 20]

type HistoryDownloadStatus = 'idle' | 'loading' | 'success' | 'forbidden' | 'rateLimited' | 'error'

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
    portfolios,
    settingsVersion,
    bumpSettingsVersion,
    glassTiers,
    toggleGlassTier
  } = useAppState()
  const { dockHidden, toggleDockCardHidden, resetDockLayout } = useDockLayout()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Asset | null>(null)
  const [anthropicConfigured, setAnthropicConfigured] = useState(false)
  const [archiveSymbol, setArchiveSymbol] = useState('')
  const [archiveStatus, setArchiveStatus] = useState<ArchiveExportStatus>(null)
  const [historyQuery, setHistoryQuery] = useState('')
  const [historySelected, setHistorySelected] = useState<Asset | null>(null)
  const [historyYears, setHistoryYears] = useState<number>(5)
  const [historyStatus, setHistoryStatus] = useState<HistoryDownloadStatus>('idle')

  useEffect(() => {
    let cancelled = false
    Promise.resolve(window.api?.getAnthropicKeyStatus())
      .then((status) => {
        if (!cancelled) setAnthropicConfigured(Boolean(status?.configured))
      })
      .catch(() => {
        if (!cancelled) setAnthropicConfigured(false)
      })
    return () => {
      cancelled = true
    }
  }, [settingsVersion])

  const matches = useMemo(() => {
    const available = ALL_ASSETS.filter((a) => !watchlist.some((w) => w.symbol === a.symbol))
    return searchAssets(available, query)
  }, [query, watchlist])

  // Finnhub's /stock/candle endpoint (what the bulk download and the ordinary per-view fetch
  // both use) only ever applies to the 'stocks' asset class in this app — pre-filtering here,
  // rather than merely warning after the fact, means the picker can never surface a symbol the
  // download would just fail on anyway.
  const stockOnlyAssets = useMemo(() => ALL_ASSETS.filter((a) => a.klass === 'stocks'), [])
  const historyMatches = useMemo(
    () => (historySelected ? [] : searchAssets(stockOnlyAssets, historyQuery)),
    [historyQuery, historySelected, stockOnlyAssets]
  )
  const hasFinnhubKey = Boolean(getFinnhubKey())
  const historyCalls = estimateCandleDownloadCalls(historyYears)

  function handleAdd(): void {
    if (!selected) return
    toggleWatchlist(selected)
    setQuery('')
    setSelected(null)
  }

  function flashArchiveStatus(next: Exclude<ArchiveExportStatus, null>): void {
    setArchiveStatus(next)
    setTimeout(() => setArchiveStatus((current) => (current === next ? null : current)), ARCHIVE_STATUS_CLEAR_MS)
  }

  async function handleExportArchive(): Promise<void> {
    const symbol = archiveSymbol.trim().toUpperCase() || undefined
    const result = await window.api?.exportMarketArchive(symbol).catch(() => null)
    if (!result) {
      flashArchiveStatus('error')
    } else if (result.ok) {
      flashArchiveStatus('success')
    } else if (result.canceled) {
      flashArchiveStatus('canceled')
    } else {
      flashArchiveStatus('error')
    }
  }

  // Deliberately no auto-clearing timer here (unlike flashArchiveStatus above) — the three
  // distinct error messages this can land on exist specifically so Will can read exactly what
  // went wrong (403 vs 429 vs something else) once a real key is configured; racing that against
  // a few-second timeout would undercut the point of having distinct messages at all.
  async function handleHistoryDownload(): Promise<void> {
    if (!historySelected || !hasFinnhubKey || historyStatus === 'loading') return
    setHistoryStatus('loading')
    try {
      await downloadHistoricalCandles({ symbol: historySelected.symbol, years: historyYears })
      setHistoryStatus('success')
    } catch (err) {
      if (err instanceof FinnhubCandleRangeError) {
        if (err.status === 403) setHistoryStatus('forbidden')
        else if (err.status === 429) setHistoryStatus('rateLimited')
        else setHistoryStatus('error')
      } else {
        setHistoryStatus('error')
      }
    }
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
        <p className="customize-scope-note">{t('customize.analyticsOnlyNote')}</p>

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
              <PortfolioRow key={p.id} id={p.id} name={p.name} icon={p.icon} color={p.color} />
            ))}
          </div>
        )}

        <h3 className="customize-section-heading customize-section-spaced">{t('customize.apiKeys.heading')}</h3>
        <p className="customize-intro">{t('customize.apiKeys.intro')}</p>

        <ApiKeyRow
          label={t('customize.apiKeys.finnhubLabel')}
          configured={Boolean(getFinnhubKey())}
          statusLabel={
            getFinnhubKey() ? t('customize.apiKeys.statusLive') : t('customize.apiKeys.statusMock')
          }
          onSave={(v) => {
            setFinnhubKey(v)
            bumpSettingsVersion()
          }}
          onClear={() => {
            clearFinnhubKey()
            bumpSettingsVersion()
          }}
        />
        <ApiKeyRow
          label={t('customize.apiKeys.twelveDataLabel')}
          configured={Boolean(getTwelveDataKey())}
          statusLabel={
            getTwelveDataKey() ? t('customize.apiKeys.statusLive') : t('customize.apiKeys.statusMock')
          }
          onSave={(v) => {
            setTwelveDataKey(v)
            bumpSettingsVersion()
          }}
          onClear={() => {
            clearTwelveDataKey()
            bumpSettingsVersion()
          }}
        />
        <ApiKeyRow
          label={t('customize.apiKeys.anthropicLabel')}
          configured={anthropicConfigured}
          statusLabel={
            anthropicConfigured
              ? t('customize.apiKeys.statusConfigured')
              : t('customize.apiKeys.statusNotConfigured')
          }
          onSave={async (v) => {
            await window.api?.setAnthropicKey(v)
            bumpSettingsVersion()
          }}
          onClear={async () => {
            await window.api?.clearAnthropicKey()
            bumpSettingsVersion()
          }}
        />

        <h3 className="customize-section-heading customize-section-spaced">
          {t('customize.marketArchive.heading')}
        </h3>
        <p className="customize-intro">{t('customize.marketArchive.intro')}</p>
        <div className="customize-add">
          <div className="customize-add-field">
            <input
              type="text"
              placeholder={t('customize.marketArchive.symbolPlaceholder') ?? undefined}
              value={archiveSymbol}
              onChange={(e) => setArchiveSymbol(e.target.value)}
            />
          </div>
          <button className="customize-add-btn" onClick={() => handleExportArchive()}>
            {t('customize.marketArchive.exportBtn')}
          </button>
        </div>
        {archiveStatus && (
          <p
            className={
              'archive-status' +
              (archiveStatus === 'success' ? ' ok' : archiveStatus === 'error' ? ' err' : '')
            }
          >
            {archiveStatus === 'success'
              ? t('customize.marketArchive.success')
              : archiveStatus === 'error'
                ? t('portfolio.export.error')
                : t('portfolio.export.canceled')}
          </p>
        )}

        <h3 className="customize-section-heading customize-section-spaced">
          {t('customize.historyDownload.heading')}
        </h3>
        <p className="customize-intro">{t('customize.historyDownload.intro')}</p>

        {!hasFinnhubKey && (
          <p className="history-download-nokey">{t('customize.historyDownload.noKeyMessage')}</p>
        )}

        <div className={'history-download' + (hasFinnhubKey ? '' : ' disabled')}>
          <div className="customize-add">
            <div className="customize-add-field">
              <input
                type="text"
                placeholder={t('customize.historyDownload.symbolPlaceholder') ?? undefined}
                value={historySelected ? historySelected.symbol : historyQuery}
                disabled={!hasFinnhubKey}
                onChange={(e) => {
                  setHistorySelected(null)
                  setHistoryQuery(e.target.value)
                  setHistoryStatus('idle')
                }}
              />
              {historyMatches.length > 0 && (
                <div className="customize-add-results">
                  {historyMatches.map((a) => (
                    <button
                      key={a.symbol}
                      onClick={() => {
                        setHistorySelected(a)
                        setHistoryStatus('idle')
                      }}
                    >
                      <span className="sr-sym">{a.symbol}</span>
                      <span className="sr-name">{a.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="history-download-note">{t('customize.historyDownload.unsupportedAssetClass')}</p>

          <p className="history-download-years-label">{t('customize.historyDownload.yearsLabel')}</p>
          <div className="customize-segmented">
            {HISTORY_DOWNLOAD_YEAR_PRESETS.map((y) => (
              <button
                key={y}
                className={'customize-segmented-item' + (historyYears === y ? ' active' : '')}
                disabled={!hasFinnhubKey}
                onClick={() => {
                  setHistoryYears(y)
                  setHistoryStatus('idle')
                }}
              >
                {y}Y
              </button>
            ))}
          </div>

          <button
            className="customize-add-btn history-download-btn"
            disabled={!hasFinnhubKey || !historySelected || historyStatus === 'loading'}
            onClick={() => handleHistoryDownload()}
          >
            {historyStatus === 'loading'
              ? t('customize.historyDownload.downloading')
              : historySelected
                ? t('customize.historyDownload.downloadBtn', {
                    count: historyYears,
                    symbol: historySelected.symbol,
                    estimate:
                      historyCalls === 1
                        ? t('customize.historyDownload.estimateOneCall')
                        : t('customize.historyDownload.estimateManyCalls', { calls: historyCalls })
                  })
                : t('customize.historyDownload.downloadBtnIdle')}
          </button>

          {historyStatus !== 'idle' && historyStatus !== 'loading' && (
            <p
              className={
                'history-download-status' + (historyStatus === 'success' ? ' ok' : ' err')
              }
            >
              {historyStatus === 'success'
                ? t('customize.historyDownload.success')
                : historyStatus === 'forbidden'
                  ? t('customize.historyDownload.errorForbidden')
                  : historyStatus === 'rateLimited'
                    ? t('customize.historyDownload.errorRateLimited')
                    : t('customize.historyDownload.errorGeneric')}
            </p>
          )}
        </div>

        <h3 className="customize-section-heading customize-section-spaced">{t('customize.glass.heading')}</h3>
        <p className="customize-intro">{t('customize.glass.intro')}</p>
        <div className="customize-list">
          {GLASS_TIERS.map((tier) => (
            <label className="customize-list-item customize-toggle-item" key={tier}>
              <span className="customize-list-info">
                <span className="customize-list-sym">{t(`customize.glass.${tier}Label`)}</span>
                <span className="customize-list-name">{t(`customize.glass.${tier}Desc`)}</span>
              </span>
              <input type="checkbox" checked={glassTiers[tier]} onChange={() => toggleGlassTier(tier)} />
            </label>
          ))}
        </div>
      </div>
    </OverlayPanel>
  )
}
