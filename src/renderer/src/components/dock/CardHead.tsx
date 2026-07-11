import { useTranslation } from 'react-i18next'
import type { DragControls } from 'motion/react'
import InfoIcon from '@renderer/academy/InfoIcon'
import Tooltip from '@renderer/components/ui/Tooltip'
import { IconChevronDown, IconExpand, IconGripDots } from '@renderer/components/icons/Icons'

export default function CardHead({
  title,
  lessonId,
  collapsed,
  onToggle,
  onExpand,
  dragControls,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}: {
  title: string
  lessonId?: string
  collapsed: boolean
  onToggle: () => void
  onExpand?: () => void
  dragControls?: DragControls
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}): JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="card-head">
      {dragControls && (
        <Tooltip label={t('card.dragHandle') ?? ''} side="right">
          <span
            className="card-drag-handle"
            aria-hidden="true"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <IconGripDots size={13} />
          </span>
        </Tooltip>
      )}
      <div
        className="card-head-title"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <h3>{title}</h3>
        {lessonId && <InfoIcon lessonId={lessonId} />}
      </div>
      <div className="card-head-actions">
        {(onMoveUp || onMoveDown) && (
          <>
            <Tooltip label={t('card.moveUp') ?? ''} side="right">
              <button
                className="card-action-btn"
                disabled={!canMoveUp}
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveUp?.()
                }}
                aria-label={t('card.moveUp') ?? undefined}
              >
                <IconChevronDown size={12} className="card-move-up" />
              </button>
            </Tooltip>
            <Tooltip label={t('card.moveDown') ?? ''} side="right">
              <button
                className="card-action-btn"
                disabled={!canMoveDown}
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveDown?.()
                }}
                aria-label={t('card.moveDown') ?? undefined}
              >
                <IconChevronDown size={12} />
              </button>
            </Tooltip>
          </>
        )}
        {onExpand && (
          <Tooltip label={t('card.expand') ?? ''} side="right">
            <button
              className="card-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                onExpand()
              }}
              aria-label={t('card.expand') ?? undefined}
            >
              <IconExpand size={12} />
            </button>
          </Tooltip>
        )}
        <button
          className="card-action-btn"
          onClick={onToggle}
          aria-label={title}
          aria-expanded={!collapsed}
        >
          <IconChevronDown size={13} className="chev" />
        </button>
      </div>
    </div>
  )
}
