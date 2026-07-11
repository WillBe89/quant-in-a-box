import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import { chartColors } from '@renderer/lib/chartTheme'

const MONO_FONT_STACK = 'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Consolas, monospace'

interface Props {
  portfolioSeries: number[] | null
  benchmarkSeries: number[] | null
  loading: boolean
}

/** DPR-aware canvas line chart comparing two cumulative value series (base = 1), following
 *  the same draw-routine pattern as OscillatorPanel.tsx. Both series already share a base,
 *  so no extra normalization is done here — just a shared y-scale spanning both series. */
export default function BenchmarkCompareChart({ portfolioSeries, benchmarkSeries, loading }: Props): JSX.Element {
  const { t } = useTranslation()
  const { theme } = useAppState()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !portfolioSeries || !benchmarkSeries) return
    if (portfolioSeries.length === 0 || benchmarkSeries.length === 0) return

    const colors = chartColors(theme)
    const rect = canvas.parentElement!.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, rect.width * dpr)
    canvas.height = Math.max(1, rect.height * dpr)
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const w = rect.width
    const h = rect.height
    ctx.clearRect(0, 0, w, h)
    const pad = { l: 8, r: 10, t: 14, b: 10 }

    const allValues = [...portfolioSeries, ...benchmarkSeries]
    const minV = Math.min(...allValues)
    const maxV = Math.max(...allValues)
    const span = maxV - minV || 1e-6

    const y = (v: number): number => pad.t + (1 - (v - minV) / span) * (h - pad.t - pad.b)
    const xFor = (series: number[], i: number): number =>
      pad.l + (i / Math.max(1, series.length - 1)) * (w - pad.l - pad.r)

    const drawLine = (series: number[], color: string, dashed: boolean): void => {
      ctx.setLineDash(dashed ? [4, 4] : [])
      ctx.strokeStyle = color
      ctx.lineWidth = 1.6
      ctx.beginPath()
      series.forEach((v, i) => {
        const px = xFor(series, i)
        const py = y(v)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      ctx.stroke()
      ctx.setLineDash([])
    }

    drawLine(portfolioSeries, colors.accentA, false)
    drawLine(benchmarkSeries, colors.accentB, true)

    // Small legend in the top-right corner.
    ctx.font = '11px ' + MONO_FONT_STACK
    ctx.textAlign = 'right'
    const legendX = w - pad.r - 4
    ctx.fillStyle = colors.accentA
    ctx.fillText(t('portfolio.dashboard.benchmarkChartYourPortfolio'), legendX, pad.t + 10)
    ctx.fillStyle = colors.accentB
    ctx.fillText(t('portfolio.dashboard.benchmarkChartCompareTo'), legendX, pad.t + 24)
    ctx.textAlign = 'left'
  }, [portfolioSeries, benchmarkSeries, theme, t])

  if (loading) {
    return <div className="stat-loading">{t('portfolio.dashboard.benchmarkLoading')}</div>
  }
  if (!portfolioSeries && !benchmarkSeries) {
    return <div className="portfolio-empty">{t('portfolio.dashboard.benchmarkEmpty')}</div>
  }

  return (
    <div className="benchmark-compare-chart">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}
