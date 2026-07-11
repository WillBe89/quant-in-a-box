import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import { LESSONS, type LessonCategory } from './lessons'
import {
  IconBond,
  IconClose,
  IconCrypto,
  IconFx,
  IconRealEstate,
  IconStocks
} from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import OverlayPanel from '@renderer/components/ui/OverlayPanel'
import ModulesHome from './ModulesHome'
import './academy.css'

const CATEGORY_ORDER: LessonCategory[] = ['assetTypes', 'trend', 'risk', 'options']

const ASSET_TYPE_ICONS: Record<string, (props: { size?: number }) => JSX.Element> = {
  assetStocks: IconStocks,
  assetCrypto: IconCrypto,
  assetBonds: IconBond,
  assetFx: IconFx,
  assetRealEstate: IconRealEstate
}

export default function AcademyPanel(): JSX.Element {
  const { t } = useTranslation()
  const { academyOpen, academyLessonId, academyMode, setAcademyMode, closeAcademy, openAcademy } = useAppState()

  const categoryLabel: Record<LessonCategory, string> = useMemo(
    () => ({
      assetTypes: t('academy.categoryAssetTypes'),
      trend: t('academy.categoryTrend'),
      risk: t('academy.categoryRisk'),
      options: t('academy.categoryOptions')
    }),
    [t]
  )

  const grouped = useMemo(() => {
    const map = new Map<LessonCategory, typeof LESSONS>()
    for (const cat of CATEGORY_ORDER) map.set(cat, [])
    for (const lesson of LESSONS) map.get(lesson.category)?.push(lesson)
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeLesson = useMemo(
    () => LESSONS.find((l) => l.id === academyLessonId) ?? LESSONS[0],
    [academyLessonId]
  )

  return (
    <OverlayPanel open={academyOpen} onClose={closeAcademy} ariaLabel={t('academy.heading')} zIndex={110} className="academy-panel">
      <div className="overlay-header">
        <div className="overlay-title">
          <span className="overlay-badge">{t('academy.badge')}</span>
          <h2>{t('academy.heading')}</h2>
        </div>
        <div className="segmented academy-mode-toggle">
          <button className={academyMode === 'library' ? 'active' : ''} onClick={() => setAcademyMode('library')}>
            {t('academy.modeLibrary')}
          </button>
          <button className={academyMode === 'modules' ? 'active' : ''} onClick={() => setAcademyMode('modules')}>
            {t('academy.modeModules')}
          </button>
        </div>
        <Tooltip label={t('common.close') ?? ''}>
          <button className="icon-btn" onClick={closeAcademy} aria-label={t('common.close') ?? undefined}>
            <IconClose size={15} />
          </button>
        </Tooltip>
      </div>

      {academyMode === 'modules' ? (
        <div className="academy-modules-body">
          <ModulesHome />
        </div>
      ) : (
        <div className="academy-body">
          <nav className="academy-nav">
            {CATEGORY_ORDER.map((cat) => (
              <div key={cat} className="academy-nav-group">
                <div className="academy-nav-heading">{categoryLabel[cat]}</div>
                {grouped.get(cat)?.map((lesson) => {
                  const AssetIcon = ASSET_TYPE_ICONS[lesson.id]
                  return (
                    <button
                      key={lesson.id}
                      className={'academy-nav-item' + (lesson.id === activeLesson.id ? ' active' : '')}
                      onClick={() => openAcademy(lesson.id)}
                    >
                      {AssetIcon && <AssetIcon size={14} />}
                      {t(`academy.lessons.${lesson.id}.title`)}
                    </button>
                  )
                })}
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
      )}
    </OverlayPanel>
  )
}
