import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import OverlayPanel from '@renderer/components/ui/OverlayPanel'
import { IconClose, IconPlus } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import PortfolioPane from './PortfolioPane'
import './portfolio.css'

export default function PortfolioWorkspace(): JSX.Element {
  const { t } = useTranslation()
  const { openPortfolioIds, closeAllPortfolios, closePortfolioInstance, createPortfolio, openPortfolio } =
    useAppState()

  return (
    <OverlayPanel
      open={openPortfolioIds.length > 0}
      onClose={closeAllPortfolios}
      ariaLabel={t('portfolio.heading')}
      className="portfolio-workspace"
    >
      <div className="overlay-header">
        <div className="overlay-title">
          <span className="overlay-badge">{t('portfolio.badge')}</span>
          <h2>{t('portfolio.heading')}</h2>
        </div>
        <Tooltip label={t('common.close') ?? ''}>
          <button className="icon-btn" onClick={closeAllPortfolios} aria-label={t('common.close') ?? undefined}>
            <IconClose size={15} />
          </button>
        </Tooltip>
      </div>
      <div className="portfolio-row">
        {openPortfolioIds.map((id) => (
          <PortfolioPane key={id} portfolioId={id} onClose={() => closePortfolioInstance(id)} />
        ))}
        <button
          className="portfolio-add-pane"
          onClick={() => {
            const id = createPortfolio()
            openPortfolio(id)
          }}
        >
          <IconPlus size={16} />
          <span>{t('portfolio.newPortfolioBtn')}</span>
        </button>
      </div>
    </OverlayPanel>
  )
}
