import InfoIcon from '@renderer/academy/InfoIcon'
import { IconChevronDown } from '@renderer/components/icons/Icons'

export default function CardHead({
  title,
  lessonId,
  collapsed,
  onToggle
}: {
  title: string
  lessonId?: string
  collapsed: boolean
  onToggle: () => void
}): JSX.Element {
  return (
    <div className="card-head" onClick={onToggle} role="button" aria-expanded={!collapsed}>
      <div className="card-head-title">
        <h3>{title}</h3>
        {lessonId && <InfoIcon lessonId={lessonId} />}
      </div>
      <IconChevronDown size={13} className="chev" />
    </div>
  )
}
