import { useTranslation } from 'react-i18next'
import InfoIcon from '@renderer/academy/InfoIcon'
import Tooltip from '@renderer/components/ui/Tooltip'
import { IconFaceGood, IconFaceNeutral, IconFaceBad } from '@renderer/components/icons/Icons'
import { assessRisk, type RiskMetricId, type RiskTone } from '@renderer/lib/riskAssessment'
import './riskStatTile.css'

interface RiskStatTileProps {
  metric: RiskMetricId
  label: string
  lessonId: string
  rawValue: number
}

/** Per-metric raw-value formatter, shared with anywhere else that needs to render a risk
 *  stat as text without the full tile (e.g. BenchmarkCompareStats.tsx). */
export const FORMAT: Record<RiskMetricId, (v: number) => string> = {
  sharpe: (v) => v.toFixed(2),
  sortino: (v) => v.toFixed(2),
  volatility: (v) => `${(v * 100).toFixed(1)}%`,
  var: (v) => `${(v * 100).toFixed(1)}%`,
  maxdd: (v) => `${(v * 100).toFixed(1)}%`,
  beta: (v) => v.toFixed(2)
}

function RiskFaceIcon({ tone, size }: { tone: RiskTone; size: number }): JSX.Element {
  if (tone === 'good') return <IconFaceGood size={size} />
  if (tone === 'bad') return <IconFaceBad size={size} />
  return <IconFaceNeutral size={size} />
}

export default function RiskStatTile({ metric, label, lessonId, rawValue }: RiskStatTileProps): JSX.Element {
  const { t } = useTranslation()
  const { tone, explanationKey } = assessRisk(metric, rawValue)
  const explanation = metric === 'beta' ? `${t(explanationKey)} ${t('riskFace.beta.caveat')}` : t(explanationKey)

  return (
    <div className={`stat-tile ${tone}`}>
      <div className="stripe" />
      <div className="lbl">
        {label}
        <Tooltip label={explanation}>
          <span className="risk-face" tabIndex={0} aria-label={t(`riskFace.ariaLabel.${tone}`) ?? undefined}>
            <RiskFaceIcon tone={tone} size={12} />
          </span>
        </Tooltip>
        <InfoIcon lessonId={lessonId} />
      </div>
      <div className="val tnum">{FORMAT[metric](rawValue)}</div>
    </div>
  )
}
