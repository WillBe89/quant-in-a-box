import { useEffect, useRef } from 'react'
import {
  createChart,
  LineStyle,
  LineType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp
} from 'lightweight-charts'
import type { Candle, ChartHoverInfo, ChartStyleId, ForecastMethodId, IndicatorId } from '@renderer/types/market'
import { bollingerBands, closesOf, sma } from '@renderer/lib/quant'
import { driftForecast, monteCarloForecast, regressionForecast, type ForecastBand } from '@renderer/lib/forecast'
import { chartColors, type ChartColors } from '@renderer/lib/chartTheme'

const MONO_FONT_STACK = 'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Consolas, monospace'

interface Props {
  candles: Candle[]
  indicators: Record<IndicatorId, boolean>
  chartStyle: ChartStyleId
  forecastMethod: ForecastMethodId
  theme: 'dark' | 'light'
  onHover?: (info: ChartHoverInfo | null) => void
  /** Fires while scrolling/zooming brings the visible range near the oldest currently-loaded
   *  bar. Purely a signal to go check for more *already-stored* local history (see ChartSlot's
   *  loadMoreLocalHistory) — this component never fetches anything itself on this path. */
  onScrollNearOldestEdge?: () => void
}

/** How close (in bars) the visible range's left edge has to get to logical index 0 — the
 *  oldest currently-loaded bar — before `onScrollNearOldestEdge` fires. A few bars of slack so
 *  it fires just *before* the user hits the hard edge, not only once they're already stuck there. */
const OLDEST_EDGE_PROXIMITY_BARS = 5

interface IndicatorCache {
  candles: Candle[]
  ma20: Array<number | null>
  ma50: Array<number | null>
  bollUpper: Array<number | null>
  bollLower: Array<number | null>
}

type MainSeries =
  | ISeriesApi<'Candlestick'>
  | ISeriesApi<'Bar'>
  | ISeriesApi<'Line'>
  | ISeriesApi<'Area'>
  | ISeriesApi<'Baseline'>

/** Whichever way the visible range has moved (last close vs first close) picks the
 *  gain/loss color family for non-candle styles, which have no per-bar up/down coloring. */
function trendColorSet(
  candles: Candle[],
  colors: ChartColors
): { line: string; areaTop: string; areaBottom: string } {
  const trendUp = candles.length > 1 ? candles[candles.length - 1].close >= candles[0].close : true
  return {
    line: trendUp ? colors.gain : colors.loss,
    areaTop: trendUp ? colors.gainAreaTop : colors.lossAreaTop,
    areaBottom: trendUp ? colors.gainAreaBottom : colors.lossAreaBottom
  }
}

export default function PriceChart({
  candles,
  indicators,
  chartStyle,
  forecastMethod,
  theme,
  onHover,
  onScrollNearOldestEdge
}: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const mainSeriesRef = useRef<MainSeries | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const ma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const ma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const bollUpperRef = useRef<ISeriesApi<'Line'> | null>(null)
  const bollLowerRef = useRef<ISeriesApi<'Line'> | null>(null)
  const forecastCentralRef = useRef<ISeriesApi<'Line'> | null>(null)
  const forecastUpperRef = useRef<ISeriesApi<'Line'> | null>(null)
  const forecastLowerRef = useRef<ISeriesApi<'Line'> | null>(null)
  // Always holds the latest candles + computed indicator arrays so the crosshair
  // handler (subscribed once, in the chart-creation effect) never reads stale closures.
  const dataCacheRef = useRef<IndicatorCache>({ candles: [], ma20: [], ma50: [], bollUpper: [], bollLower: [] })

  // Create (or recreate, on theme change) the chart. Colors come from the explicit
  // chartColors() map, not the DOM — reading data-theme off <html> here would race
  // against the ancestor effect that sets it (React fires effects child-before-parent).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const colors = chartColors(theme)

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { color: 'transparent' },
        textColor: colors.text,
        fontFamily: MONO_FONT_STACK,
        attributionLogo: false
      },
      grid: {
        vertLines: { color: colors.border },
        horzLines: { color: colors.border }
      },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border, timeVisible: true },
      crosshair: { mode: 0 }
    })
    chartRef.current = chart

    const trend = trendColorSet(candles, colors)
    let mainSeries: MainSeries
    switch (chartStyle) {
      case 'bars':
        mainSeries = chart.addBarSeries({
          upColor: colors.gain,
          downColor: colors.loss,
          thinBars: false
        })
        break
      case 'line':
        mainSeries = chart.addLineSeries({
          color: trend.line,
          lineWidth: 2,
          lineType: LineType.Curved
        })
        break
      case 'area':
        mainSeries = chart.addAreaSeries({
          lineColor: trend.line,
          topColor: trend.areaTop,
          bottomColor: trend.areaBottom,
          lineWidth: 2,
          lineType: LineType.Curved
        })
        break
      case 'baseline':
        mainSeries = chart.addBaselineSeries({
          baseValue: { type: 'price', price: candles.length > 0 ? candles[0].close : 0 },
          topLineColor: colors.gain,
          topFillColor1: colors.gainAreaTop,
          topFillColor2: colors.gainAreaBottom,
          bottomLineColor: colors.loss,
          bottomFillColor1: colors.lossAreaBottom,
          bottomFillColor2: colors.lossAreaTop,
          lineWidth: 2
        })
        break
      case 'candles':
      default:
        mainSeries = chart.addCandlestickSeries({
          upColor: colors.gain,
          downColor: colors.loss,
          borderVisible: true,
          borderUpColor: colors.candleBorderUp,
          borderDownColor: colors.candleBorderDown,
          wickUpColor: colors.gain,
          wickDownColor: colors.loss
        })
        break
    }
    mainSeriesRef.current = mainSeries

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume'
    })
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    volumeSeriesRef.current = volumeSeries

    ma20SeriesRef.current = chart.addLineSeries({
      color: '#f5b94b',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false
    })
    ma50SeriesRef.current = chart.addLineSeries({
      color: '#6ba8ff',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false
    })
    bollUpperRef.current = chart.addLineSeries({
      color: 'rgba(140,126,247,0.75)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false
    })
    bollLowerRef.current = chart.addLineSeries({
      color: 'rgba(140,126,247,0.75)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false
    })

    forecastCentralRef.current = chart.addLineSeries({
      color: colors.accentA,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false
    })
    forecastUpperRef.current = chart.addLineSeries({
      color: 'rgba(47,224,200,0.5)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false
    })
    forecastLowerRef.current = chart.addLineSeries({
      color: 'rgba(47,224,200,0.5)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false
    })

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return
      chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight })
    })
    ro.observe(el)

    chart.subscribeCrosshairMove((param) => {
      if (!onHover) return
      if (param.time == null) {
        onHover(null)
        return
      }
      const cache = dataCacheRef.current
      const index = cache.candles.findIndex((c) => c.time === param.time)
      if (index === -1) {
        onHover(null)
        return
      }
      const candle = cache.candles[index]
      onHover({
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        prevClose: index > 0 ? cache.candles[index - 1].close : null,
        ma20: cache.ma20[index] ?? null,
        ma50: cache.ma50[index] ?? null,
        bollUpper: cache.bollUpper[index] ?? null,
        bollLower: cache.bollLower[index] ?? null
      })
    })

    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!onScrollNearOldestEdge || !range) return
      if (range.from <= OLDEST_EDGE_PROXIMITY_BARS) onScrollNearOldestEdge()
    })

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, chartStyle])

  // Push candle/volume/indicator data whenever it (or theme, for volume coloring) changes.
  useEffect(() => {
    if (!mainSeriesRef.current || !volumeSeriesRef.current) return
    const colors = chartColors(theme)

    // Detect the one case that must NOT reset the view: ChartSlot's loadMoreLocalHistory
    // prepending older, already-stored bars onto the front of `candles` while the user is
    // mid-scroll (see onScrollNearOldestEdge above). Recognized by the previous batch's bars
    // reappearing unchanged, shifted later by some count — everything else (a symbol switch, a
    // timeframe switch, a fresh live re-fetch) looks different from this and falls through to
    // the normal fitContent() reset a few lines down.
    const prevCandles = dataCacheRef.current.candles
    const prependedCount =
      prevCandles.length > 0 &&
      candles.length > prevCandles.length &&
      candles[candles.length - 1]?.time === prevCandles[prevCandles.length - 1]?.time &&
      candles[candles.length - prevCandles.length]?.time === prevCandles[0]?.time
        ? candles.length - prevCandles.length
        : 0
    const prevVisibleRange = prependedCount > 0 ? chartRef.current?.timeScale().getVisibleLogicalRange() : null
    const candleData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }))
    const lineData = candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close }))
    const trend = trendColorSet(candles, colors)

    switch (chartStyle) {
      case 'bars':
        ;(mainSeriesRef.current as ISeriesApi<'Bar'>).setData(candleData)
        break
      case 'line':
        ;(mainSeriesRef.current as ISeriesApi<'Line'>).applyOptions({ color: trend.line })
        ;(mainSeriesRef.current as ISeriesApi<'Line'>).setData(lineData)
        break
      case 'area':
        ;(mainSeriesRef.current as ISeriesApi<'Area'>).applyOptions({
          lineColor: trend.line,
          topColor: trend.areaTop,
          bottomColor: trend.areaBottom
        })
        ;(mainSeriesRef.current as ISeriesApi<'Area'>).setData(lineData)
        break
      case 'baseline':
        ;(mainSeriesRef.current as ISeriesApi<'Baseline'>).applyOptions({
          baseValue: { type: 'price', price: candles.length > 0 ? candles[0].close : 0 },
          topLineColor: colors.gain,
          topFillColor1: colors.gainAreaTop,
          topFillColor2: colors.gainAreaBottom,
          bottomLineColor: colors.loss,
          bottomFillColor1: colors.lossAreaBottom,
          bottomFillColor2: colors.lossAreaTop
        })
        ;(mainSeriesRef.current as ISeriesApi<'Baseline'>).setData(lineData)
        break
      case 'candles':
      default:
        ;(mainSeriesRef.current as ISeriesApi<'Candlestick'>).setData(candleData)
        break
    }

    volumeSeriesRef.current.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? colors.gain : colors.loss
      }))
    )

    const closes = closesOf(candles)

    const ma20 = sma(closes, 20)
    ma20SeriesRef.current?.setData(
      indicators.ma20
        ? candles
            .map((c, i) => (ma20[i] == null ? null : { time: c.time as UTCTimestamp, value: ma20[i] as number }))
            .filter((v): v is { time: UTCTimestamp; value: number } => v !== null)
        : []
    )

    const ma50 = sma(closes, 50)
    ma50SeriesRef.current?.setData(
      indicators.ma50
        ? candles
            .map((c, i) => (ma50[i] == null ? null : { time: c.time as UTCTimestamp, value: ma50[i] as number }))
            .filter((v): v is { time: UTCTimestamp; value: number } => v !== null)
        : []
    )

    let bollUpper: Array<number | null> = []
    let bollLower: Array<number | null> = []
    if (indicators.boll) {
      const bands = bollingerBands(closes, 20, 2)
      bollUpper = bands.upper
      bollLower = bands.lower
      bollUpperRef.current?.setData(
        candles
          .map((c, i) => (bands.upper[i] == null ? null : { time: c.time as UTCTimestamp, value: bands.upper[i] as number }))
          .filter((v): v is { time: UTCTimestamp; value: number } => v !== null)
      )
      bollLowerRef.current?.setData(
        candles
          .map((c, i) => (bands.lower[i] == null ? null : { time: c.time as UTCTimestamp, value: bands.lower[i] as number }))
          .filter((v): v is { time: UTCTimestamp; value: number } => v !== null)
      )
    } else {
      bollUpperRef.current?.setData([])
      bollLowerRef.current?.setData([])
    }

    if (indicators.forecast && candles.length >= 2) {
      const horizonBars = Math.min(60, Math.max(10, Math.round(candles.length * 0.25)))
      let band: ForecastBand
      switch (forecastMethod) {
        case 'regression':
          band = regressionForecast(closes, horizonBars)
          break
        case 'montecarlo':
          band = monteCarloForecast(closes, horizonBars)
          break
        case 'drift':
        default:
          band = driftForecast(closes, horizonBars)
          break
      }
      const lastTime = candles[candles.length - 1].time
      const step = candles[candles.length - 1].time - candles[candles.length - 2].time
      const toPoint = (values: number[]): Array<{ time: UTCTimestamp; value: number }> =>
        values.map((v, k) => ({ time: (lastTime + (k + 1) * step) as UTCTimestamp, value: v }))
      forecastCentralRef.current?.setData(toPoint(band.central))
      forecastUpperRef.current?.setData(toPoint(band.upper))
      forecastLowerRef.current?.setData(toPoint(band.lower))
    } else {
      forecastCentralRef.current?.setData([])
      forecastUpperRef.current?.setData([])
      forecastLowerRef.current?.setData([])
    }

    dataCacheRef.current = { candles, ma20, ma50, bollUpper, bollLower }

    if (prevVisibleRange) {
      // Older local history just got prepended in front of what was already showing (see
      // prependedCount above) — every existing bar's logical index shifted right by that many
      // slots, so re-apply the same visible window, shifted the same amount, instead of
      // fitContent()'s reset. The whole point of "reveal for free while scrolling" is that nothing
      // visually jumps; only now there's more room to keep scrolling further back.
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: prevVisibleRange.from + prependedCount,
        to: prevVisibleRange.to + prependedCount
      })
    } else {
      // Re-enable autoScale on every other data push, not just on chart creation: dragging the
      // price scale by hand turns autoScale off for the life of the chart instance (it isn't
      // recreated on a symbol switch, only re-fed data), so without this a manually-adjusted
      // scale stays locked to the previous symbol's price range even after switching to a
      // wildly different one, leaving the new candles rendered off-screen.
      chartRef.current?.priceScale('right').applyOptions({ autoScale: true })
      chartRef.current?.timeScale().fitContent()
    }
    const last = candles[candles.length - 1]
    onHover?.(
      last
        ? {
            time: last.time,
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            volume: last.volume,
            prevClose: candles.length > 1 ? candles[candles.length - 2].close : null,
            ma20: ma20[candles.length - 1] ?? null,
            ma50: ma50[candles.length - 1] ?? null,
            bollUpper: bollUpper[candles.length - 1] ?? null,
            bollLower: bollLower[candles.length - 1] ?? null
          }
        : null
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, indicators, theme, chartStyle, forecastMethod])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
