import { useEffect, useRef } from 'react'
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp
} from 'lightweight-charts'
import type { Candle, IndicatorId } from '@renderer/types/market'
import { bollingerBands, closesOf, sma } from '@renderer/lib/quant'
import { chartColors } from '@renderer/lib/chartTheme'

const MONO_FONT_STACK = 'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Consolas, monospace'

interface Props {
  candles: Candle[]
  indicators: Record<IndicatorId, boolean>
  theme: 'dark' | 'light'
  onLastBar?: (candle: Candle | null) => void
}

export default function PriceChart({ candles, indicators, theme, onLastBar }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const ma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const ma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const bollUpperRef = useRef<ISeriesApi<'Line'> | null>(null)
  const bollLowerRef = useRef<ISeriesApi<'Line'> | null>(null)

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

    const candleSeries = chart.addCandlestickSeries({
      upColor: colors.gain,
      downColor: colors.loss,
      borderVisible: false,
      wickUpColor: colors.gain,
      wickDownColor: colors.loss
    })
    candleSeriesRef.current = candleSeries

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

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return
      chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight })
    })
    ro.observe(el)

    chart.subscribeCrosshairMove((param) => {
      if (!onLastBar) return
      const price = param.seriesData.get(candleSeries) as
        | { open: number; high: number; low: number; close: number }
        | undefined
      if (price) {
        onLastBar({
          time: (param.time as UTCTimestamp) ?? 0,
          open: price.open,
          high: price.high,
          low: price.low,
          close: price.close,
          volume: 0
        })
      }
    })

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  // Push candle/volume/indicator data whenever it (or theme, for volume coloring) changes.
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return
    const colors = chartColors(theme)
    const candleData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }))
    candleSeriesRef.current.setData(candleData)

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

    if (indicators.boll) {
      const { upper, lower } = bollingerBands(closes, 20, 2)
      bollUpperRef.current?.setData(
        candles
          .map((c, i) => (upper[i] == null ? null : { time: c.time as UTCTimestamp, value: upper[i] as number }))
          .filter((v): v is { time: UTCTimestamp; value: number } => v !== null)
      )
      bollLowerRef.current?.setData(
        candles
          .map((c, i) => (lower[i] == null ? null : { time: c.time as UTCTimestamp, value: lower[i] as number }))
          .filter((v): v is { time: UTCTimestamp; value: number } => v !== null)
      )
    } else {
      bollUpperRef.current?.setData([])
      bollLowerRef.current?.setData([])
    }

    chartRef.current?.timeScale().fitContent()
    onLastBar?.(candles[candles.length - 1] ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, indicators, theme])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
