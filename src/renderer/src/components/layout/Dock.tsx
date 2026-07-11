import { Reorder, useDragControls } from 'motion/react'
import { useAppState, type DockCardId } from '@renderer/state/AppStateContext'
import RiskCard from '@renderer/components/dock/RiskCard'
import OptionsCard from '@renderer/components/dock/OptionsCard'
import NewsCard from '@renderer/components/dock/NewsCard'
import type { DockCardProps } from '@renderer/components/dock/dockCardProps'

const CARD_COMPONENTS: Record<DockCardId, (props: DockCardProps) => JSX.Element> = {
  risk: RiskCard,
  options: OptionsCard,
  news: NewsCard
}

/** Swaps `id` with its adjacent VISIBLE neighbor, preserving hidden cards' positions in the full order. */
function moveCardInOrder(order: DockCardId[], hidden: DockCardId[], id: DockCardId, dir: -1 | 1): DockCardId[] {
  const visible = order.filter((c) => !hidden.includes(c))
  const swapWith = visible[visible.indexOf(id) + dir]
  if (!swapWith) return order
  const next = [...order]
  const a = next.indexOf(id)
  const b = next.indexOf(swapWith)
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

/** Splices a reordered VISIBLE subset back into the full order, leaving hidden cards' slots untouched. */
function applyVisibleReorder(order: DockCardId[], hidden: DockCardId[], newVisibleOrder: DockCardId[]): DockCardId[] {
  const hiddenSet = new Set(hidden)
  let vi = 0
  return order.map((id) => (hiddenSet.has(id) ? id : newVisibleOrder[vi++]))
}

function DockCardItem({ id, index, visibleCount }: { id: DockCardId; index: number; visibleCount: number }): JSX.Element {
  const { dockOrder, dockHidden, setDockOrder, openCardOverlay } = useAppState()
  const dragControls = useDragControls()
  const Card = CARD_COMPONENTS[id]

  return (
    <Reorder.Item
      as="div"
      value={id}
      dragListener={false}
      dragControls={dragControls}
      layout="position"
      className="dock-item"
      whileDrag={{ scale: 1.02, boxShadow: 'var(--shadow-soft)', zIndex: 5 }}
    >
      <Card
        dragControls={dragControls}
        onExpand={() => openCardOverlay(id)}
        onMoveUp={() => setDockOrder(moveCardInOrder(dockOrder, dockHidden, id, -1))}
        onMoveDown={() => setDockOrder(moveCardInOrder(dockOrder, dockHidden, id, 1))}
        canMoveUp={index > 0}
        canMoveDown={index < visibleCount - 1}
      />
    </Reorder.Item>
  )
}

export default function Dock(): JSX.Element {
  const { dockOrder, dockHidden, setDockOrder } = useAppState()
  const visible = dockOrder.filter((id) => !dockHidden.includes(id))

  return (
    <aside className="dock">
      <Reorder.Group
        as="div"
        axis="y"
        className="dock-list"
        values={visible}
        onReorder={(newVisibleOrder: DockCardId[]) =>
          setDockOrder(applyVisibleReorder(dockOrder, dockHidden, newVisibleOrder))
        }
      >
        {visible.map((id, index) => (
          <DockCardItem key={id} id={id} index={index} visibleCount={visible.length} />
        ))}
      </Reorder.Group>
    </aside>
  )
}
