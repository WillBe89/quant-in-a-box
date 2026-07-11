import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import { openDefaultPortfolio } from '@renderer/lib/portfolioEntry'
import { IconCheck } from '@renderer/components/icons/Icons'
import './portfolioPicker.css'

/**
 * Wraps a trigger (rendered differently in Rail vs. Topbar) with the "smart open" behavior:
 * 0 saved portfolios creates and opens one, exactly 1 opens it directly, 2+ opens a small
 * open/close checklist popover instead of guessing which one the user wants.
 */
export default function PortfolioPicker({
  renderTrigger
}: {
  renderTrigger: (onClick: () => void) => ReactNode
}): JSX.Element {
  const { t } = useTranslation()
  const { portfolios, openPortfolioIds, createPortfolio, openPortfolio, closePortfolioInstance, lastActivePortfolioId } =
    useAppState()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onDocClick(e: MouseEvent): void {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  function handleTriggerClick(): void {
    if (portfolios.length <= 1) {
      openDefaultPortfolio({ portfolios, createPortfolio, openPortfolio })
      return
    }
    setMenuOpen((o) => !o)
  }

  const orderedPortfolios =
    lastActivePortfolioId && portfolios.some((p) => p.id === lastActivePortfolioId)
      ? [
          portfolios.find((p) => p.id === lastActivePortfolioId)!,
          ...portfolios.filter((p) => p.id !== lastActivePortfolioId)
        ]
      : portfolios

  return (
    <div className="portfolio-picker" ref={triggerRef}>
      {renderTrigger(handleTriggerClick)}
      {menuOpen && (
        <div className="portfolio-picker-menu" ref={menuRef}>
          <div className="portfolio-picker-heading">{t('portfolio.pickerHeading')}</div>
          {orderedPortfolios.map((p) => {
            const isOpen = openPortfolioIds.includes(p.id)
            return (
              <button
                key={p.id}
                className={'portfolio-picker-item' + (isOpen ? ' active' : '')}
                onClick={() => (isOpen ? closePortfolioInstance(p.id) : openPortfolio(p.id))}
              >
                <span>{p.name}</span>
                {isOpen && <IconCheck size={13} className="portfolio-picker-check" />}
              </button>
            )
          })}
          <button
            className="portfolio-picker-new"
            onClick={() => {
              const id = createPortfolio()
              openPortfolio(id)
            }}
          >
            {t('portfolio.newPortfolioBtn')}
          </button>
        </div>
      )}
    </div>
  )
}
