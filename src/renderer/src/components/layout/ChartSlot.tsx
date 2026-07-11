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
import ResizeHandle from './ResizeHandle'

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

export default function ChartSlot({
  slotId,
  focused,
  onFocus
}: {
  slotId: string
  focused: boolean
  onFocus: () => void
}): JSX.Element | null {
  const { t } = useTranslation()
  const {
    chartSlots,
    setSlotTimeframe,
    toggleSlotIndicator,
    theme,
    isInWatchlist,
    toggleWatchlist,
    language,
    oscillatorHeightPx,
    setOscillatorHeightPx
  } = useAppState()
  const slot = chartSlots.find((s) => s.id === slotId)
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
    if (!slot) return
    let cancelled = false
    dataService.getCandles(slot.symbol, slot.timeframe).then((data) => {
      if (!cancelled) setCandles(data)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot?.symbol, slot?.timeframe])

  if (!slot) return null

  const up = slot.symbol.changePct >= 0
  const showOsc = slot.indicators.rsi || slot.indicators.macd
  const oscMode: 'rsi' | 'macd' = slot.indicators.rsi ? 'rsi' : 'macd'

  return (
    <section className={'chart-slot' + (focused ? ' focused' : '')} onClick={onFocus}>
      <div className="symbol-header">
        <span className="sym-ticker">{slot.symbol.symbol}</span>
        <span className="sym-name">{slot.symbol.name}</span>
        <Tooltip
          label={isInWatchlist(slot.symbol.symbol) ? t('workspace.removeFromWatchlist') : t('workspace.addToWatchlist')}
        >
          <button
            className={'star-btn' + (isInWatchlist(slot.symbol.symbol) ? ' active' : '')}
            aria-label={
              isInWatchlist(slot.symbol.symbol) ? t('workspace.removeFromWatchlist') : t('workspace.addToWatchlist')
            }
            onClick={() => toggleWatchlist(slot.symbol)}
          >
            <IconStar size={16} filled={isInWatchlist(slot.symbol.symbol)} />
          </button>
        </Tooltip>
        <span className="sym-price tnum">{formatPrice(slot.symbol.price, slot.symbol.isYield)}</span>
        <span
          className="sym-chg tnum"
          style={{
            color: up ? 'var(--gain)' : 'var(--loss)',
            background: up ? 'var(--gain-dim)' : 'var(--loss-dim)'
          }}
        >
          {up ? '+' : ''}
          {slot.symbol.changePct.toFixed(2)}%
        </span>
      </div>

      <div className="toolbar">
        <div className="segmented">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              className={slot.timeframe === tf ? 'active' : ''}
              onClick={() => setSlotTimeframe(slotId, tf)}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="indicator-row">
          {INDICATOR_META.map((ind) => (
            <button
              key={ind.id}
              className={'ind-chip' + (slot.indicators[ind.id] ? ' on' : '')}
              data-ind={ind.id}
              onClick={() => toggleSlotIndicator(slotId, ind.id)}
            >
              <span className="dot" />
              {ind.label}
            </button>
          ))}
          <InfoIcon lessonId="ma" />
        </div>
      </div>

      <div className="chart-wrap">
        <PriceChart candles={candles} indicators={slot.indicators} theme={theme} onHover={setHover} />
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
                <span className={'readout-chg ' + (hover.close >= hover.prevClose ? 'u' : 'd')}>
                  {hover.close >= hover.prevClose ? '+' : ''}
                  {(((hover.close - hover.prevClose) / hover.prevClose) * 100).toFixed(2)}%
                </span>
              )}
            </div>
            {(hover.ma20 != null || hover.ma50 != null || hover.bollUpper != null) && (
              <div className="readout-row readout-indicators tnum">
                {hover.ma20 != null && slot.indicators.ma20 && (
                  <span className="readout-ma20">
                    {t('workspace.maLabel')}20 <b>{hover.ma20.toFixed(2)}</b>
                  </span>
                )}
                {hover.ma50 != null && slot.indicators.ma50 && (
                  <span className="readout-ma50">
                    {t('workspace.maLabel')}50 <b>{hover.ma50.toFixed(2)}</b>
                  </span>
                )}
                {hover.bollUpper != null && hover.bollLower != null && slot.indicators.boll && (
                  <span className="readout-boll">
                    {t('workspace.indicatorBoll')} <b>{hover.bollLower.toFixed(2)}</b>
                    {'–'}
                    <b>{hover.bollUpper.toFixed(2)}</b>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showOsc && (
        <>
          <ResizeHandle
            axis="vertical"
            value={oscillatorHeightPx}
            onChange={setOscillatorHeightPx}
            min={80}
            max={260}
            invert
            ariaLabel={t('workspace.resizeOscillator') ?? 'Resize indicator panel height'}
          />
          <div className="subpanel" style={{ height: oscillatorHeightPx, marginTop: 0 }}>
            <span className="subpanel-label">
              {oscMode === 'rsi' ? t('workspace.rsiLabel') : t('workspace.macdLabel')}
              <InfoIcon lessonId={oscMode} />
            </span>
            <OscillatorPanel candles={candles} mode={oscMode} theme={theme} />
          </div>
        </>
      )}
    </section>
  )
}
