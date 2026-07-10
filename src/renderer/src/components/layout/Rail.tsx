import { useTranslation } from 'react-i18next'
import type { AssetClass } from '@renderer/types/market'
import { useAppState } from '@renderer/state/AppStateContext'

export default function Rail(): JSX.Element {
  const { t } = useTranslation()
  const { assetClass, setAssetClass, selectSymbol, openAcademy, openPortfolio, watchlist } = useAppState()

  const RAIL_ITEMS: Array<{ id: AssetClass | 'all'; icon: string; label: string }> = [
    { id: 'all', icon: '◎', label: t('rail.allAssets') },
    { id: 'stocks', icon: '▤', label: t('rail.stocksEtfs') },
    { id: 'crypto', icon: '◈', label: t('rail.crypto') },
    { id: 'bonds', icon: '≋', label: t('rail.bondsFixedIncome') },
    { id: 'fx', icon: '⇄', label: t('rail.fxCommodities') },
    { id: 're', icon: '⌂', label: t('rail.realEstate') }
  ]

  return (
    <aside className="rail">
      {RAIL_ITEMS.map((item) => (
        <button
          key={item.id}
          className={'rail-btn' + (assetClass === item.id ? ' active' : '')}
          onClick={() => setAssetClass(item.id)}
        >
          {item.icon}
          <span className="lbl">{item.label}</span>
        </button>
      ))}
      <div className="rail-divider" />
      <div className="rail-watch">
        {watchlist.length === 0 && (
          <div className="rail-watch-empty" title={t('rail.watchlistEmptyHint') ?? undefined}>
            ☆
          </div>
        )}
        {watchlist.map((a) => (
          <button key={a.symbol} className="rail-dot" title={a.name} onClick={() => selectSymbol(a)}>
            {a.symbol.slice(0, 4)}
          </button>
        ))}
      </div>
      <div className="rail-spacer" />
      <button className="rail-btn" onClick={openPortfolio} title={t('rail.yourPortfolio') ?? undefined}>
        💼
        <span className="lbl">{t('rail.yourPortfolio')}</span>
      </button>
      <button className="rail-btn rail-learn" onClick={() => openAcademy()} title={t('rail.teachingZone') ?? undefined}>
        🎓
        <span className="lbl">{t('rail.teachingZone')}</span>
      </button>
    </aside>
  )
}
