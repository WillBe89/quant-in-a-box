import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { backdropFade, fadeScaleIn } from '@renderer/lib/motion'
import './overlay-panel.css'

interface OverlayPanelProps {
  open: boolean
  onClose: () => void
  ariaLabel: string
  zIndex?: number
  /** Set only for a shared-element morph (e.g. a dock card growing into this overlay). */
  layoutId?: string
  className?: string
  children: ReactNode
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Instances currently open, most-recently-opened last — only the last one responds to Escape. */
const openStack: symbol[] = []

export default function OverlayPanel({
  open,
  onClose,
  ariaLabel,
  zIndex = 100,
  layoutId,
  className,
  children
}: OverlayPanelProps): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null)
  const instanceId = useRef(Symbol('overlay')).current

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    openStack.push(instanceId)

    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        if (openStack[openStack.length - 1] === instanceId) onClose()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    dialogRef.current?.focus()

    return () => {
      window.removeEventListener('keydown', onKey)
      const idx = openStack.indexOf(instanceId)
      if (idx !== -1) openStack.splice(idx, 1)
      previouslyFocused?.focus?.()
    }
  }, [open, onClose, instanceId])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overlay-scrim"
          style={{ zIndex }}
          onClick={onClose}
          initial={backdropFade.initial}
          animate={backdropFade.animate}
          exit={backdropFade.exit}
        >
          <motion.div
            className={className ? `overlay-panel ${className}` : 'overlay-panel'}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            tabIndex={-1}
            ref={dialogRef}
            layoutId={layoutId}
            layout={Boolean(layoutId)}
            onClick={(e) => e.stopPropagation()}
            initial={layoutId ? undefined : fadeScaleIn.initial}
            animate={layoutId ? undefined : fadeScaleIn.animate}
            exit={layoutId ? undefined : fadeScaleIn.exit}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
