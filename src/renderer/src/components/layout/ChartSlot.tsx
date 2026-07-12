import { useCallback, useEffect, useRef, useState } from 'react'
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
import { IconAlertTriangle, IconChevronDown, IconClose, IconInfo, IconStar } from '@renderer/components/icons/Icons'
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
    setOscillatorHeightPx,
    forecastDisclaimerMode,
    setForecastDisclaimerMode
  } = useAppState()
  const slot = chartSlots.find((s) => s.id === slotId)
  const [candles, setCandles] = useState<Candle[]>([])
  // Mirrors `slot`/`candles` so handleScrollNearOldestEdge/handleScrollIntoFuture (passed to
  // PriceChart, whose chart-creation effect captures them once and never re-subscribes on prop
  // changes — see PriceChart.tsx) always read the current symbol/timeframe/indicators instead of
  // whatever was current the one time the chart instance itself was (re)created.
  // Assigned directly during render (not inside a useEffect) - lightweight-charts fires
  // subscribeVisibleLogicalRangeChange synchronously as a side effect of fitContent(), which can
  // happen before React gets to run this component's own effects on the same commit. Toggling
  // Forecast on triggers exactly that fitContent() call (to reveal the new projection), which
  // used to read a still-stale `slotRef.current.indicators.forecast === false` from a `useEffect`
  // that hadn't run yet - so handleScrollIntoFuture's guard didn't bail, and it toggled Forecast
  // straight back off, undoing the user's own click. Refs may be written during render (unlike
  // state), so this keeps them permanently in sync a render ahead of any effect timing.
  const slotRef = useRef(slot)
  slotRef.current = slot
  const candlesRef = useRef(candles)
  candlesRef.current = candles
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
    { id: 'volume', label: t('workspace.indicatorVolume'), lessonId: 'ma' },
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


  // Reads whatever's already sitting in local SQLite — from an earlier explicit bulk download
  // (see the Customize panel's "Download historical data" section / historyDownload.ts), or just
  // accumulated from browsing other timeframe views of the same symbol — and prepends it in
  // front of what's currently loaded. Zero new network calls: this only ever reads what's
  // already stored, and does nothing further if there's nothing more to find. Bulk downloads are
  // Finnhub-only (see historyDownload.ts), and for the stocks class this feature targets, the
  // ordinary per-view fetch path also always stores under 'finnhub' (see
  // ReactiveDataService.pickLiveService in dataService.ts — TwelveData is only ever preferred
  // for bonds/fx), so 'finnhub' is the one source key worth checking here.
  const handleScrollNearOldestEdge = useCallback(() => {
    const currentSlot = slotRef.current
    const oldest = candlesRef.current[0]?.time
    if (!currentSlot || oldest == null) return
    window.api
      ?.getStoredCandlesBefore('finnhub', currentSlot.symbol.symbol, currentSlot.timeframe, oldest, 500)
      .then((more) => {
        if (more && more.length > 0) setCandles((prev) => [...more, ...prev])
      })
      .catch(() => undefined)
  }, [])

  // Fired (once per fresh crossing — see PriceChart's onScrollIntoFuture) when the user pans past
  // the last loaded candle into empty future space. Only ever turns the forecast indicator ON —
  // reads slotRef instead of `slot` so this stays the same function identity across renders (it's
  // captured once by PriceChart's chart-creation effect; see handleScrollNearOldestEdge above for
  // why that matters), and bails out if forecast is already on so it can never flip it back off.
  const handleScrollIntoFuture = useCallback(() => {
    const currentSlot = slotRef.current
    if (!currentSlot || currentSlot.indicators.forecast) return
    toggleSlotIndicator(slotId, 'forecast')
  }, [slotId, toggleSlotIndicator])

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

      {slot.indicators.forecast && forecastDisclaimerMode === 'full' && (
        <div className="chart-forecast-disclaimer">
          <IconAlertTriangle size={16} />
          <div className="chart-forecast-disclaimer-body">
            <div className="chart-forecast-disclaimer-title">{t('workspace.forecastDisclaimerTitle')}</div>
            <p>{t('workspace.forecastDisclaimerBody')}</p>
          </div>
          <div className="chart-forecast-disclaimer-actions">
            <Tooltip label={t('workspace.forecastDisclaimerCollapse') ?? ''}>
              <button
                className="card-action-btn"
                onClick={() => setForecastDisclaimerMode('compact')}
                aria-label={t('workspace.forecastDisclaimerCollapse') ?? undefined}
              >
                <IconChevronDown size={12} className="chart-forecast-disclaimer-chev-collapse" />
              </button>
            </Tooltip>
            <Tooltip label={t('workspace.forecastDisclaimerDismiss') ?? ''}>
              <button
                className="card-action-btn"
                onClick={() => setForecastDisclaimerMode('hidden')}
                aria-label={t('workspace.forecastDisclaimerDismiss') ?? undefined}
              >
                <IconClose size={11} />
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {slot.indicators.forecast && forecastDisclaimerMode === 'compact' && (
        <div className="chart-forecast-disclaimer chart-forecast-disclaimer-compact">
          <IconAlertTriangle size={13} />
          <span className="chart-forecast-disclaimer-compact-text">{t('workspace.forecastDisclaimerCompact')}</span>
          <div className="chart-forecast-disclaimer-actions">
            <Tooltip label={t('workspace.forecastDisclaimerExpand') ?? ''}>
              <button
                className="card-action-btn"
                onClick={() => setForecastDisclaimerMode('full')}
                aria-label={t('workspace.forecastDisclaimerExpand') ?? undefined}
              >
                <IconChevronDown size={12} />
              </button>
            </Tooltip>
            <Tooltip label={t('workspace.forecastDisclaimerDismiss') ?? ''}>
              <button
                className="card-action-btn"
                onClick={() => setForecastDisclaimerMode('hidden')}
                aria-label={t('workspace.forecastDisclaimerDismiss') ?? undefined}
              >
                <IconClose size={11} />
              </button>
            </Tooltip>
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
          onScrollNearOldestEdge={handleScrollNearOldestEdge}
          onScrollIntoFuture={handleScrollIntoFuture}
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
