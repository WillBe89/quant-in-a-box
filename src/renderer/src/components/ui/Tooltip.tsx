import { useState, type ReactNode } from 'react'
import './tooltip.css'

interface TooltipProps {
  label: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}

/** Wraps any trigger (usually an icon button) with a small styled tooltip that
 *  shows on hover/focus. `label` is expected to already be a translated string —
 *  callers pass `t('...')`, so the tooltip content stays fully i18n-integrated. */
export default function Tooltip({ label, children, side = 'top' }: TooltipProps): JSX.Element {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className="tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && label && (
        <span className={`tooltip-bubble tooltip-${side}`} role="tooltip">
          {label}
        </span>
      )}
    </span>
  )
}
