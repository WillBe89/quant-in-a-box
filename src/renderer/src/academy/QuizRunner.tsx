import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { QuizQuestion } from '@renderer/academy/quizQuestions'
import { IconAlertTriangle, IconClose } from '@renderer/components/icons/Icons'

/** Runs one sampled quiz attempt, one question at a time. The anti-AI-cheating disclaimer is
 *  shown as a full block before the first question AND as a small persistent footer on every
 *  question screen — mirroring this app's established "always-rendered, never dismiss-once"
 *  disclaimer philosophy (see the Portfolio AI Insights disclaimer in PortfolioDashboardTab.tsx,
 *  `.portfolio-ai-disclaimer` — a plain always-rendered block, not a checkbox/dismiss pattern). */
export default function QuizRunner({
  questions,
  onSubmit,
  onExit
}: {
  questions: QuizQuestion[]
  onSubmit: (correctCount: number, totalCount: number) => void
  onExit: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const { t: tq } = useTranslation('academy-quiz')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})

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
        <button className="icon-btn" onClick={onExit} aria-label={t('academy.quiz.exitBtn') ?? undefined}>
          <IconClose size={14} />
        </button>
      </div>

      {isFirst && (
        <div className="quiz-disclaimer-block">
          <IconAlertTriangle size={18} />
          <div>
            <div className="quiz-disclaimer-title">{t('academy.quiz.disclaimerTitle')}</div>
            <p>{t('academy.quiz.disclaimerBody')}</p>
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
    </div>
  )
}
