import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/**
 * Reusable ref+mousedown-outside-click-to-close pattern, extracted from
 * PortfolioPicker's original inline version (see portfolio/PortfolioPicker.tsx). Also closes
 * on Escape — a capability PortfolioPicker's own popover doesn't need but a chart-slot
 * popover does, since it wants a clean way to back out without hunting for empty space to
 * click.
 */
export function useDismissablePopover(
  open: boolean,
  onClose: () => void
): { triggerRef: RefObject<HTMLElement>; popoverRef: RefObject<HTMLElement> } {
  const triggerRef = useRef<HTMLElement>(null)
  const popoverRef = useRef<HTMLElement>(null)
  // Always-current onClose without needing it in the effect's deps — avoids tearing down
  // and re-attaching the document listeners on every render while the popover stays open.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent): void {
      const target = e.target as Node
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      onCloseRef.current()
    }
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return { triggerRef, popoverRef }
}
