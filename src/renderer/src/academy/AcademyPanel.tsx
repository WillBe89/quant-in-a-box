import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import { LESSONS, type LessonCategory } from './lessons'
import './academy.css'

const CATEGORY_ORDER: LessonCategory[] = ['trend', 'risk', 'options']

export default function AcademyPanel(): JSX.Element | null {
  const { t } = useTranslation()
  const { academyOpen, academyLessonId, closeAcademy, openAcademy } = useAppState()
  const dialogRef = useRef<HTMLDivElement>(null)

  const categoryLabel: Record<LessonCategory, string> = {
    trend: t('academy.categoryTrend'),
    risk: t('academy.categoryRisk'),
    options: t('academy.categoryOptions')
  }

  const grouped = useMemo(() => {
    const map = new Map<LessonCategory, typeof LESSONS>()
    for (const cat of CATEGORY_ORDER) map.set(cat, [])
    for (const lesson of LESSONS) map.get(lesson.category)?.push(lesson)
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeLesson = LESSONS.find((l) => l.id === academyLessonId) ?? LESSONS[0]

  useEffect(() => {
    if (!academyOpen) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') closeAcademy()
    }
    window.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [academyOpen, closeAcademy])

  if (!academyOpen) return null

  return (
    <div className="academy-scrim" onClick={closeAcademy}>
      <div
        className="academy-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('academy.heading')}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="academy-header">
          <div className="academy-title">
            <span className="academy-badge">{t('academy.badge')}</span>
            <h2>{t('academy.heading')}</h2>
          </div>
          <button className="icon-btn" onClick={closeAcademy} aria-label={t('common.close') ?? undefined}>
            ✕
          </button>
        </div>

        <div className="academy-body">
          <nav className="academy-nav">
            {CATEGORY_ORDER.map((cat) => (
              <div key={cat} className="academy-nav-group">
                <div className="academy-nav-heading">{categoryLabel[cat]}</div>
                {grouped.get(cat)?.map((lesson) => (
                  <button
                    key={lesson.id}
                    className={'academy-nav-item' + (lesson.id === activeLesson.id ? ' active' : '')}
                    onClick={() => openAcademy(lesson.id)}
                  >
                    {t(`academy.lessons.${lesson.id}.title`)}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <article className="academy-content">
            <div className="academy-eyebrow">{categoryLabel[activeLesson.category]}</div>
            <h3>{t(`academy.lessons.${activeLesson.id}.title`)}</h3>
            <p className="academy-summary">{t(`academy.lessons.${activeLesson.id}.summary`)}</p>

            <div className="academy-block">
              <div className="academy-block-label">{t('academy.formula')}</div>
              <div className="academy-formula tnum">{t(`academy.lessons.${activeLesson.id}.formula`)}</div>
            </div>

            <div className="academy-block">
              <div className="academy-block-label ok">{t('academy.howToUse')}</div>
              <p>{t(`academy.lessons.${activeLesson.id}.howToUse`)}</p>
            </div>

            <div className="academy-block">
              <div className="academy-block-label warn">{t('academy.watchOutFor')}</div>
              <p>{t(`academy.lessons.${activeLesson.id}.watchOutFor`)}</p>
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
