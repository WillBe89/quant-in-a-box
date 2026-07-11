import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './tooltip.css'

interface TooltipProps {
  label: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}

const GAP = 8

interface Point {
  x: number
  y: number
}

function anchorPoint(rect: DOMRect, side: 'top' | 'bottom' | 'left' | 'right'): Point {
  switch (side) {
    case 'top':
      return { x: rect.left + rect.width / 2, y: rect.top - GAP }
    case 'bottom':
      return { x: rect.left + rect.width / 2, y: rect.bottom + GAP }
    case 'left':
      return { x: rect.left - GAP, y: rect.top + rect.height / 2 }
    case 'right':
      return { x: rect.right + GAP, y: rect.top + rect.height / 2 }
  }
}

/** Wraps any trigger (usually an icon button) with a small styled tooltip that
 *  shows on hover/focus. `label` is expected to already be a translated string —
 *  callers pass `t('...')`, so the tooltip content stays fully i18n-integrated.
 *  Rendered through a portal into `document.body` at a fixed viewport position,
 *  so an ancestor's `overflow: hidden` (stat tiles, scrollable panels, dock cards)
 *  can never clip it — this was the root cause of the tooltip-clipping bug that
 *  kept resurfacing in one new container after another. */
export default function Tooltip({ label, children, side = 'top' }: TooltipProps): JSX.Element {
  const [visible, setVisible] = useState(false)
  const [point, setPoint] = useState<Point | null>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)

  const updatePosition = (): void => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (rect) setPoint(anchorPoint(rect, side))
  }

  const show = (): void => {
    updatePosition()
    setVisible(true)
  }
  const hide = (): void => setVisible(false)

  useEffect(() => {
    if (!visible) return
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  return (
    <span ref={wrapRef} className="tooltip-wrap" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible &&
        label &&
        point &&
        createPortal(
          <span
            className={`tooltip-bubble tooltip-${side}`}
            role="tooltip"
            style={{ left: point.x, top: point.y }}
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  )
}
