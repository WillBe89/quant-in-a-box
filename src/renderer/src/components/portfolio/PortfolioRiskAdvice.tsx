import { useTranslation } from 'react-i18next'
import { computeRiskGrade, type RiskGradeCategory } from '@renderer/lib/riskGrade'
import type { ClassBreakdownSlice } from '@renderer/lib/portfolioBreakdown'
import type { AssetClass, PortfolioRiskStats } from '@renderer/types/market'
import { FORMAT } from '@renderer/components/stats/RiskStatTile'
import { IconFaceGood, IconFaceBad } from '@renderer/components/icons/Icons'

interface Props {
  stats: PortfolioRiskStats
  classBreakdown: ClassBreakdownSlice[]
}

const CLASS_NAME_KEY: Record<AssetClass, string> = {
  stocks: 'topbar.classStocks',
  crypto: 'topbar.classCrypto',
  bonds: 'topbar.classBonds',
  fx: 'topbar.classFx',
  re: 'topbar.classRe'
}

const TIP_IDS: Record<RiskGradeCategory, string[]> = {
  conservative: ['tip1', 'tip2', 'tip3'],
  moderate: ['tip1', 'tip2', 'tip3', 'tip4'],
  elevated: ['tip1', 'tip2', 'tip3', 'tip4'],
  high: ['tip1', 'tip2', 'tip3', 'tip4']
}

type SignalId = 'volatility' | 'maxdd' | 'diversification' | 'var' | 'beta'
const SIGNAL_ORDER: SignalId[] = ['volatility', 'maxdd', 'diversification', 'var', 'beta']

/** Portfolio-level risk grade, narrative, and generic tips — sits between the weighted
 *  stat grid and the AI insights section. All numbers/tones come from lib/riskGrade.ts;
 *  this component only turns them into copy via i18n, mirroring how RiskStatTile.tsx
 *  calls t(explanationKey) rather than riskAssessment.ts returning English text. */
export default function PortfolioRiskAdvice({ stats, classBreakdown }: Props): JSX.Element {
  const { t } = useTranslation()
  const { score, category, signals } = computeRiskGrade(stats, classBreakdown)

  const dominantSlice = classBreakdown.reduce<ClassBreakdownSlice | null>(
    (max, s) => (!max || s.pct > max.pct ? s : max),
    null
  )

  const bullets = SIGNAL_ORDER.filter((id) => signals[id] === 'good' || signals[id] === 'bad').map((id) => {
    const tone = signals[id]
    if (id === 'diversification') {
      const dominantPct = dominantSlice ? Math.round(dominantSlice.pct) : 0
      const dominantClass = dominantSlice ? t(CLASS_NAME_KEY[dominantSlice.klass]) : ''
      return {
        id,
        tone,
        text: t(`portfolio.riskAdvice.narrative.diversification.${tone}`, {
          count: classBreakdown.length,
          dominantPct,
          dominantClass
        })
      }
    }
    const rawValue =
      id === 'volatility'
        ? stats.volatilityAnnualized
        : id === 'maxdd'
          ? stats.maxDrawdown
          : id === 'var'
            ? stats.valueAtRisk95
            : stats.beta
    return {
      id,
      tone,
      text: t(`portfolio.riskAdvice.narrative.${id}.${tone}`, { value: FORMAT[id](rawValue) })
    }
  })

  const tips = TIP_IDS[category].map((tipId) => t(`portfolio.riskAdvice.tips.${category}.${tipId}`))
  if (signals.diversification === 'bad') {
    tips.push(t('portfolio.riskAdvice.tips.concentrationTip'))
  }

  return (
    <div className="portfolio-risk-advice">
      <div className="portfolio-analytics-head">
        <h3>{t('portfolio.riskAdvice.sectionTitle')}</h3>
        <span className="portfolio-analytics-sub">{t('portfolio.riskAdvice.sectionSub')}</span>
      </div>

      <div className="risk-advice-category">
        <span className={`risk-advice-category-label tone-${category}`}>
          {t(`portfolio.riskAdvice.category.${category}.label`)}
        </span>
        <p className="risk-advice-category-desc">{t(`portfolio.riskAdvice.category.${category}.description`)}</p>
      </div>

      <div className="risk-advice-meter">
        <div className="risk-advice-meter-track">
          <div className="risk-advice-meter-marker" style={{ left: `${score}%` }} />
        </div>
        <div className="risk-advice-meter-scale">
          <span>{t('portfolio.riskAdvice.meterLow')}</span>
          <span className="risk-advice-meter-score tnum">{score}</span>
          <span>{t('portfolio.riskAdvice.meterHigh')}</span>
        </div>
      </div>

      {bullets.length > 0 && (
        <ul className="risk-advice-bullets">
          {bullets.map((b) => (
            <li key={b.id} className={`risk-advice-bullet ${b.tone}`}>
              {b.tone === 'good' ? <IconFaceGood size={14} /> : <IconFaceBad size={14} />}
              <span>{b.text}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="risk-advice-tips">
        <h4 className="risk-advice-tips-title">{t('portfolio.riskAdvice.tipsTitle')}</h4>
        <ul>
          {tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
