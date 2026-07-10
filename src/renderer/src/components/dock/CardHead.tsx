import InfoIcon from '@renderer/academy/InfoIcon'

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
    <div className="card-head" onClick={onToggle}>
      <div className="card-head-title">
        <h3>{title}</h3>
        {lessonId && <InfoIcon lessonId={lessonId} />}
      </div>
      <span className="chev">{collapsed ? '▸' : '▾'}</span>
    </div>
  )
}
