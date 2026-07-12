import { useEffect, useMemo, useState } from 'react'
import { useAppState } from '@renderer/state/AppStateContext'
import { dataService } from '@renderer/data/dataService'
import PriceChart from '@renderer/components/chart/PriceChart'
import type { Candle, IndicatorId, Timeframe } from '@renderer/types/market'
import type { ResolvedHoldingRow } from '@renderer/lib/portfolioHoldings'

// Compact preview window: long enough to show a real trend for the stat line below, short
// enough that fetching it for every holding in a portfolio at once stays cheap.
const CARD_TIMEFRAME: Timeframe = '3M'

// Deliberately minimal — there's no toolbar on these cards to toggle anything from, so every
// overlay/oscillator indicator stays off. 'volume' is the one exception: it mirrors the same
// default the full-size chart slots use (see AppStateContext's defaultIndicators), so a card
// looks like a smaller version of the real chart out of the box rather than a stripped-down one.
const CARD_INDICATORS: Record<IndicatorId, boolean> = {
  ma20: false,
  ma50: false,
  boll: false,
  rsi: false,
  macd: false,
  forecast: false,
  volume: true
}

// Small local copy of the same convention ChartSlot.tsx/AssetBrowserPanel.tsx each already
// keep (see AssetBrowserPanel's own comment on its copy) — a bond/FX yield still reads as a
// percentage here too, and it's not worth a shared import for a two-line function.
function formatPrice(price: number, isYield?: boolean): string {
  if (isYield) return `${price.toFixed(2)}%`
  return price >= 1000
    ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : `$${price.toFixed(2)}`
}

/** One holding's compact price chart + stat line for PortfolioPane's 'charts' tab. Clicking
 *  anywhere on the card hands off to `onSelect` (wired by the caller to set the main workspace's
 *  focused chart slot to this symbol and close the portfolio pane), the same "pick a row, land on
 *  the real chart" handoff AssetBrowserPanel's own row-selection already does. */
export default function HoldingChartCard({
  row,
  onSelect
}: {
  row: ResolvedHoldingRow
  onSelect: () => void
}): JSX.Element {
  const { theme } = useAppState()
  const [candles, setCandles] = useState<Candle[]>([])

  useEffect(() => {
    let cancelled = false
    dataService.getCandles(row.asset, CARD_TIMEFRAME).then((data) => {
      if (!cancelled) setCandles(data)
    })
    return () => {
      cancelled = true
    }
  }, [row.asset])

  const periodChangePct = useMemo(() => {
    if (candles.length < 2) return null
    const first = candles[0].close
    if (first === 0) return 0
    return ((candles[candles.length - 1].close - first) / first) * 100
  }, [candles])

  const up = (periodChangePct ?? 0) >= 0

  return (
    <button className="holding-chart-card" onClick={onSelect}>
      <div className="holding-chart-card-head">
        <span className="hc-sym">{row.asset.symbol}</span>
        <span className="hc-name">{row.asset.name}</span>
      </div>
      <div className="holding-chart-card-chart">
        <PriceChart
          candles={candles}
          indicators={CARD_INDICATORS}
          chartStyle="candles"
          forecastMethod="drift"
          theme={theme}
        />
      </div>
      <div className="holding-chart-card-stats tnum">
        <span>{formatPrice(row.currentPrice, row.asset.isYield)}</span>
        {periodChangePct != null && (
          <span className={up ? 'up' : 'down'}>
            {up ? '+' : ''}
            {periodChangePct.toFixed(2)}%
          </span>
        )}
        <span className="hc-weight">{row.weightPct.toFixed(1)}%</span>
      </div>
    </button>
  )
}
