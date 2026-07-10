import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ALL_ASSETS } from '@renderer/data/mockData'
import { useAppState, type TickerSource } from '@renderer/state/AppStateContext'
import type { Asset } from '@renderer/types/market'

const SOURCES: TickerSource[] = ['watchlist', 'portfolio', 'all']

export default function TickerTape(): JSX.Element {
  const { t } = useTranslation()
  const { tickerSource, setTickerSource, watchlist, portfolio } = useAppState()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const settingsBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onDocClick(e: MouseEvent): void {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || settingsBtnRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  const sourceLabel: Record<TickerSource, string> = {
    watchlist: t('ticker.sourceWatchlist'),
    portfolio: t('ticker.sourcePortfolio'),
    all: t('ticker.sourceAll')
  }

  const assets = useMemo<Asset[]>(() => {
    if (tickerSource === 'all') return ALL_ASSETS
    if (tickerSource === 'portfolio') {
      return portfolio
        .map((p) => ALL_ASSETS.find((a) => a.symbol === p.symbol))
        .filter((a): a is Asset => Boolean(a))
    }
    return watchlist
  }, [tickerSource, watchlist, portfolio])

  const emptyMessage =
    assets.length === 0
      ? tickerSource === 'portfolio'
        ? t('ticker.emptyPortfolio')
        : t('ticker.emptyWatchlist')
      : null

  const doubled = [...assets, ...assets]

  return (
    <footer className="ticker">
      <button
        ref={settingsBtnRef}
        className="ticker-settings"
        onClick={() => setMenuOpen((o) => !o)}
        title={t('ticker.settingsLabel') ?? undefined}
        aria-label={t('ticker.settingsLabel') ?? undefined}
      >
        ⚙
      </button>
      {menuOpen && (
        <div className="ticker-menu" ref={menuRef}>
          <div className="ticker-menu-heading">{t('ticker.sourceHeading')}</div>
          {SOURCES.map((s) => (
            <button
              key={s}
              className={'ticker-menu-item' + (tickerSource === s ? ' active' : '')}
              onClick={() => {
                setTickerSource(s)
                setMenuOpen(false)
              }}
            >
              {sourceLabel[s]}
            </button>
          ))}
        </div>
      )}
      <div className="ticker-scroll-area">
        {emptyMessage ? (
          <div className="ticker-empty">{emptyMessage}</div>
        ) : (
          <div className="ticker-track">
            {doubled.map((a, i) => {
              const up = a.changePct >= 0
              return (
                <div className="tick tnum" key={`${a.symbol}-${i}`}>
                  <span className="t-sym">{a.symbol}</span>
                  <span>{a.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  <span className={'t-chg ' + (up ? 'up' : 'down')}>
                    {up ? '+' : ''}
                    {a.changePct.toFixed(2)}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </footer>
  )
}
