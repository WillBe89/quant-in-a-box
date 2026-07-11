import { useTranslation } from 'react-i18next'
import { useAppState, useAcademyProgress } from '@renderer/state/AppStateContext'
import { MODULE_ID_ORDER } from '@renderer/academy/modules'
import { IconInfo, IconBadgeFinal } from '@renderer/components/icons/Icons'

/** Landing view for AcademyPanel's Home mode (see AppStateContext's openAcademy) — a short
 *  explainer plus two big cards that hand off to the other two modes. Deliberately thin: all
 *  it does is explain the split and call setAcademyMode, the same way the header's 3-way
 *  toggle does. */
export default function AcademyHome(): JSX.Element {
  const { t } = useTranslation()
  const { setAcademyMode } = useAppState()
  const { progress } = useAcademyProgress()

  // Same "record?.passed === true" check BadgeShelf.tsx uses per slot — just counted across
  // all 5 modules instead of rendered one slot at a time.
  const earned = MODULE_ID_ORDER.filter((id) => progress[id]?.passed === true).length
  const total = MODULE_ID_ORDER.length

  return (
    <div className="academy-home">
      <h3>{t('academy.home.heading')}</h3>
      <p className="academy-home-intro">{t('academy.home.intro')}</p>

      <div className="academy-home-cards">
        <button className="academy-home-card" onClick={() => setAcademyMode('library')}>
          <div className="academy-home-card-icon">
            <IconInfo size={30} />
          </div>
          <div className="academy-home-card-body">
            <div className="academy-home-card-title">{t('academy.home.libraryCardTitle')}</div>
            <p className="academy-home-card-desc">{t('academy.home.libraryCardDesc')}</p>
            <span className="academy-home-card-cta">{t('academy.home.libraryCardCta')}</span>
          </div>
        </button>

        <button className="academy-home-card" onClick={() => setAcademyMode('modules')}>
          <div className="academy-home-card-icon" style={{ color: '#c9a227' }}>
            <IconBadgeFinal size={36} />
          </div>
          <div className="academy-home-card-body">
            <div className="academy-home-card-title">{t('academy.home.academyCardTitle')}</div>
            <p className="academy-home-card-desc">{t('academy.home.academyCardDesc')}</p>
            <span className="academy-home-card-progress">
              {earned > 0
                ? t('academy.home.badgeProgress', { earned, total })
                : t('academy.home.badgeProgressZero')}
            </span>
            <span className="academy-home-card-cta">{t('academy.home.academyCardCta')}</span>
          </div>
        </button>
      </div>
    </div>
  )
}
