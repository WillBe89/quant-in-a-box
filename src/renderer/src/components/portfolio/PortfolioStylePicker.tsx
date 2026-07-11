import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PORTFOLIO_ICON_IDS,
  PORTFOLIO_ICONS,
  PORTFOLIO_COLORS,
  DEFAULT_PORTFOLIO_ICON,
  resolvePortfolioColor
} from '@renderer/lib/portfolioStyle'
import './portfolioStylePicker.css'

/** Icon+color popover for a portfolio, reusing PortfolioPicker's click-outside-to-close pattern. */
export default function PortfolioStylePicker({
  icon,
  color,
  onChange,
  renderTrigger
}: {
  icon?: string
  color?: string
  onChange: (style: { icon?: string; color?: string }) => void
  renderTrigger: (onClick: () => void) => ReactNode
}): JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent): void {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const activeIconId = icon && (PORTFOLIO_ICON_IDS as string[]).includes(icon) ? icon : DEFAULT_PORTFOLIO_ICON
  const activeColor = resolvePortfolioColor(color)

  return (
    <div className="portfolio-style-picker" ref={triggerRef}>
      {renderTrigger(() => setOpen((o) => !o))}
      {open && (
        <div className="portfolio-style-menu" ref={menuRef}>
          <div className="portfolio-style-heading">{t('customize.portfolioStyle.iconHeading')}</div>
          <div className="portfolio-style-icon-grid">
            {PORTFOLIO_ICON_IDS.map((id) => {
              const Icon = PORTFOLIO_ICONS[id]
              return (
                <button
                  key={id}
                  className={'portfolio-style-icon-btn' + (id === activeIconId ? ' active' : '')}
                  style={{ color: activeColor }}
                  onClick={() => onChange({ icon: id })}
                  aria-label={t(`customize.portfolioStyle.icon.${id}`) ?? id}
                  title={t(`customize.portfolioStyle.icon.${id}`) ?? undefined}
                >
                  <Icon size={16} />
                </button>
              )
            })}
          </div>
          <div className="portfolio-style-heading">{t('customize.portfolioStyle.colorHeading')}</div>
          <div className="portfolio-style-color-grid">
            {PORTFOLIO_COLORS.map((c, i) => (
              <button
                key={c}
                className={'portfolio-style-color-btn' + (c === activeColor ? ' active' : '')}
                style={{ background: c }}
                onClick={() => onChange({ color: c })}
                aria-label={t('customize.portfolioStyle.colorOption', { n: i + 1 }) ?? c}
                title={t('customize.portfolioStyle.colorOption', { n: i + 1 }) ?? undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
