import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAcademyProgress } from '@renderer/state/AppStateContext'
import {
  MODULE_ID_ORDER,
  MODULE_TITLE_KEY,
  getModule,
  lessonIdsForModule,
  targetSampleSize,
  type ModuleId
} from '@renderer/academy/modules'
import { QUIZ_QUESTIONS, type QuizQuestion } from '@renderer/academy/quizQuestions'
import { sampleFinalExam, sampleModuleQuiz } from '@renderer/lib/academyScoring'
import { formatCooldownRemaining } from '@renderer/lib/academyCooldown'
import { BADGE_STYLES } from '@renderer/lib/badgeStyle'
import BadgeShelf from './BadgeShelf'
import QuizRunner from './QuizRunner'
import QuizResults from './QuizResults'

interface ActiveQuiz {
  moduleId: ModuleId
  questions: QuizQuestion[]
}

interface LastResult {
  moduleId: ModuleId
  correctCount: number
  totalCount: number
  scorePct: number
  passed: boolean
  justEarned: boolean
}

function sampleQuizFor(moduleId: ModuleId): QuizQuestion[] {
  const mod = getModule(moduleId)
  const target = targetSampleSize(moduleId)
  return moduleId === 'final'
    ? sampleFinalExam(QUIZ_QUESTIONS, mod.categories, target)
    : sampleModuleQuiz(QUIZ_QUESTIONS, mod.categories[0], target)
}

/** Top-level view for AcademyPanel's Modules mode: the badge shelf, the 4 subject-module +
 *  Final Exam cards, and the in-progress quiz/results flow. Quiz-in-progress state is
 *  deliberately local (not lifted to AppStateContext) — like every other Academy sub-view, it
 *  resets if the panel is closed mid-attempt, which is fine since nothing is persisted until
 *  a full attempt is submitted. */
export default function ModulesHome(): JSX.Element {
  const { t } = useTranslation()
  const { progress, isModuleUnlocked, remainingCooldownMs, recordAttempt } = useAcademyProgress()
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null)
  const [lastResult, setLastResult] = useState<LastResult | null>(null)
  const [celebrating, setCelebrating] = useState<ModuleId | null>(null)
  const [, forceTick] = useState(0)

  // Keep cooldown countdown labels live without requiring a panel close/reopen.
  useEffect(() => {
    const anyCooldown = MODULE_ID_ORDER.some((id) => remainingCooldownMs(id) > 0)
    if (!anyCooldown) return undefined
    const interval = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(interval)
  }, [progress, remainingCooldownMs])

  function startQuiz(moduleId: ModuleId): void {
    setLastResult(null)
    setActiveQuiz({ moduleId, questions: sampleQuizFor(moduleId) })
  }

  function handleSubmit(correctCount: number, totalCount: number): void {
    if (!activeQuiz) return
    const { moduleId } = activeQuiz
    const outcome = recordAttempt(moduleId, correctCount, totalCount)
    setLastResult({
      moduleId,
      correctCount,
      totalCount,
      scorePct: outcome.scorePct,
      passed: outcome.passed,
      justEarned: outcome.justEarned
    })
    setActiveQuiz(null)
    if (outcome.justEarned) setCelebrating(moduleId)
  }

  if (activeQuiz) {
    return (
      <div className="modules-home">
        <QuizRunner questions={activeQuiz.questions} onSubmit={handleSubmit} onExit={() => setActiveQuiz(null)} />
      </div>
    )
  }

  if (lastResult) {
    const mod = lastResult.moduleId
    const record = progress[mod]
    const title = t(MODULE_TITLE_KEY[mod])
    const cooldown = remainingCooldownMs(mod)
    return (
      <div className="modules-home">
        <BadgeShelf celebratingModuleId={celebrating} />
        <QuizResults
          moduleId={mod}
          moduleTitle={title}
          correctCount={lastResult.correctCount}
          totalCount={lastResult.totalCount}
          scorePct={lastResult.scorePct}
          passed={lastResult.passed}
          modulePassed={record?.passed === true}
          justEarned={lastResult.justEarned}
          attemptCount={record?.attemptCount ?? 0}
          bestScorePct={record?.bestScorePct ?? 0}
          lastAttemptAtIso={new Date(record?.lastAttemptAt ?? Date.now()).toISOString()}
          cooldownLabel={formatCooldownRemaining(cooldown)}
          canRetakeNow={cooldown <= 0}
          showUnlockAnimation={celebrating === mod}
          onContinue={() => setCelebrating(null)}
          onRetake={() => startQuiz(mod)}
          onBackToModules={() => setLastResult(null)}
        />
      </div>
    )
  }

  return (
    <div className="modules-home">
      <BadgeShelf celebratingModuleId={celebrating} />
      <div className="module-card-list">
        {MODULE_ID_ORDER.map((id) => {
          const record = progress[id]
          const unlocked = isModuleUnlocked(id)
          const cooldown = remainingCooldownMs(id)
          const lessonCount = lessonIdsForModule(id).length
          const { Icon, accent } = BADGE_STYLES[id]
          const title = t(MODULE_TITLE_KEY[id])
          const canStart = unlocked && cooldown <= 0

          return (
            <div key={id} className={'module-card' + (unlocked ? '' : ' locked')}>
              <div className="module-card-icon" style={{ color: accent }}>
                <Icon size={28} />
              </div>
              <div className="module-card-body">
                <div className="module-card-title">{title}</div>
                <div className="module-card-sub">{t('academy.modules.lessonCount', { count: lessonCount })}</div>
                {record && record.attemptCount > 0 && (
                  <div className="module-card-stats">
                    {record.passed && <span className="module-card-passed">{t('academy.modules.passedLabel')}</span>}
                    <span>{t('academy.modules.bestScore', { pct: record.bestScorePct })}</span>
                    <span>{t('academy.modules.attempts', { count: record.attemptCount })}</span>
                  </div>
                )}
                {!unlocked && <div className="module-card-hint">{t('academy.modules.lockedFinalHint')}</div>}
                {unlocked && cooldown > 0 && (
                  <div className="module-card-hint">
                    {t('academy.modules.cooldownHint', { time: formatCooldownRemaining(cooldown) })}
                  </div>
                )}
              </div>
              <button className="quiz-nav-btn primary" disabled={!canStart} onClick={() => startQuiz(id)}>
                {record?.passed ? t('academy.modules.retakeBtn') : t('academy.modules.startBtn')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
