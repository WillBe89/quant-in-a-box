import { useEffect, useMemo, useRef } from 'react'
import { useAppState } from '@renderer/state/AppStateContext'
import { LESSONS, type Lesson } from './lessons'
import './academy.css'

const CATEGORY_ORDER: Lesson['category'][] = ['Trend & Momentum', 'Risk & Portfolio', 'Options & Derivatives']

export default function AcademyPanel(): JSX.Element | null {
  const { academyOpen, academyLessonId, closeAcademy, openAcademy } = useAppState()
  const dialogRef = useRef<HTMLDivElement>(null)

  const grouped = useMemo(() => {
    const map = new Map<Lesson['category'], Lesson[]>()
    for (const cat of CATEGORY_ORDER) map.set(cat, [])
    for (const lesson of LESSONS) map.get(lesson.category)?.push(lesson)
    return map
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
        aria-label="Teaching zone"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="academy-header">
          <div className="academy-title">
            <span className="academy-badge">Teaching Zone</span>
            <h2>Learn what you're looking at</h2>
          </div>
          <button className="icon-btn" onClick={closeAcademy} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="academy-body">
          <nav className="academy-nav">
            {CATEGORY_ORDER.map((cat) => (
              <div key={cat} className="academy-nav-group">
                <div className="academy-nav-heading">{cat}</div>
                {grouped.get(cat)?.map((lesson) => (
                  <button
                    key={lesson.id}
                    className={'academy-nav-item' + (lesson.id === activeLesson.id ? ' active' : '')}
                    onClick={() => openAcademy(lesson.id)}
                  >
                    {lesson.title}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <article className="academy-content">
            <div className="academy-eyebrow">{activeLesson.category}</div>
            <h3>{activeLesson.title}</h3>
            <p className="academy-summary">{activeLesson.summary}</p>

            {activeLesson.formula && (
              <div className="academy-block">
                <div className="academy-block-label">Formula</div>
                <div className="academy-formula tnum">{activeLesson.formula}</div>
              </div>
            )}

            <div className="academy-block">
              <div className="academy-block-label ok">How to use it</div>
              <p>{activeLesson.howToUse}</p>
            </div>

            <div className="academy-block">
              <div className="academy-block-label warn">Watch out for</div>
              <p>{activeLesson.watchOutFor}</p>
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
