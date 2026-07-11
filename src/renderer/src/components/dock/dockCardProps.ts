import type { DragControls } from 'motion/react'

export interface DockCardProps {
  dragControls: DragControls
  onExpand: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}
