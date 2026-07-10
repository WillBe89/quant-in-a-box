import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import { getLesson } from './lessons'

export default function InfoIcon({ lessonId }: { lessonId: string }): JSX.Element {
  const { t } = useTranslation()
  const { openAcademy } = useAppState()
  const lesson = getLesson(lessonId)
  const tooltip = lesson
    ? t('academy.infoTooltip', { title: t(`academy.lessons.${lessonId}.title`) })
    : t('academy.infoTooltipGeneric')

  return (
    <button
      className="info-icon"
      title={tooltip}
      aria-label={tooltip}
      onClick={(e) => {
        e.stopPropagation()
        openAcademy(lessonId)
      }}
    >
      i
    </button>
  )
}
