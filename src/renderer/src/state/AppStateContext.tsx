import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Asset, AssetClass, IndicatorId, PortfolioPosition, Timeframe } from '@renderer/types/market'
import { ALL_ASSETS, ASSETS_BY_CLASS } from '@renderer/data/mockData'

const WATCHLIST_STORAGE_KEY = 'qiab:watchlist:v1'
const DEFAULT_WATCHLIST_SYMBOLS = ['NVDA', 'BTC', 'US10Y', 'EURUSD', 'VNQ']
const PORTFOLIO_STORAGE_KEY = 'qiab:portfolio:v1'

function loadPortfolio(): PortfolioPosition[] {
  try {
    const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // corrupt/unavailable storage — start empty rather than crash
  }
  return []
}

function loadWatchlist(): Asset[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY)
    if (raw) {
      const symbols: string[] = JSON.parse(raw)
      const assets = symbols.map((s) => ALL_ASSETS.find((a) => a.symbol === s)).filter((a): a is Asset => Boolean(a))
      if (assets.length > 0) return assets
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_WATCHLIST_SYMBOLS.map((s) => ALL_ASSETS.find((a) => a.symbol === s)).filter(
    (a): a is Asset => Boolean(a)
  )
}

interface AppState {
  assetClass: AssetClass | 'all'
  symbol: Asset
  timeframe: Timeframe
  indicators: Record<IndicatorId, boolean>
  watchlist: Asset[]
  theme: 'dark' | 'light'
  academyOpen: boolean
  academyLessonId: string | null

  setAssetClass: (klass: AssetClass | 'all') => void
  selectSymbol: (asset: Asset) => void
  setTimeframe: (tf: Timeframe) => void
  toggleIndicator: (id: IndicatorId) => void
  toggleTheme: () => void
  openAcademy: (lessonId?: string) => void
  closeAcademy: () => void
  isInWatchlist: (symbol: string) => boolean
  toggleWatchlist: (asset: Asset) => void
  portfolio: PortfolioPosition[]
  addPosition: (symbol: string, quantity: number, costBasis: number) => void
  removePosition: (symbol: string) => void
  portfolioOpen: boolean
  openPortfolio: () => void
  closePortfolio: () => void
}

const AppStateCtx = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [assetClass, setAssetClassState] = useState<AssetClass | 'all'>('all')
  const [symbol, setSymbol] = useState<Asset>(ASSETS_BY_CLASS.stocks[0])
  const [timeframe, setTimeframe] = useState<Timeframe>('1M')
  const [indicators, setIndicators] = useState<Record<IndicatorId, boolean>>({
    ma20: true,
    ma50: false,
    boll: false,
    rsi: false,
    macd: false
  })
  const [watchlist, setWatchlist] = useState<Asset[]>(() => loadWatchlist())
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [academyOpen, setAcademyOpen] = useState(false)
  const [academyLessonId, setAcademyLessonId] = useState<string | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>(() => loadPortfolio())
  const [portfolioOpen, setPortfolioOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist.map((a) => a.symbol)))
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [watchlist])

  useEffect(() => {
    try {
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(portfolio))
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [portfolio])

  const setAssetClass = useCallback((klass: AssetClass | 'all') => {
    setAssetClassState(klass)
    const list = klass === 'all' ? Object.values(ASSETS_BY_CLASS).flat() : ASSETS_BY_CLASS[klass]
    if (list[0]) setSymbol(list[0])
  }, [])

  const selectSymbol = useCallback((asset: Asset) => setSymbol(asset), [])

  const toggleIndicator = useCallback((id: IndicatorId) => {
    setIndicators((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])

  const openAcademy = useCallback((lessonId?: string) => {
    setAcademyLessonId(lessonId ?? null)
    setAcademyOpen(true)
  }, [])
  const closeAcademy = useCallback(() => setAcademyOpen(false), [])

  const isInWatchlist = useCallback(
    (sym: string) => watchlist.some((a) => a.symbol === sym),
    [watchlist]
  )

  const toggleWatchlist = useCallback((asset: Asset) => {
    setWatchlist((prev) =>
      prev.some((a) => a.symbol === asset.symbol) ? prev.filter((a) => a.symbol !== asset.symbol) : [...prev, asset]
    )
  }, [])

  const addPosition = useCallback((sym: string, quantity: number, costBasis: number) => {
    setPortfolio((prev) => {
      const existing = prev.find((p) => p.symbol === sym)
      if (existing) {
        // Adding to an existing holding blends into a new average cost basis
        // rather than creating a duplicate row for the same symbol.
        const totalQty = existing.quantity + quantity
        const blendedCost = (existing.quantity * existing.costBasis + quantity * costBasis) / totalQty
        return prev.map((p) => (p.symbol === sym ? { ...p, quantity: totalQty, costBasis: blendedCost } : p))
      }
      return [...prev, { symbol: sym, quantity, costBasis, addedAt: Math.floor(Date.now() / 1000) }]
    })
  }, [])

  const removePosition = useCallback((sym: string) => {
    setPortfolio((prev) => prev.filter((p) => p.symbol !== sym))
  }, [])

  const openPortfolio = useCallback(() => setPortfolioOpen(true), [])
  const closePortfolio = useCallback(() => setPortfolioOpen(false), [])

  const value = useMemo<AppState>(
    () => ({
      assetClass,
      symbol,
      timeframe,
      indicators,
      watchlist,
      theme,
      academyOpen,
      academyLessonId,
      setAssetClass,
      selectSymbol,
      setTimeframe,
      toggleIndicator,
      toggleTheme,
      openAcademy,
      closeAcademy,
      isInWatchlist,
      toggleWatchlist,
      portfolio,
      addPosition,
      removePosition,
      portfolioOpen,
      openPortfolio,
      closePortfolio
    }),
    [
      assetClass,
      symbol,
      timeframe,
      indicators,
      watchlist,
      theme,
      academyOpen,
      academyLessonId,
      setAssetClass,
      selectSymbol,
      toggleIndicator,
      toggleTheme,
      openAcademy,
      closeAcademy,
      isInWatchlist,
      toggleWatchlist,
      portfolio,
      addPosition,
      removePosition,
      portfolioOpen,
      openPortfolio,
      closePortfolio
    ]
  )

  return <AppStateCtx.Provider value={value}>{children}</AppStateCtx.Provider>
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateCtx)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
