import { useCallback, useRef } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

const KEY_STEP = 16

/**
 * A draggable divider controlling one numeric size value. `invert` should be true when the
 * controlled value belongs to the pane AFTER the handle (to its right/below) — dragging toward
 * that pane then correctly shrinks it, matching the physical direction of the drag.
 */
export default function ResizeHandle({
  axis,
  value,
  onChange,
  min,
  max,
  invert = false,
  ariaLabel
}: {
  axis: 'horizontal' | 'vertical'
  value: number
  onChange: (next: number) => void
  min: number
  max: number
  invert?: boolean
  ariaLabel: string
}): JSX.Element {
  const startPos = useRef(0)
  const startValue = useRef(0)

  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max])

  // Grid columns physically mirror under dir="rtl", so a horizontal handle's "trailing pane"
  // (the pane the `invert` prop refers to) sits on the opposite physical side from LTR — flip
  // the effective invert so dragging/keys still match the pane's actual on-screen position.
  const effectiveInvert = useCallback(() => {
    if (axis !== 'horizontal') return invert
    const isRtl = document.documentElement.getAttribute('dir') === 'rtl'
    return isRtl ? !invert : invert
  }, [axis, invert])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault()
      startPos.current = axis === 'horizontal' ? e.clientX : e.clientY
      startValue.current = value
      const inv = effectiveInvert()
      function onMove(ev: PointerEvent): void {
        const pos = axis === 'horizontal' ? ev.clientX : ev.clientY
        const delta = pos - startPos.current
        const signed = inv ? -delta : delta
        onChange(clamp(startValue.current + signed))
      }
      function onUp(): void {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [axis, value, effectiveInvert, onChange, clamp]
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const decreaseKey = axis === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
      const increaseKey = axis === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
      let dir = 0
      if (e.key === decreaseKey) dir = -1
      else if (e.key === increaseKey) dir = 1
      else return
      e.preventDefault()
      const signed = effectiveInvert() ? -dir : dir
      onChange(clamp(value + signed * KEY_STEP))
    },
    [axis, effectiveInvert, value, onChange, clamp]
  )

  return (
    <div
      className={'resize-handle resize-handle-' + axis}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      role="separator"
      aria-orientation={axis === 'horizontal' ? 'vertical' : 'horizontal'}
      aria-label={ariaLabel}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
    />
  )
}
