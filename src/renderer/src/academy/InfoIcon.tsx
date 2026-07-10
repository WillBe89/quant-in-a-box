import { useAppState } from '@renderer/state/AppStateContext'
import { getLesson } from './lessons'

export default function InfoIcon({ lessonId }: { lessonId: string }): JSX.Element {
  const { openAcademy } = useAppState()
  const lesson = getLesson(lessonId)
  return (
    <button
      className="info-icon"
      title={lesson ? `Learn: ${lesson.title}` : 'Learn more'}
      aria-label={lesson ? `Learn about ${lesson.title}` : 'Learn more'}
      onClick={(e) => {
        e.stopPropagation()
        openAcademy(lessonId)
      }}
    >
      i
    </button>
  )
}
