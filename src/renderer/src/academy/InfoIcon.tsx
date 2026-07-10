import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import { getLesson } from './lessons'
import { IconInfo } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'

export default function InfoIcon({ lessonId }: { lessonId: string }): JSX.Element {
  const { t } = useTranslation()
  const { openAcademy } = useAppState()
  const lesson = getLesson(lessonId)
  const tooltip = lesson
    ? t('academy.infoTooltip', { title: t(`academy.lessons.${lessonId}.title`) })
    : t('academy.infoTooltipGeneric')

  return (
    <Tooltip label={tooltip}>
      <button
        className="info-icon"
        aria-label={tooltip}
        onClick={(e) => {
          e.stopPropagation()
          openAcademy(lessonId)
        }}
      >
        <IconInfo size={11} />
      </button>
    </Tooltip>
  )
}
