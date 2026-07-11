import { useTranslation } from 'react-i18next'
import { MODEL_PORTFOLIOS, type ModelPortfolioId } from '@renderer/data/modelPortfolios'

export default function BenchmarkSelector({
  selected,
  onChange
}: {
  selected: ModelPortfolioId
  onChange: (id: ModelPortfolioId) => void
}): JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="segmented">
      {MODEL_PORTFOLIOS.map((preset) => (
        <button
          key={preset.id}
          className={selected === preset.id ? 'active' : ''}
          onClick={() => onChange(preset.id)}
        >
          {t(preset.nameKey)}
        </button>
      ))}
    </div>
  )
}
