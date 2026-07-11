import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import type { ModuleId } from '@renderer/academy/modules'
import { BADGE_STYLES } from '@renderer/lib/badgeStyle'
import { badgeUnlockPop } from '@renderer/lib/motion'
import { IconCheck, IconFaceNeutral } from '@renderer/components/icons/Icons'
import CertificateNamePrompt from './CertificateNamePrompt'

export default function QuizResults({
  moduleId,
  moduleTitle,
  correctCount,
  totalCount,
  scorePct,
  passed,
  modulePassed,
  justEarned,
  attemptCount,
  bestScorePct,
  lastAttemptAtIso,
  cooldownLabel,
  canRetakeNow,
  showUnlockAnimation,
  onContinue,
  onRetake,
  onBackToModules
}: {
  moduleId: ModuleId
  moduleTitle: string
  correctCount: number
  totalCount: number
  scorePct: number
  passed: boolean
  modulePassed: boolean
  justEarned: boolean
  attemptCount: number
  bestScorePct: number
  lastAttemptAtIso: string
  cooldownLabel: string
  canRetakeNow: boolean
  showUnlockAnimation: boolean
  onContinue: () => void
  onRetake: () => void
  onBackToModules: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const { Icon: BadgeIcon, accent } = BADGE_STYLES[moduleId]

  return (
    <div className="quiz-results">
      <h3>{t('academy.results.heading')}</h3>

      {justEarned && showUnlockAnimation && (
        <div className="quiz-results-unlock">
          <motion.div
            layoutId={`badge-glyph-${moduleId}`}
            layout
            transition={badgeUnlockPop}
            className="quiz-results-badge-glyph"
            style={{ color: accent }}
          >
            <BadgeIcon size={56} />
          </motion.div>
          <div className="quiz-results-unlock-title">{t('academy.results.badgeEarnedTitle')}</div>
        </div>
      )}

      <div className={'quiz-results-banner' + (passed ? ' pass' : ' fail')}>
        {passed ? <IconCheck size={18} /> : <IconFaceNeutral size={18} />}
        <div>
          <div className="quiz-results-banner-title">
            {passed ? t('academy.results.passedTitle') : t('academy.results.failedTitle')}
          </div>
          <p>{passed ? t('academy.results.passedBody', { pct: scorePct }) : t('academy.results.failedBody')}</p>
        </div>
      </div>

      <div className="quiz-results-score tnum">
        {t('academy.results.scoreLine', { correct: correctCount, total: totalCount, pct: scorePct })}
      </div>

      <div className="quiz-results-meta">
        <span>{t('academy.modules.attempts', { count: attemptCount })}</span>
        <span>{t('academy.modules.bestScore', { pct: bestScorePct })}</span>
      </div>

      {!canRetakeNow && cooldownLabel && (
        <div className="quiz-results-cooldown">{t('academy.results.cooldownNotice', { time: cooldownLabel })}</div>
      )}

      {modulePassed && (
        <CertificateNamePrompt
          moduleId={moduleId}
          moduleTitle={moduleTitle}
          earnedAtIso={lastAttemptAtIso}
          className="quiz-results-certificate"
        />
      )}

      <div className="quiz-results-actions">
        {justEarned && showUnlockAnimation ? (
          <button className="quiz-nav-btn primary" onClick={onContinue}>
            {t('academy.results.continueBtn')}
          </button>
        ) : (
          <>
            <button className="quiz-nav-btn" onClick={onBackToModules}>
              {t('academy.results.backBtn')}
            </button>
            {canRetakeNow && (
              <button className="quiz-nav-btn primary" onClick={onRetake}>
                {t('academy.results.retakeBtn')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
