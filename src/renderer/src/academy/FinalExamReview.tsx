import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LESSONS, type LessonCategory } from './lessons'
import { MODULE_TITLE_KEY } from './modules'

// Same 4-category order AcademyPanel's Library view groups lessons in — reused here rather
// than re-derived so this quick-review list reads in the same order the user already saw them.
const CATEGORY_ORDER: LessonCategory[] = ['assetTypes', 'trend', 'risk', 'options']

const CATEGORY_LABEL_KEY: Record<LessonCategory, string> = {
  assetTypes: 'academy.categoryAssetTypes',
  trend: 'academy.categoryTrend',
  risk: 'academy.categoryRisk',
  options: 'academy.categoryOptions'
}

/** Lighter pre-quiz screen for the Final Exam only. Unlike ModuleStudyScreen (full lesson
 *  content for a first-time study pass), the Final Exam is gated behind passing all 4 subject
 *  modules already, so the user has seen every lesson's full study screen once by the time they
 *  reach it — this is a fast recap, one line per lesson, not a re-read of the whole library.
 *  Same non-gated philosophy as ModuleStudyScreen: Skip and Start are both immediately
 *  clickable, nothing here is timed. */
export default function FinalExamReview({
  onStartQuiz,
  onSkip
}: {
  onStartQuiz: () => void
  onSkip: () => void
}): JSX.Element {
  const { t } = useTranslation()

  const grouped = useMemo(() => {
    const map = new Map<LessonCategory, typeof LESSONS>()
    for (const cat of CATEGORY_ORDER) map.set(cat, [])
    for (const lesson of LESSONS) map.get(lesson.category)?.push(lesson)
    return map
  }, [])

  return (
    <div className="module-study-screen final-exam-review">
      <div className="module-study-header">
        <div className="academy-eyebrow">{t('academy.study.finalHeading')}</div>
        <h3>{t(MODULE_TITLE_KEY.final)}</h3>
        <p className="academy-summary">{t('academy.study.finalFraming')}</p>
        <button className="quiz-nav-btn module-study-skip-btn" onClick={onSkip}>
          {t('academy.study.finalSkipBtn')}
        </button>
      </div>

      {CATEGORY_ORDER.map((cat) => (
        <div key={cat} className="final-review-group">
          <div className="academy-nav-heading">{t(CATEGORY_LABEL_KEY[cat])}</div>
          <ul className="final-review-list">
            {grouped.get(cat)?.map((lesson) => (
              <li key={lesson.id} className="final-review-item">
                <span className="final-review-item-title">{t(`academy.lessons.${lesson.id}.title`)}</span>
                <span className="final-review-item-summary">{t(`academy.lessons.${lesson.id}.summary`)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <button className="quiz-nav-btn primary module-study-start-btn" onClick={onStartQuiz}>
        {t('academy.study.finalStartBtn')}
      </button>
    </div>
  )
}
