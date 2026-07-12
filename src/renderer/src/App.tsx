import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MotionConfig } from 'motion/react'
import { AppStateProvider, useAppState } from '@renderer/state/AppStateContext'
import { ALL_ASSETS } from '@renderer/data/mockData'
import { runDailyQuoteAccumulation } from '@renderer/data/dailyQuoteAccumulator'
import { runTwelveDataBackfill } from '@renderer/data/twelveDataBackfill'
import { runCoinGeckoAccumulation } from '@renderer/data/coinGeckoAccumulator'
import type { Asset } from '@renderer/types/market'
import Topbar from '@renderer/components/layout/Topbar'
import Rail from '@renderer/components/layout/Rail'
import Workspace from '@renderer/components/layout/Workspace'
import Dock from '@renderer/components/layout/Dock'
import ResizeHandle from '@renderer/components/layout/ResizeHandle'
import TickerTape from '@renderer/components/layout/TickerTape'
import AcademyPanel from '@renderer/academy/AcademyPanel'
import PortfolioWorkspace from '@renderer/components/portfolio/PortfolioWorkspace'
import PortfolioOverviewPanel from '@renderer/components/portfolio/PortfolioOverviewPanel'
import CustomizePanel from '@renderer/components/customize/CustomizePanel'
import DockCardOverlay from '@renderer/components/dock/DockCardOverlay'
import AssetBrowserPanel from '@renderer/components/layout/AssetBrowserPanel'
import '@renderer/components/layout/layout.css'

/** Asset classes this daily-quote accumulator covers: 'stocks' and 're' (real estate assets
 *  here are plain equity/ETF/REIT tickers on the same Finnhub pipeline as stocks). NOT because
 *  dataService.ts's `pickLiveService` routing exempts the others from Finnhub for candles — as of
 *  Phase 8.8 it never routes ANY class to Finnhub for candles when a TwelveData key is configured
 *  (TwelveData is preferred first everywhere), and crypto never touches Finnhub for candles at
 *  all (see pickLiveService's own comment). The real reason crypto/bonds/fx are excluded here is
 *  symbol-format incompatibility with this specific accumulator: their bare-ticker/yield-series/
 *  forex-pair symbols wouldn't resolve as ordinary stock quotes via Finnhub's `/quote` endpoint
 *  even if we tried. TWELVE_DATA_BACKFILL_ASSET_CLASSES below covers all five classes instead,
 *  since TwelveData's own symbol handling (see twelveDataAdapter.ts) does stretch that far. */
const DAILY_QUOTE_ASSET_CLASSES: Asset['klass'][] = ['stocks', 're']

/** Wait a few seconds after mount before the first background accumulation pass, so it never
 *  competes with app startup. */
const DAILY_QUOTE_INITIAL_DELAY_MS = 5000

/** Re-run periodically while the app stays open, in case it wasn't open at a useful time earlier
 *  (e.g. outside market hours) or the watchlist/portfolio holdings changed since the last run. */
const DAILY_QUOTE_INTERVAL_MS = 4 * 60 * 60 * 1000

/** Asset classes twelveDataBackfill.ts covers. Unlike DAILY_QUOTE_ASSET_CLASSES above — limited to
 *  stocks/re because Finnhub's `/quote` symbol conventions don't stretch to crypto/bonds/fx —
 *  TwelveData's own free tier genuinely covers all five classes once its own symbol-format
 *  handling is accounted for (bare tickers for stocks/re/bonds/fx, "BASE/USD" pair notation for
 *  crypto — see twelveDataAdapter.ts), so every class is eligible for backfill here. */
const TWELVE_DATA_BACKFILL_ASSET_CLASSES: Asset['klass'][] = ['stocks', 'crypto', 'bonds', 'fx', 're']

/** Slightly later than the daily-quote accumulator's own initial delay, so the two background
 *  effects don't both start firing network calls in the same instant right after mount. */
const TWELVE_DATA_BACKFILL_INITIAL_DELAY_MS = 9000

/** Re-check roughly once a day while the app stays open. Cheap even though most symbols will
 *  already be within their own ~monthly backfill cadence (see BACKFILL_CADENCE_DAYS in
 *  twelveDataBackfill.ts) and skip straight past — this interval just needs to notice newly-added
 *  watchlist/portfolio symbols reasonably promptly, not re-run the actual backfill that often. */
const TWELVE_DATA_BACKFILL_INTERVAL_MS = 24 * 60 * 60 * 1000

/** Asset classes coinGeckoAccumulator.ts covers: 'crypto' only, and only ever the relevant subset
 *  that also carries a `coingeckoId` (see App.tsx's `relevantCoinGeckoAssets` below) — deliberately
 *  narrow, never the full generated crypto universe, matching Will's own request to accumulate
 *  real crypto history proactively without burning through the Demo-tier credit budget needlessly. */
const COINGECKO_ACCUMULATION_ASSET_CLASSES: Asset['klass'][] = ['crypto']

/** Later still than both existing background effects' own initial delays, so all three don't fire
 *  network calls in the same instant right after mount. */
const COINGECKO_ACCUMULATION_INITIAL_DELAY_MS = 13000

/** Re-run periodically while the app stays open, same "notice newly-added watchlist/portfolio
 *  symbols reasonably promptly" reasoning as the other two background effects — one real daily
 *  candle per relevant crypto asset per day is cheap enough that a several-times-a-day cadence
 *  costs nothing extra once everything's already polled for today (symbolsNeedingPoll simply
 *  returns an empty list). */
const COINGECKO_ACCUMULATION_INTERVAL_MS = 4 * 60 * 60 * 1000

/** Union of the watchlist and every portfolio's holdings (same union TickerTape/NewsCard build
 *  from these two existing AppStateContext selectors), deduplicated by symbol — shared by both
 *  background-accumulation effects below, each filtering the result to its own relevant asset
 *  classes. */
function unionWatchlistAndPortfolioAssets(watchlist: Asset[], portfolioSymbols: string[]): Asset[] {
  const bySymbol = new Map<string, Asset>()
  for (const a of watchlist) bySymbol.set(a.symbol, a)
  for (const symbol of portfolioSymbols) {
    if (bySymbol.has(symbol)) continue
    const a = ALL_ASSETS.find((x) => x.symbol === symbol)
    if (a) bySymbol.set(symbol, a)
  }
  return [...bySymbol.values()]
}

function Shell(): JSX.Element {
  const { t } = useTranslation()
  const { theme, dockWidthPx, setDockWidthPx, glassTiers, watchlist, allPortfolioSymbols } = useAppState()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-glass-panels', String(glassTiers.panels))
    document.documentElement.setAttribute('data-glass-chrome', String(glassTiers.chrome))
    document.documentElement.setAttribute('data-glass-chart', String(glassTiers.chart))
  }, [glassTiers])

  // Kept in refs (rather than effect dependencies) so a watchlist/portfolio edit doesn't reset
  // the initial-delay timer or the recurring interval below — each accumulation pass simply reads
  // the latest union of symbols when it actually fires.
  const watchlistRef = useRef(watchlist)
  watchlistRef.current = watchlist
  const allPortfolioSymbolsRef = useRef(allPortfolioSymbols)
  allPortfolioSymbolsRef.current = allPortfolioSymbols

  useEffect(() => {
    function relevantAssets(): Asset[] {
      return unionWatchlistAndPortfolioAssets(watchlistRef.current, allPortfolioSymbolsRef.current).filter((a) =>
        DAILY_QUOTE_ASSET_CLASSES.includes(a.klass)
      )
    }

    const initialTimer = setTimeout(() => {
      runDailyQuoteAccumulation(relevantAssets())
    }, DAILY_QUOTE_INITIAL_DELAY_MS)

    const interval = setInterval(() => {
      runDailyQuoteAccumulation(relevantAssets())
    }, DAILY_QUOTE_INTERVAL_MS)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [])

  // Phase 8.8 — sibling background effect to the daily-quote one above, but a fundamentally
  // different kind of fetch: a genuine multi-year bulk backfill per symbol (see
  // twelveDataBackfill.ts) rather than one real day accumulated at a time. runTwelveDataBackfill
  // itself no-ops immediately, with zero network calls, whenever no TwelveData key is configured —
  // this effect always fires on the same timers regardless, exactly like the daily-quote effect
  // above always fires regardless of whether a Finnhub key is configured.
  useEffect(() => {
    function relevantBackfillAssets(): Asset[] {
      return unionWatchlistAndPortfolioAssets(watchlistRef.current, allPortfolioSymbolsRef.current).filter((a) =>
        TWELVE_DATA_BACKFILL_ASSET_CLASSES.includes(a.klass)
      )
    }

    const initialTimer = setTimeout(() => {
      runTwelveDataBackfill(relevantBackfillAssets())
    }, TWELVE_DATA_BACKFILL_INITIAL_DELAY_MS)

    const interval = setInterval(() => {
      runTwelveDataBackfill(relevantBackfillAssets())
    }, TWELVE_DATA_BACKFILL_INTERVAL_MS)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [])

  // Phase 8.9 — third sibling background effect: proactive CoinGecko real crypto history
  // accumulation (see coinGeckoAccumulator.ts). runCoinGeckoAccumulation itself no-ops
  // immediately, with zero network calls, whenever no CoinGecko key is configured — this effect
  // always fires on its own timers regardless, exactly like the other two background effects
  // above always fire regardless of whether their own relevant key is configured. Runs
  // independently of whether a TwelveData key is also configured, per Will's own request to
  // "start pulling that too" — not merely as TwelveData's fallback.
  useEffect(() => {
    function relevantCoinGeckoAssets(): Asset[] {
      return unionWatchlistAndPortfolioAssets(watchlistRef.current, allPortfolioSymbolsRef.current).filter(
        (a) => COINGECKO_ACCUMULATION_ASSET_CLASSES.includes(a.klass) && Boolean(a.coingeckoId)
      )
    }

    const initialTimer = setTimeout(() => {
      runCoinGeckoAccumulation(relevantCoinGeckoAssets())
    }, COINGECKO_ACCUMULATION_INITIAL_DELAY_MS)

    const interval = setInterval(() => {
      runCoinGeckoAccumulation(relevantCoinGeckoAssets())
    }, COINGECKO_ACCUMULATION_INTERVAL_MS)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="app">
      <Topbar />
      <div className="body" style={{ ['--dock-width' as string]: `${dockWidthPx}px` }}>
        <Rail />
        <Workspace />
        <ResizeHandle
          axis="horizontal"
          value={dockWidthPx}
          onChange={setDockWidthPx}
          min={260}
          max={520}
          invert
          ariaLabel={t('workspace.resizeDock') ?? 'Resize dashboard width'}
        />
        <Dock />
      </div>
      <TickerTape />
      <AcademyPanel />
      <PortfolioWorkspace />
      <PortfolioOverviewPanel />
      <CustomizePanel />
      <AssetBrowserPanel />
      <DockCardOverlay />
    </div>
  )
}

export default function App(): JSX.Element {
  return (
    <MotionConfig reducedMotion="user">
      <AppStateProvider>
        <Shell />
      </AppStateProvider>
    </MotionConfig>
  )
}
