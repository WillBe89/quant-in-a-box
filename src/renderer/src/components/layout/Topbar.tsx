import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AssetClass } from '@renderer/types/market'
import { ALL_ASSETS } from '@renderer/data/mockData'
import { searchAssets } from '@renderer/lib/assetSearch'
import { useAppState } from '@renderer/state/AppStateContext'
import { SUPPORTED_LANGUAGES } from '@renderer/i18n'
import { IconAcademy, IconPortfolio } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import PortfolioPicker from '@renderer/components/portfolio/PortfolioPicker'
import logoMark from '@renderer/assets/logo-just.png'

export default function Topbar(): JSX.Element {
  const { t } = useTranslation()
  const { assetClass, setAssetClass, selectSymbol, theme, toggleTheme, openAcademy, allPortfolioSymbols, language, setLanguage } =
    useAppState()
  const [query, setQuery] = useState('')

  const CLASS_OPTIONS: Array<{ id: AssetClass | 'all'; label: string }> = [
    { id: 'all', label: t('topbar.classAll') },
    { id: 'stocks', label: t('topbar.classStocks') },
    { id: 'crypto', label: t('topbar.classCrypto') },
    { id: 'bonds', label: t('topbar.classBonds') },
    { id: 'fx', label: t('topbar.classFx') },
    { id: 're', label: t('topbar.classRe') }
  ]

  const matches = useMemo(() => searchAssets(ALL_ASSETS, query), [query])

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <img src={logoMark} alt="" />
        </div>
        <div className="brand-name">
          {t('topbar.brandFirst')} <b>{t('topbar.brandSecond')}</b>
        </div>
      </div>

      <div className="global-search">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder={t('topbar.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {matches.length > 0 && (
            <div className="search-results">
              {matches.map((a) => (
                <button
                  key={a.symbol}
                  className="search-result"
                  onClick={() => {
                    selectSymbol(a)
                    setQuery('')
                  }}
                >
                  <span className="sr-sym">{a.symbol}</span>
                  <span className="sr-name">{a.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="class-filters">
          {CLASS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className={'chip' + (assetClass === opt.id ? ' active grad' : '')}
              onClick={() => setAssetClass(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="topbar-actions">
        <span className="scope-badge">{t('topbar.scopeBadge')}</span>
        <PortfolioPicker
          renderTrigger={(onClick) => (
            <Tooltip label={t('topbar.portfolioBtn')}>
              <button className="icon-btn icon-btn-badge" onClick={onClick} aria-label={t('topbar.portfolioBtn')}>
                <IconPortfolio size={16} />
                {allPortfolioSymbols.length > 0 && <span className="icon-badge">{allPortfolioSymbols.length}</span>}
              </button>
            </Tooltip>
          )}
        />
        <Tooltip label={t('topbar.learnBtn')}>
          <button className="icon-btn" onClick={() => openAcademy()} aria-label={t('topbar.learnBtn')}>
            <IconAcademy size={16} />
          </button>
        </Tooltip>
        <select
          className="lang-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Language"
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <Tooltip label={t('topbar.toggleTheme')}>
          <button className="icon-btn" onClick={toggleTheme} aria-label={t('topbar.toggleTheme')}>
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="4.2" />
                <path d="M12 2.5v2.4M12 19.1v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7" />
              </svg>
            )}
          </button>
        </Tooltip>
      </div>
    </header>
  )
}
