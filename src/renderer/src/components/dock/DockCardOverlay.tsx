import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import OverlayPanel from '@renderer/components/ui/OverlayPanel'
import { IconClose } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import { RiskCardBody, useRiskStats } from './RiskCard'
import { OptionsCardBody, useOptionChain } from './OptionsCard'
import { NewsCardBody, useNewsFeed } from './NewsCard'
import type { NewsItem } from '@renderer/types/market'

export default function DockCardOverlay(): JSX.Element {
  const { t } = useTranslation()
  const { symbol, expandedCard, closeCardOverlay } = useAppState()
  const [openItem, setOpenItem] = useState<NewsItem | null>(null)

  // Reset the News reader view whenever the overlay closes (or switches to a
  // different card) so reopening News always starts back at the article list.
  useEffect(() => {
    if (expandedCard !== 'news') setOpenItem(null)
  }, [expandedCard])

  const stats = useRiskStats(symbol)
  const chain = useOptionChain(symbol)
  const news = useNewsFeed()

  const titleKey =
    expandedCard === 'risk' ? 'dock.risk.title' : expandedCard === 'options' ? 'dock.options.title' : 'dock.news.title'

  return (
    <OverlayPanel
      open={expandedCard !== null}
      onClose={closeCardOverlay}
      ariaLabel={t(titleKey)}
      zIndex={105}
      className="dock-card-overlay"
    >
      <div className="overlay-header">
        <div className="overlay-title">
          <h2>{t(titleKey)}</h2>
        </div>
        <Tooltip label={t('common.close') ?? ''}>
          <button className="icon-btn" onClick={closeCardOverlay} aria-label={t('common.close') ?? undefined}>
            <IconClose size={15} />
          </button>
        </Tooltip>
      </div>
      <div className="overlay-body">
        {expandedCard === 'risk' && <RiskCardBody stats={stats} />}
        {expandedCard === 'options' && <OptionsCardBody chain={chain} />}
        {expandedCard === 'news' && (
          <NewsCardBody news={news} openItem={openItem} onOpenItem={setOpenItem} onBack={() => setOpenItem(null)} />
        )}
      </div>
    </OverlayPanel>
  )
}
