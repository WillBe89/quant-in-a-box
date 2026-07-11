import { useTranslation } from 'react-i18next'
import { ASSET_CLASS_COLORS, ASSET_CLASS_ICONS } from '@renderer/lib/assetClassStyle'
import type { ClassBreakdownSlice } from '@renderer/lib/portfolioBreakdown'
import type { AssetClass } from '@renderer/types/market'

const CLASS_NAME_KEY: Record<AssetClass, string> = {
  stocks: 'topbar.classStocks',
  crypto: 'topbar.classCrypto',
  bonds: 'topbar.classBonds',
  fx: 'topbar.classFx',
  re: 'topbar.classRe'
}

export default function ClassBreakdownBar({ slices }: { slices: ClassBreakdownSlice[] }): JSX.Element {
  const { t } = useTranslation()

  if (slices.length === 0) {
    return <div className="portfolio-empty">{t('portfolio.dashboard.emptyState')}</div>
  }

  return (
    <div className="class-breakdown">
      <div className="class-breakdown-bar">
        {slices.map((slice) => (
          <div
            key={slice.klass}
            className="class-breakdown-seg"
            style={{ width: `${slice.pct}%`, background: ASSET_CLASS_COLORS[slice.klass] }}
          />
        ))}
      </div>
      <div className="class-breakdown-legend">
        {slices.map((slice) => {
          const Icon = ASSET_CLASS_ICONS[slice.klass]
          return (
            <div key={slice.klass} className="class-breakdown-legend-row">
              <span className="class-breakdown-swatch" style={{ color: ASSET_CLASS_COLORS[slice.klass] }}>
                <Icon size={14} />
              </span>
              <span className="class-breakdown-legend-name">{t(CLASS_NAME_KEY[slice.klass])}</span>
              <span className="class-breakdown-legend-value tnum">
                ${slice.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="class-breakdown-legend-pct tnum">{slice.pct.toFixed(1)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
