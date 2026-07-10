import { useEffect, useState } from 'react'
import type { Candle, IndicatorId, Timeframe } from '@renderer/types/market'
import { useAppState } from '@renderer/state/AppStateContext'
import { dataService } from '@renderer/data/dataService'
import PriceChart from '@renderer/components/chart/PriceChart'
import OscillatorPanel from '@renderer/components/chart/OscillatorPanel'
import InfoIcon from '@renderer/academy/InfoIcon'

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y', '5Y']
const INDICATOR_META: Array<{ id: IndicatorId; label: string; lessonId: string }> = [
  { id: 'ma20', label: 'MA 20', lessonId: 'ma' },
  { id: 'ma50', label: 'MA 50', lessonId: 'ma' },
  { id: 'boll', label: 'Bollinger', lessonId: 'boll' },
  { id: 'rsi', label: 'RSI', lessonId: 'rsi' },
  { id: 'macd', label: 'MACD', lessonId: 'macd' }
]

function formatPrice(price: number, isYield?: boolean): string {
  if (isYield) return `${price.toFixed(2)}%`
  return price >= 1000
    ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : `$${price.toFixed(2)}`
}

export default function Workspace(): JSX.Element {
  const { symbol, timeframe, setTimeframe, indicators, toggleIndicator, theme, isInWatchlist, toggleWatchlist } =
    useAppState()
  const [candles, setCandles] = useState<Candle[]>([])
  const [lastBar, setLastBar] = useState<Candle | null>(null)

  useEffect(() => {
    let cancelled = false
    dataService.getCandles(symbol, timeframe).then((data) => {
      if (!cancelled) setCandles(data)
    })
    return () => {
      cancelled = true
    }
  }, [symbol, timeframe])

  const up = symbol.changePct >= 0
  const showOsc = indicators.rsi || indicators.macd
  const oscMode: 'rsi' | 'macd' = indicators.rsi ? 'rsi' : 'macd'

  return (
    <main className="workspace">
      <div className="symbol-header">
        <span className="sym-ticker">{symbol.symbol}</span>
        <span className="sym-name">{symbol.name}</span>
        <button
          className={'star-btn' + (isInWatchlist(symbol.symbol) ? ' active' : '')}
          title={isInWatchlist(symbol.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
          onClick={() => toggleWatchlist(symbol)}
        >
          {isInWatchlist(symbol.symbol) ? '★' : '☆'}
        </button>
        <span className="sym-price tnum">{formatPrice(symbol.price, symbol.isYield)}</span>
        <span
          className="sym-chg tnum"
          style={{
            color: up ? 'var(--gain)' : 'var(--loss)',
            background: up ? 'var(--gain-dim)' : 'var(--loss-dim)'
          }}
        >
          {up ? '+' : ''}
          {symbol.changePct.toFixed(2)}%
        </span>
      </div>

      <div className="toolbar">
        <div className="segmented">
          {TIMEFRAMES.map((tf) => (
            <button key={tf} className={timeframe === tf ? 'active' : ''} onClick={() => setTimeframe(tf)}>
              {tf}
            </button>
          ))}
        </div>
        <div className="indicator-row">
          {INDICATOR_META.map((ind) => (
            <button
              key={ind.id}
              className={'ind-chip' + (indicators[ind.id] ? ' on' : '')}
              data-ind={ind.id}
              onClick={() => toggleIndicator(ind.id)}
            >
              <span className="dot" />
              {ind.label}
            </button>
          ))}
          <InfoIcon lessonId="ma" />
        </div>
      </div>

      <div className="chart-wrap">
        <PriceChart candles={candles} indicators={indicators} theme={theme} onLastBar={setLastBar} />
        {lastBar && (
          <div className="readout tnum">
            <span>
              O <b>{lastBar.open.toFixed(2)}</b>
            </span>
            <span>
              H <b className="u">{lastBar.high.toFixed(2)}</b>
            </span>
            <span>
              L <b className="d">{lastBar.low.toFixed(2)}</b>
            </span>
            <span>
              C <b>{lastBar.close.toFixed(2)}</b>
            </span>
          </div>
        )}
      </div>

      {showOsc && (
        <div className="subpanel">
          <span className="subpanel-label">
            {oscMode === 'rsi' ? 'RSI (14)' : 'MACD (12, 26, 9)'}
            <InfoIcon lessonId={oscMode} />
          </span>
          <OscillatorPanel candles={candles} mode={oscMode} theme={theme} />
        </div>
      )}
    </main>
  )
}
