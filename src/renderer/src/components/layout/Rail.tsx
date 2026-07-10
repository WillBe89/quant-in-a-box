import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'

export default function Rail(): JSX.Element {
  const { t } = useTranslation()
  const { selectSymbol, openAcademy, openPortfolio, openCustomize, watchlist } = useAppState()

  return (
    <aside className="rail">
      <button className="rail-btn rail-customize" onClick={openCustomize} title={t('rail.customize') ?? undefined}>
        ✨
        <span className="lbl">{t('rail.customize')}</span>
      </button>
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
