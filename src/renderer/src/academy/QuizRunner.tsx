import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { QuizQuestion } from '@renderer/academy/quizQuestions'
import { MODULE_TITLE_KEY, type ModuleId } from '@renderer/academy/modules'
import ModuleStudyScreen from '@renderer/academy/ModuleStudyScreen'
import { useAppState } from '@renderer/state/AppStateContext'
import { IconAlertTriangle, IconChevronDown, IconClose, IconInfo } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import OverlayPanel from '@renderer/components/ui/OverlayPanel'

/** Runs one sampled quiz attempt, one question at a time. The anti-AI-cheating disclaimer is
 *  shown as a full block before the first question AND as a small persistent footer on every
 *  question screen — mirroring this app's established "always-rendered, never dismiss-once"
 *  disclaimer philosophy (see the Portfolio AI Insights disclaimer in PortfolioDashboardTab.tsx,
 *  `.portfolio-ai-disclaimer` — a plain always-rendered block, not a checkbox/dismiss pattern).
 *
 *  Phase 19 update: the big isFirst-only block is now collapsible/dismissible (full/compact/
 *  hidden via quizDisclaimerMode, mirroring ChartSlot's forecast disclaimer treatment) — this is
 *  safe specifically because the small per-question footer below is NOT gated by that mode and
 *  always renders regardless, so the user is never left with zero reminder even at 'hidden'.
 *  Phase 19 also adds an in-quiz study reference: a header button opens the module's
 *  ModuleStudyScreen content (contentOnly, no Start/Skip actions) as a layered overlay on top of
 *  the quiz via OverlayPanel — a purely visual layer that never touches `index`/`answers`, so
 *  closing it always resumes the exact same question with the same selections intact. */
export default function QuizRunner({
  moduleId,
  questions,
  onSubmit,
  onExit
}: {
  moduleId: ModuleId
  questions: QuizQuestion[]
  onSubmit: (correctCount: number, totalCount: number) => void
  onExit: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const { t: tq } = useTranslation('academy-quiz')
  const { quizDisclaimerMode, setQuizDisclaimerMode } = useAppState()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [studyOpen, setStudyOpen] = useState(false)

  const total = questions.length
  const current = questions[index]
  const isFirst = index === 0
  const isLast = index === total - 1
  const selected = answers[current.id]
  const allAnswered = questions.every((q) => answers[q.id] !== undefined)

  function selectOption(optionIndex: number): void {
    setAnswers((prev) => ({ ...prev, [current.id]: optionIndex }))
  }

  function handleSubmit(): void {
    const correctCount = questions.filter((q) => answers[q.id] === q.correctIndex).length
    onSubmit(correctCount, total)
  }

  return (
    <div className="quiz-runner">
      <div className="quiz-runner-head">
        <span className="quiz-progress">{t('academy.quiz.questionOf', { n: index + 1, total })}</span>
        <div className="quiz-runner-head-actions">
          <Tooltip label={t('academy.quiz.studyBtn') ?? ''}>
            <button
              className="icon-btn"
              onClick={() => setStudyOpen(true)}
              aria-label={t('academy.quiz.studyBtn') ?? undefined}
            >
              <IconInfo size={14} />
            </button>
          </Tooltip>
          <button className="icon-btn" onClick={onExit} aria-label={t('academy.quiz.exitBtn') ?? undefined}>
            <IconClose size={14} />
          </button>
        </div>
      </div>

      {isFirst && quizDisclaimerMode === 'full' && (
        <div className="quiz-disclaimer-block">
          <IconAlertTriangle size={18} />
          <div className="quiz-disclaimer-body">
            <div className="quiz-disclaimer-title">{t('academy.quiz.disclaimerTitle')}</div>
            <p>{t('academy.quiz.disclaimerBody')}</p>
          </div>
          <div className="quiz-disclaimer-actions">
            <Tooltip label={t('academy.quiz.disclaimerCollapse') ?? ''}>
              <button
                className="card-action-btn"
                onClick={() => setQuizDisclaimerMode('compact')}
                aria-label={t('academy.quiz.disclaimerCollapse') ?? undefined}
              >
                <IconChevronDown size={12} className="quiz-disclaimer-chev-collapse" />
              </button>
            </Tooltip>
            <Tooltip label={t('academy.quiz.disclaimerDismiss') ?? ''}>
              <button
                className="card-action-btn"
                onClick={() => setQuizDisclaimerMode('hidden')}
                aria-label={t('academy.quiz.disclaimerDismiss') ?? undefined}
              >
                <IconClose size={11} />
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {isFirst && quizDisclaimerMode === 'compact' && (
        <div className="quiz-disclaimer-block quiz-disclaimer-compact">
          <IconAlertTriangle size={13} />
          <span className="quiz-disclaimer-compact-text">{t('academy.quiz.disclaimerCompact')}</span>
          <div className="quiz-disclaimer-actions">
            <Tooltip label={t('academy.quiz.disclaimerExpand') ?? ''}>
              <button
                className="card-action-btn"
                onClick={() => setQuizDisclaimerMode('full')}
                aria-label={t('academy.quiz.disclaimerExpand') ?? undefined}
              >
                <IconChevronDown size={12} />
              </button>
            </Tooltip>
            <Tooltip label={t('academy.quiz.disclaimerDismiss') ?? ''}>
              <button
                className="card-action-btn"
                onClick={() => setQuizDisclaimerMode('hidden')}
                aria-label={t('academy.quiz.disclaimerDismiss') ?? undefined}
              >
                <IconClose size={11} />
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      <div className="quiz-question">
        <h3>{tq(`${current.id}.prompt`)}</h3>
        <div className="quiz-options">
          {Array.from({ length: current.optionCount }, (_, i) => (
            <button
              key={i}
              className={'quiz-option' + (selected === i ? ' selected' : '')}
              onClick={() => selectOption(i)}
              aria-pressed={selected === i}
            >
              {tq(`${current.id}.options.${i}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="quiz-runner-nav">
        <button className="quiz-nav-btn" disabled={isFirst} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
          {t('academy.quiz.prevBtn')}
        </button>
        {isLast ? (
          <button className="quiz-nav-btn primary" disabled={!allAnswered} onClick={handleSubmit}>
            {t('academy.quiz.submitBtn')}
          </button>
        ) : (
          <button
            className="quiz-nav-btn primary"
            disabled={selected === undefined}
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          >
            {t('academy.quiz.nextBtn')}
          </button>
        )}
      </div>

      <div className="quiz-disclaimer-footer">
        <IconAlertTriangle size={12} />
        {t('academy.quiz.disclaimerFooter')}
      </div>

      <OverlayPanel
        open={studyOpen}
        onClose={() => setStudyOpen(false)}
        ariaLabel={t(MODULE_TITLE_KEY[moduleId])}
        zIndex={120}
        className="quiz-study-overlay"
      >
        <div className="overlay-header">
          <div className="overlay-title">
            <h2>{t(MODULE_TITLE_KEY[moduleId])}</h2>
          </div>
          <Tooltip label={t('common.close') ?? ''}>
            <button className="icon-btn" onClick={() => setStudyOpen(false)} aria-label={t('common.close') ?? undefined}>
              <IconClose size={15} />
            </button>
          </Tooltip>
        </div>
        <div className="overlay-body">
          <ModuleStudyScreen moduleId={moduleId} contentOnly />
        </div>
      </OverlayPanel>
    </div>
  )
}
