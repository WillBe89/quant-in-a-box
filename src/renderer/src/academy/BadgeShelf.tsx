import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAcademyProgress } from '@renderer/state/AppStateContext'
import { MODULE_ID_ORDER, MODULE_TITLE_KEY, type ModuleId } from '@renderer/academy/modules'
import { BADGE_STYLES } from '@renderer/lib/badgeStyle'
import { badgeUnlockPop } from '@renderer/lib/motion'
import { IconLock } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import CertificateNamePrompt from './CertificateNamePrompt'

/** 5-slot row at the top of Modules mode. Earned slots render in full color with a certificate
 *  download action; locked (not-yet-earned) slots are dimmed with a small lock glyph and a
 *  tooltip explaining what's needed. `celebratingModuleId` suppresses that one slot's own glyph
 *  while QuizResults is showing the same badge mid shared-element-morph unlock animation (see
 *  academy/ModulesHome.tsx), so the two never render the same motion `layoutId` at once. */
export default function BadgeShelf({ celebratingModuleId }: { celebratingModuleId?: ModuleId | null }): JSX.Element {
  const { t } = useTranslation()
  const { progress, isModuleUnlocked } = useAcademyProgress()

  return (
    <div className="badge-shelf">
      {MODULE_ID_ORDER.map((id) => {
        const record = progress[id]
        const earned = record?.passed === true
        const title = t(MODULE_TITLE_KEY[id])
        const { Icon, accent } = BADGE_STYLES[id]
        const hidden = celebratingModuleId === id

        const tooltip = earned
          ? t('academy.badges.earnedOn', { date: new Date(record!.lastAttemptAt).toLocaleDateString() })
          : id === 'final' && !isModuleUnlocked('final')
            ? t('academy.badges.lockedFinalHint')
            : t('academy.badges.lockedHint', { module: title })

        return (
          <div key={id} className={'badge-slot' + (earned ? ' earned' : ' locked')}>
            <Tooltip label={tooltip}>
              <div className="badge-slot-glyph-wrap" style={earned ? { color: accent } : undefined}>
                {!hidden && earned && (
                  <motion.div layoutId={`badge-glyph-${id}`} layout transition={badgeUnlockPop}>
                    <Icon size={40} />
                  </motion.div>
                )}
                {!hidden && !earned && <Icon size={40} />}
                {!earned && (
                  <span className="badge-slot-lock">
                    <IconLock size={12} />
                  </span>
                )}
              </div>
            </Tooltip>
            <div className="badge-slot-title">{title}</div>
            {earned && (
              <CertificateNamePrompt
                moduleId={id}
                moduleTitle={title}
                earnedAtIso={new Date(record!.lastAttemptAt).toISOString()}
                className="badge-slot-certificate"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
