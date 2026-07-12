import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MotionConfig } from 'motion/react'
import { AppStateProvider, useAppState } from '@renderer/state/AppStateContext'
import { ALL_ASSETS } from '@renderer/data/mockData'
import { runDailyQuoteAccumulation } from '@renderer/data/dailyQuoteAccumulator'
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
import '@renderer/components/layout/layout.css'

/** Asset classes this daily-quote accumulator covers: 'stocks' and 're' (real estate assets
 *  here are plain equity/ETF/REIT tickers on the same Finnhub pipeline as stocks). NOT because
 *  routing exempts the others — dataService.ts's `pickLiveService` actually routes crypto through
 *  Finnhub identically to stocks/re whenever a Finnhub key is configured, and only exempts
 *  bonds/fx when a TwelveData key is *also* configured (Finnhub-only, bonds/fx hit the same
 *  blocked path too). The real reason crypto/bonds/fx are excluded here is symbol-format
 *  incompatibility: their bare-ticker/yield-series/forex-pair symbols wouldn't resolve as
 *  ordinary stock quotes via Finnhub's `/quote` endpoint even if we tried. */
const DAILY_QUOTE_ASSET_CLASSES: Asset['klass'][] = ['stocks', 're']

/** Wait a few seconds after mount before the first background accumulation pass, so it never
 *  competes with app startup. */
const DAILY_QUOTE_INITIAL_DELAY_MS = 5000

/** Re-run periodically while the app stays open, in case it wasn't open at a useful time earlier
 *  (e.g. outside market hours) or the watchlist/portfolio holdings changed since the last run. */
const DAILY_QUOTE_INTERVAL_MS = 4 * 60 * 60 * 1000

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
    // Union of the watchlist and every portfolio's holdings (same union TickerTape/NewsCard build
    // from these two existing AppStateContext selectors), filtered to the asset classes confirmed
    // above, deduplicated by symbol.
    function relevantAssets(): Asset[] {
      const bySymbol = new Map<string, Asset>()
      for (const a of watchlistRef.current) bySymbol.set(a.symbol, a)
      for (const symbol of allPortfolioSymbolsRef.current) {
        if (bySymbol.has(symbol)) continue
        const a = ALL_ASSETS.find((x) => x.symbol === symbol)
        if (a) bySymbol.set(symbol, a)
      }
      return [...bySymbol.values()].filter((a) => DAILY_QUOTE_ASSET_CLASSES.includes(a.klass))
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
