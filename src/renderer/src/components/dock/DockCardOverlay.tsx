import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import OverlayPanel from '@renderer/components/ui/OverlayPanel'
import { IconClose } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import { RiskCardBody, useRiskStats } from './RiskCard'
import { OptionsCardBody, useOptionChain } from './OptionsCard'
import { NewsCardBody, useNewsFeed } from './NewsCard'
import type { Asset, NewsItem } from '@renderer/types/market'

export default function DockCardOverlay(): JSX.Element {
  const { t } = useTranslation()
  const { symbol, expandedCard, closeCardOverlay } = useAppState()
  const [openItem, setOpenItem] = useState<NewsItem | null>(null)

  // Reset the News reader view whenever the overlay closes (or switches to a
  // different card) so reopening News always starts back at the article list.
  useEffect(() => {
    if (expandedCard !== 'news') setOpenItem(null)
  }, [expandedCard])

  const titleKey =
    expandedCard === 'risk' ? 'dock.risk.title' : expandedCard === 'options' ? 'dock.options.title' : 'dock.news.title'

  return (
    <OverlayPanel
      open={expandedCard !== null}
      onClose={closeCardOverlay}
      ariaLabel={t(titleKey)}
      zIndex={105}
      layoutId={expandedCard ? `dock-card-${expandedCard}` : undefined}
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
        {expandedCard === 'risk' && <RiskOverlayBody symbol={symbol} />}
        {expandedCard === 'options' && <OptionsOverlayBody symbol={symbol} />}
        {expandedCard === 'news' && (
          <NewsOverlayBody openItem={openItem} onOpenItem={setOpenItem} onBack={() => setOpenItem(null)} />
        )}
      </div>
    </OverlayPanel>
  )
}

function RiskOverlayBody({ symbol }: { symbol: Asset }): JSX.Element {
  const stats = useRiskStats(symbol)
  return <RiskCardBody stats={stats} />
}

function OptionsOverlayBody({ symbol }: { symbol: Asset }): JSX.Element {
  const chain = useOptionChain(symbol)
  return <OptionsCardBody chain={chain} />
}

function NewsOverlayBody({
  openItem,
  onOpenItem,
  onBack
}: {
  openItem: NewsItem | null
  onOpenItem: (item: NewsItem) => void
  onBack: () => void
}): JSX.Element {
  const { newsCategories, toggleNewsCategory } = useAppState()
  const { news, relevantSymbols } = useNewsFeed()
  return (
    <NewsCardBody
      news={news}
      openItem={openItem}
      onOpenItem={onOpenItem}
      onBack={onBack}
      relevantSymbols={relevantSymbols}
      newsCategories={newsCategories}
      onToggleCategory={toggleNewsCategory}
    />
  )
}
