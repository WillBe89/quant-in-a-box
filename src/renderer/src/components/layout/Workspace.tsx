import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Candle, ChartHoverInfo, IndicatorId, Timeframe } from '@renderer/types/market'
import { useAppState } from '@renderer/state/AppStateContext'
import { dataService } from '@renderer/data/dataService'
import PriceChart from '@renderer/components/chart/PriceChart'
import OscillatorPanel from '@renderer/components/chart/OscillatorPanel'
import InfoIcon from '@renderer/academy/InfoIcon'
import { IconStar } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y', '5Y']

function formatPrice(price: number, isYield?: boolean): string {
  if (isYield) return `${price.toFixed(2)}%`
  return price >= 1000
    ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : `$${price.toFixed(2)}`
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toFixed(0)
}

export default function Workspace(): JSX.Element {
  const { t } = useTranslation()
  const { symbol, timeframe, setTimeframe, indicators, toggleIndicator, theme, isInWatchlist, toggleWatchlist, language } =
    useAppState()
  const [candles, setCandles] = useState<Candle[]>([])
  const [hover, setHover] = useState<ChartHoverInfo | null>(null)

  const INDICATOR_META: Array<{ id: IndicatorId; label: string; lessonId: string }> = [
    { id: 'ma20', label: t('workspace.indicatorMa20'), lessonId: 'ma' },
    { id: 'ma50', label: t('workspace.indicatorMa50'), lessonId: 'ma' },
    { id: 'boll', label: t('workspace.indicatorBoll'), lessonId: 'boll' },
    { id: 'rsi', label: t('workspace.indicatorRsi'), lessonId: 'rsi' },
    { id: 'macd', label: t('workspace.indicatorMacd'), lessonId: 'macd' }
  ]

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
        <Tooltip label={isInWatchlist(symbol.symbol) ? t('workspace.removeFromWatchlist') : t('workspace.addToWatchlist')}>
          <button
            className={'star-btn' + (isInWatchlist(symbol.symbol) ? ' active' : '')}
            aria-label={isInWatchlist(symbol.symbol) ? t('workspace.removeFromWatchlist') : t('workspace.addToWatchlist')}
            onClick={() => toggleWatchlist(symbol)}
          >
            <IconStar size={16} filled={isInWatchlist(symbol.symbol)} />
          </button>
        </Tooltip>
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
        <PriceChart candles={candles} indicators={indicators} theme={theme} onHover={setHover} />
        {hover && (
          <div className="readout">
            <div className="readout-row readout-date">
              {new Date(hover.time * 1000).toLocaleDateString(language, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </div>
            <div className="readout-row tnum">
              <span>
                O <b>{hover.open.toFixed(2)}</b>
              </span>
              <span>
                H <b className="u">{hover.high.toFixed(2)}</b>
              </span>
              <span>
                L <b className="d">{hover.low.toFixed(2)}</b>
              </span>
              <span>
                C <b>{hover.close.toFixed(2)}</b>
              </span>
              <span>
                {t('workspace.volLabel')} <b>{formatVolume(hover.volume)}</b>
              </span>
              {hover.prevClose != null && (
                <span
                  className={'readout-chg ' + (hover.close >= hover.prevClose ? 'u' : 'd')}
                >
                  {hover.close >= hover.prevClose ? '+' : ''}
                  {(((hover.close - hover.prevClose) / hover.prevClose) * 100).toFixed(2)}%
                </span>
              )}
            </div>
            {(hover.ma20 != null || hover.ma50 != null || hover.bollUpper != null) && (
              <div className="readout-row readout-indicators tnum">
                {hover.ma20 != null && indicators.ma20 && (
                  <span className="readout-ma20">
                    {t('workspace.maLabel')}20 <b>{hover.ma20.toFixed(2)}</b>
                  </span>
                )}
                {hover.ma50 != null && indicators.ma50 && (
                  <span className="readout-ma50">
                    {t('workspace.maLabel')}50 <b>{hover.ma50.toFixed(2)}</b>
                  </span>
                )}
                {hover.bollUpper != null && hover.bollLower != null && indicators.boll && (
                  <span className="readout-boll">
                    {t('workspace.indicatorBoll')} <b>{hover.bollLower.toFixed(2)}</b>–<b>{hover.bollUpper.toFixed(2)}</b>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showOsc && (
        <div className="subpanel">
          <span className="subpanel-label">
            {oscMode === 'rsi' ? t('workspace.rsiLabel') : t('workspace.macdLabel')}
            <InfoIcon lessonId={oscMode} />
          </span>
          <OscillatorPanel candles={candles} mode={oscMode} theme={theme} />
        </div>
      )}
    </main>
  )
}
