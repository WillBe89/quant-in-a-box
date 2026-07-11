import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type {
  Candle,
  ChartHoverInfo,
  ChartStyleId,
  ForecastMethodId,
  IndicatorId,
  Timeframe
} from '@renderer/types/market'
import { useAppState } from '@renderer/state/AppStateContext'
import { dataService } from '@renderer/data/dataService'
import PriceChart from '@renderer/components/chart/PriceChart'
import OscillatorPanel from '@renderer/components/chart/OscillatorPanel'
import InfoIcon from '@renderer/academy/InfoIcon'
import { IconAlertTriangle, IconInfo, IconStar } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import AssetSearchBox from '@renderer/components/ui/AssetSearchBox'
import { useDismissablePopover } from '@renderer/lib/useDismissablePopover'
import AssetInsightPanel from './AssetInsightPanel'
import ResizeHandle from './ResizeHandle'

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y', '5Y']
const CHART_STYLES: ChartStyleId[] = ['candles', 'bars', 'line', 'area', 'baseline']
const FORECAST_METHODS: ForecastMethodId[] = ['drift', 'regression', 'montecarlo']

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

const POPOVER_WIDTH = 312

/** Anchors a popover just under `el` in viewport (not ancestor-relative) coordinates, since
 *  it's rendered through a portal into document.body — see the ChartSlot popovers below.
 *  .chart-slot gained `overflow-y: auto` (see layout.css) to fix an unrelated RSI-panel bug,
 *  which turned it into a clipping ancestor for any ordinary position:absolute popover
 *  nested inside it; portaling out, the same way Tooltip.tsx already does, sidesteps that. */
function computeAnchoredPosition(el: HTMLElement | null): { top: number; left: number } | null {
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const maxLeft = window.innerWidth - POPOVER_WIDTH - 8
  return { top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, maxLeft)) }
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
    setSlotSymbol,
    setSlotTimeframe,
    toggleSlotIndicator,
    setSlotChartStyle,
    setSlotForecastMethod,
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
  const [searchOpen, setSearchOpen] = useState(false)
  const [insightOpen, setInsightOpen] = useState(false)
  const { triggerRef: searchTriggerRef, popoverRef: searchPopoverRef } = useDismissablePopover(searchOpen, () =>
    setSearchOpen(false)
  )
  const { triggerRef: insightTriggerRef, popoverRef: insightPopoverRef } = useDismissablePopover(insightOpen, () =>
    setInsightOpen(false)
  )
  const [searchPos, setSearchPos] = useState<{ top: number; left: number } | null>(null)
  const [insightPos, setInsightPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!searchOpen) return
    const update = (): void => setSearchPos(computeAnchoredPosition(searchTriggerRef.current))
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen])

  useEffect(() => {
    if (!insightOpen) return
    const update = (): void => setInsightPos(computeAnchoredPosition(insightTriggerRef.current))
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insightOpen])

  const INDICATOR_META: Array<{ id: IndicatorId; label: string; lessonId: string }> = [
    { id: 'ma20', label: t('workspace.indicatorMa20'), lessonId: 'ma' },
    { id: 'ma50', label: t('workspace.indicatorMa50'), lessonId: 'ma' },
    { id: 'boll', label: t('workspace.indicatorBoll'), lessonId: 'boll' },
    { id: 'rsi', label: t('workspace.indicatorRsi'), lessonId: 'rsi' },
    { id: 'macd', label: t('workspace.indicatorMacd'), lessonId: 'macd' },
    { id: 'forecast', label: t('workspace.indicatorForecast'), lessonId: 'forecast' }
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
        <span className="symbol-trigger-wrap">
          <button
            className="symbol-trigger"
            aria-label={t('workspace.changeSymbol') ?? 'Change symbol'}
            onClick={() => {
              setSearchOpen((prev) => !prev)
              setInsightOpen(false)
            }}
            ref={searchTriggerRef as unknown as RefObject<HTMLButtonElement>}
          >
            <span className="sym-ticker">{slot.symbol.symbol}</span>
            <span className="sym-name">{slot.symbol.name}</span>
          </button>
          {searchOpen &&
            searchPos &&
            createPortal(
              <div
                className="symbol-search-popover"
                style={{ top: searchPos.top, left: searchPos.left }}
                ref={searchPopoverRef as unknown as RefObject<HTMLDivElement>}
              >
                <AssetSearchBox
                  onSelect={(a) => {
                    setSlotSymbol(slotId, a)
                    setSearchOpen(false)
                  }}
                  placeholder={t('workspace.changeSymbolPlaceholder') ?? 'Search any asset'}
                  autoFocus
                />
              </div>,
              document.body
            )}
        </span>
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
        <span className="insight-trigger-wrap">
          <Tooltip label={t('assetInsight.trigger') ?? 'Company profile'}>
            <button
              className={'insight-btn' + (insightOpen ? ' active' : '')}
              aria-label={t('assetInsight.trigger') ?? 'Company profile'}
              onClick={() => {
                setInsightOpen((prev) => !prev)
                setSearchOpen(false)
              }}
              ref={insightTriggerRef as unknown as RefObject<HTMLButtonElement>}
            >
              <IconInfo size={16} />
            </button>
          </Tooltip>
          {insightOpen &&
            insightPos &&
            createPortal(
              <div
                className="asset-insight-popover"
                style={{ top: insightPos.top, left: insightPos.left }}
                ref={insightPopoverRef as unknown as RefObject<HTMLDivElement>}
              >
                <AssetInsightPanel asset={slot.symbol} onClose={() => setInsightOpen(false)} />
              </div>,
              document.body
            )}
        </span>
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
        <div className="segmented">
          {CHART_STYLES.map((cs) => (
            <button
              key={cs}
              className={slot.chartStyle === cs ? 'active' : ''}
              onClick={() => setSlotChartStyle(slotId, cs)}
            >
              {t(`workspace.chartStyle.${cs}`)}
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
        {slot.indicators.forecast && (
          <div className="segmented">
            {FORECAST_METHODS.map((fm) => (
              <button
                key={fm}
                className={slot.forecastMethod === fm ? 'active' : ''}
                onClick={() => setSlotForecastMethod(slotId, fm)}
              >
                {t(`workspace.forecastMethod.${fm}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {slot.indicators.forecast && (
        <div className="chart-forecast-disclaimer">
          <IconAlertTriangle size={16} />
          <div>
            <div className="chart-forecast-disclaimer-title">{t('workspace.forecastDisclaimerTitle')}</div>
            <p>{t('workspace.forecastDisclaimerBody')}</p>
          </div>
        </div>
      )}

      <div className="chart-wrap">
        <PriceChart
          candles={candles}
          indicators={slot.indicators}
          chartStyle={slot.chartStyle}
          forecastMethod={slot.forecastMethod}
          theme={theme}
          onHover={setHover}
        />
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
