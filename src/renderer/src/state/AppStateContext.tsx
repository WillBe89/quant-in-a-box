import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type {
  Asset,
  AssetClass,
  ChartStyleId,
  ForecastMethodId,
  IndicatorId,
  NewsCategory,
  Portfolio,
  PortfolioPosition,
  Timeframe
} from '@renderer/types/market'
import { ALL_ASSETS, ASSETS_BY_CLASS, mergeUserAssets } from '@renderer/data/mockData'
import { defaultStyleForPortfolio } from '@renderer/lib/portfolioStyle'
import i18n, { languageDir } from '@renderer/i18n'
import type { ModuleId } from '@renderer/academy/modules'
import { loadAcademyProgress, saveAcademyProgress, type AcademyProgressState } from '@renderer/data/academyProgressStore'
import { applyAttempt, isModuleUnlocked as checkModuleUnlocked } from '@renderer/lib/badgeEarning'
import { scoreAttempt } from '@renderer/lib/academyScoring'
import { remainingCooldownMs as computeRemainingCooldownMs } from '@renderer/lib/academyCooldown'

const WATCHLIST_STORAGE_KEY = 'qiab:watchlist:v1'
const DEFAULT_WATCHLIST_SYMBOLS = ['NVDA', 'BTC', 'US10Y', 'EURUSD', 'VNQ']
const LEGACY_PORTFOLIO_STORAGE_KEY = 'qiab:portfolio:v1'
const PORTFOLIOS_STORAGE_KEY = 'qiab:portfolios:v2'
const LANGUAGE_STORAGE_KEY = 'qiab:language:v1'
const TICKER_SOURCE_STORAGE_KEY = 'qiab:tickerSource:v1'
const NEWS_SOURCE_STORAGE_KEY = 'qiab:newsSource:v1'
const DOCK_LAYOUT_STORAGE_KEY = 'qiab:dockLayout:v1'
const LAYOUT_TEMPLATE_STORAGE_KEY = 'qiab:layoutTemplate:v1'
const CHART_SLOTS_STORAGE_KEY = 'qiab:chartSlots:v1'
const FOCUSED_SLOT_STORAGE_KEY = 'qiab:focusedSlot:v1'
const DOCK_WIDTH_STORAGE_KEY = 'qiab:dockWidthPx:v1'
const OSCILLATOR_HEIGHT_STORAGE_KEY = 'qiab:oscillatorHeightPx:v1'
const GLASS_TIERS_STORAGE_KEY = 'qiab:glassTiers:v1'
const FORECAST_DISCLAIMER_MODE_STORAGE_KEY = 'qiab:forecastDisclaimerMode:v1'
const NEWS_CATEGORIES_STORAGE_KEY = 'qiab:newsCategories:v1'

const DOCK_WIDTH_DEFAULT = 320
const DOCK_WIDTH_MIN = 260
const DOCK_WIDTH_MAX = 520
const OSCILLATOR_HEIGHT_DEFAULT = 108
const OSCILLATOR_HEIGHT_MIN = 80
const OSCILLATOR_HEIGHT_MAX = 260

export type TickerSource = 'watchlist' | 'portfolio' | 'all'
export type NewsSource = 'selected' | 'watchlist' | 'portfolio'
// Global (not per-slot, not per-symbol) preference for how naggy the chart's forecast
// disclaimer is: 'full' is today's unchanged always-rendered block, 'compact' shrinks it to a
// one-line reminder, 'hidden' renders nothing. Deliberately a one-off exception to this app's
// usual "always-rendered, never dismissible" disclaimer stance — see forecastDisclaimerTitle/
// forecastDisclaimerBody usage in ChartSlot.tsx. Does NOT apply to the AI Insights or Academy
// anti-cheating disclaimers, which stay permanently rendered.
export type ForecastDisclaimerMode = 'full' | 'compact' | 'hidden'
export type DockCardId = 'risk' | 'options' | 'news'
// 'modules' is kept as the internal value name for minimal risk (localStorage-adjacent logic
// and any code checking for the literal string 'modules' keeps working) — only its DISPLAY
// label changed, from "Modules" to "Academy" (see academy.modeAcademy in i18n).
export type AcademyMode = 'home' | 'library' | 'modules'

export type LayoutTemplateId = 'single' | 'twoEqual' | 'twoFocus' | 'threeEqual' | 'threeGrid'
const LAYOUT_TEMPLATE_IDS: LayoutTemplateId[] = ['single', 'twoEqual', 'twoFocus', 'threeEqual', 'threeGrid']

export type GlassTier = 'panels' | 'chrome' | 'chart'
export type GlassTierState = Record<GlassTier, boolean>
const DEFAULT_GLASS_TIERS: GlassTierState = { panels: true, chrome: false, chart: false }
const GLASS_TIER_IDS: GlassTier[] = ['panels', 'chrome', 'chart']

/** Fixed display order for the news category chip row (NewsCard.tsx) — independent of
 *  whatever order categories happen to sit in within the persisted/toggled state array. */
export const ALL_NEWS_CATEGORIES: NewsCategory[] = ['general', 'forex', 'crypto', 'merger']

export interface ChartSlotState {
  id: string
  symbol: Asset
  timeframe: Timeframe
  indicators: Record<IndicatorId, boolean>
  chartStyle: ChartStyleId
  forecastMethod: ForecastMethodId
}

const SLOT_IDS = ['slot-0', 'slot-1', 'slot-2'] as const
const VALID_TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y', '5Y']
const VALID_CHART_STYLES: ChartStyleId[] = ['candles', 'bars', 'line', 'area', 'baseline']
const VALID_FORECAST_METHODS: ForecastMethodId[] = ['drift', 'regression', 'montecarlo']

function isSlotId(x: unknown): x is (typeof SLOT_IDS)[number] {
  return x === 'slot-0' || x === 'slot-1' || x === 'slot-2'
}

function isTimeframe(x: unknown): x is Timeframe {
  return typeof x === 'string' && (VALID_TIMEFRAMES as string[]).includes(x)
}

function isChartStyle(x: unknown): x is ChartStyleId {
  return typeof x === 'string' && (VALID_CHART_STYLES as string[]).includes(x)
}

function isForecastMethod(x: unknown): x is ForecastMethodId {
  return typeof x === 'string' && (VALID_FORECAST_METHODS as string[]).includes(x)
}

function defaultIndicators(): Record<IndicatorId, boolean> {
  return { ma20: true, ma50: false, boll: false, rsi: false, macd: false, forecast: false }
}

/** Slot 0 keeps today's exact startup default (first curated stock) so existing users see no
 *  change until they actually switch templates; slots 1/2 default to different asset classes
 *  so a first-time 2/3-up view shows genuinely independent charts, not the same one 3x. */
function defaultChartSlots(): ChartSlotState[] {
  const fallback = ASSETS_BY_CLASS.stocks[0]
  const bySymbol = (ticker: string): Asset => ALL_ASSETS.find((a) => a.symbol === ticker) ?? fallback
  const defaults = [fallback, bySymbol('BTC'), bySymbol('US10Y')]
  return SLOT_IDS.map((id, i) => ({
    id,
    symbol: defaults[i],
    timeframe: '1M' as Timeframe,
    indicators: defaultIndicators(),
    chartStyle: 'candles' as ChartStyleId,
    forecastMethod: 'drift' as ForecastMethodId
  }))
}

export interface DockLayoutState {
  order: DockCardId[]
  hidden: DockCardId[]
}

const DEFAULT_DOCK_ORDER: DockCardId[] = ['risk', 'options', 'news']

function isDockCardId(x: unknown): x is DockCardId {
  return x === 'risk' || x === 'options' || x === 'news'
}

function loadDockLayout(): DockLayoutState {
  try {
    const raw = localStorage.getItem(DOCK_LAYOUT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const storedOrder: DockCardId[] = Array.isArray(parsed.order) ? parsed.order.filter(isDockCardId) : []
      const hidden: DockCardId[] = Array.isArray(parsed.hidden) ? parsed.hidden.filter(isDockCardId) : []
      // Reconcile in any card id missing from a stored order (e.g. a future release adds a 4th card).
      const order = [...storedOrder, ...DEFAULT_DOCK_ORDER.filter((id) => !storedOrder.includes(id))]
      if (order.length === DEFAULT_DOCK_ORDER.length) return { order, hidden }
    }
  } catch {
    // fall through to default
  }
  return { order: DEFAULT_DOCK_ORDER, hidden: [] }
}

function loadGlassTiers(): GlassTierState {
  try {
    const raw = localStorage.getItem(GLASS_TIERS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const result = { ...DEFAULT_GLASS_TIERS }
        for (const tier of GLASS_TIER_IDS) {
          if (typeof parsed[tier] === 'boolean') result[tier] = parsed[tier]
        }
        return result
      }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_GLASS_TIERS
}

function isNewsCategory(x: unknown): x is NewsCategory {
  return typeof x === 'string' && (ALL_NEWS_CATEGORIES as string[]).includes(x)
}

function loadNewsCategories(): NewsCategory[] {
  try {
    const raw = localStorage.getItem(NEWS_CATEGORIES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(isNewsCategory)
        if (filtered.length > 0) return filtered
      }
    }
  } catch {
    // fall through to default
  }
  return ALL_NEWS_CATEGORIES
}

function loadTickerSource(): TickerSource {
  try {
    const raw = localStorage.getItem(TICKER_SOURCE_STORAGE_KEY)
    if (raw === 'watchlist' || raw === 'portfolio' || raw === 'all') return raw
  } catch {
    // fall through to default
  }
  return 'watchlist'
}

function loadNewsSource(): NewsSource {
  try {
    const raw = localStorage.getItem(NEWS_SOURCE_STORAGE_KEY)
    if (raw === 'selected' || raw === 'watchlist' || raw === 'portfolio') return raw
  } catch {
    // fall through to default
  }
  return 'selected'
}

function loadForecastDisclaimerMode(): ForecastDisclaimerMode {
  try {
    const raw = localStorage.getItem(FORECAST_DISCLAIMER_MODE_STORAGE_KEY)
    if (raw === 'full' || raw === 'compact' || raw === 'hidden') return raw
  } catch {
    // fall through to default
  }
  return 'full'
}

function loadLanguage(): string {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? 'en'
  } catch {
    return 'en'
  }
}

function generatePortfolioId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

function isNameTaken(portfolios: Portfolio[], name: string, excludeId?: string): boolean {
  const normalized = name.trim().toLowerCase()
  return portfolios.some((p) => p.id !== excludeId && p.name.trim().toLowerCase() === normalized)
}

/** Smallest-unused-N "Portfolio N" name, not just count+1 (avoids reusing/colliding after a delete). */
function nextDefaultPortfolioName(portfolios: Portfolio[]): string {
  let n = 1
  while (isNameTaken(portfolios, i18n.t('portfolio.defaultName', { n }))) n++
  return i18n.t('portfolio.defaultName', { n })
}

function loadPortfolios(): Portfolio[] {
  try {
    const raw = localStorage.getItem(PORTFOLIOS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // fall through to migration/default
  }
  // Migrate the old single-portfolio shape (a bare PortfolioPosition[]) into a named portfolio.
  try {
    const legacyRaw = localStorage.getItem(LEGACY_PORTFOLIO_STORAGE_KEY)
    if (legacyRaw) {
      const legacyPositions: PortfolioPosition[] = JSON.parse(legacyRaw)
      if (Array.isArray(legacyPositions) && legacyPositions.length > 0) {
        return [{ id: generatePortfolioId(), name: i18n.t('portfolio.defaultName', { n: 1 }), positions: legacyPositions }]
      }
    }
  } catch {
    // corrupt/unavailable storage — start empty rather than crash
  }
  return []
}

function loadLayoutTemplate(): LayoutTemplateId {
  try {
    const raw = localStorage.getItem(LAYOUT_TEMPLATE_STORAGE_KEY)
    if (raw && (LAYOUT_TEMPLATE_IDS as string[]).includes(raw)) return raw as LayoutTemplateId
  } catch {
    // fall through to default
  }
  return 'single'
}

interface StoredChartSlot {
  id: string
  symbolTicker: string
  timeframe: Timeframe
  indicators: Record<IndicatorId, boolean>
  chartStyle: ChartStyleId
  forecastMethod: ForecastMethodId
}

function loadChartSlots(): ChartSlotState[] {
  const defaults = defaultChartSlots()
  try {
    const raw = localStorage.getItem(CHART_SLOTS_STORAGE_KEY)
    if (raw) {
      const parsed: StoredChartSlot[] = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return defaults.map((def) => {
          const stored = parsed.find((p) => p && p.id === def.id)
          if (!stored) return def
          const asset = ALL_ASSETS.find((a) => a.symbol === stored.symbolTicker)
          return {
            id: def.id,
            symbol: asset ?? def.symbol,
            timeframe: isTimeframe(stored.timeframe) ? stored.timeframe : def.timeframe,
            indicators:
              stored.indicators && typeof stored.indicators === 'object'
                ? { ...def.indicators, ...stored.indicators }
                : def.indicators,
            chartStyle: isChartStyle(stored.chartStyle) ? stored.chartStyle : def.chartStyle,
            forecastMethod: isForecastMethod(stored.forecastMethod) ? stored.forecastMethod : def.forecastMethod
          }
        })
      }
    }
  } catch {
    // fall through to defaults
  }
  return defaults
}

function loadFocusedSlotId(): string {
  try {
    const raw = localStorage.getItem(FOCUSED_SLOT_STORAGE_KEY)
    if (raw && isSlotId(raw)) return raw
  } catch {
    // fall through to default
  }
  return 'slot-0'
}

function loadClampedPx(key: string, min: number, max: number, fallback: number): number {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const n = Number(raw)
      if (Number.isFinite(n)) return Math.min(max, Math.max(min, n))
    }
  } catch {
    // fall through to default
  }
  return fallback
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
  symbol: Asset
  timeframe: Timeframe
  indicators: Record<IndicatorId, boolean>
  watchlist: Asset[]
  theme: 'dark' | 'light'
  academyOpen: boolean
  academyLessonId: string | null
  academyMode: AcademyMode

  selectSymbol: (asset: Asset) => void
  setTimeframe: (tf: Timeframe) => void
  toggleIndicator: (id: IndicatorId) => void
  toggleTheme: () => void
  openAcademy: (lessonId?: string) => void
  closeAcademy: () => void
  setAcademyMode: (mode: AcademyMode) => void
  isInWatchlist: (symbol: string) => boolean
  toggleWatchlist: (asset: Asset) => void
  portfolios: Portfolio[]
  openPortfolioIds: string[]
  lastActivePortfolioId: string | null
  createPortfolio: (name?: string) => string
  renamePortfolio: (id: string, name: string) => boolean
  updatePortfolioStyle: (id: string, style: { icon?: string; color?: string }) => void
  deletePortfolio: (id: string) => void
  addPosition: (portfolioId: string, symbol: string, quantity: number, costBasis: number) => void
  removePosition: (portfolioId: string, symbol: string) => void
  openPortfolio: (id: string) => void
  closePortfolioInstance: (id: string) => void
  closeAllPortfolios: () => void
  allPortfolioSymbols: string[]
  language: string
  setLanguage: (code: string) => void
  tickerSource: TickerSource
  setTickerSource: (source: TickerSource) => void
  resetWatchlist: () => void
  customizeOpen: boolean
  openCustomize: () => void
  closeCustomize: () => void
  overviewOpen: boolean
  openOverview: () => void
  closeOverview: () => void
  assetBrowserOpen: boolean
  assetBrowserClassFilter: AssetClass | 'all'
  openAssetBrowser: (klass: AssetClass | 'all') => void
  closeAssetBrowser: () => void
  setAssetBrowserClassFilter: (klass: AssetClass | 'all') => void
  newsSource: NewsSource
  setNewsSource: (source: NewsSource) => void
  expandedCard: DockCardId | null
  openCardOverlay: (id: DockCardId) => void
  closeCardOverlay: () => void
  settingsVersion: number
  bumpSettingsVersion: () => void
  layoutTemplate: LayoutTemplateId
  setLayoutTemplate: (tpl: LayoutTemplateId) => void
  chartSlots: ChartSlotState[]
  focusedSlotId: string
  setFocusedSlotId: (id: string) => void
  setSlotSymbol: (slotId: string, asset: Asset) => void
  setSlotTimeframe: (slotId: string, tf: Timeframe) => void
  toggleSlotIndicator: (slotId: string, id: IndicatorId) => void
  setSlotChartStyle: (slotId: string, style: ChartStyleId) => void
  setSlotForecastMethod: (slotId: string, method: ForecastMethodId) => void
  dockWidthPx: number
  setDockWidthPx: (px: number) => void
  oscillatorHeightPx: number
  setOscillatorHeightPx: (px: number) => void
  glassTiers: GlassTierState
  toggleGlassTier: (tier: GlassTier) => void
  forecastDisclaimerMode: ForecastDisclaimerMode
  setForecastDisclaimerMode: (mode: ForecastDisclaimerMode) => void
  newsCategories: NewsCategory[]
  toggleNewsCategory: (cat: NewsCategory) => void
}

export interface DockLayoutContextValue {
  dockOrder: DockCardId[]
  dockHidden: DockCardId[]
  setDockOrder: (order: DockCardId[]) => void
  toggleDockCardHidden: (id: DockCardId) => void
  resetDockLayout: () => void
}

export interface AttemptOutcome {
  scorePct: number
  passed: boolean
  /** True only if this exact attempt is what flipped this module's `passed` from false to true
   *  (i.e. the badge was just earned) — used to trigger the badge-unlock celebration once. */
  justEarned: boolean
}

/** Deliberately a separate, smaller context from AppState (mirrors DockLayoutCtx just below) —
 *  nothing outside Academy needs to read quiz/badge progress, so it stays out of the already-
 *  large global AppState interface/useAppState() hook. */
export interface AcademyProgressContextValue {
  progress: AcademyProgressState
  isModuleUnlocked: (moduleId: ModuleId) => boolean
  remainingCooldownMs: (moduleId: ModuleId, now?: number) => number
  recordAttempt: (moduleId: ModuleId, correctCount: number, totalCount: number, now?: number) => AttemptOutcome
}

const AppStateCtx = createContext<AppState | null>(null)
const DockLayoutCtx = createContext<DockLayoutContextValue | null>(null)
const AcademyProgressCtx = createContext<AcademyProgressContextValue | null>(null)

export function AppStateProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [layoutTemplate, setLayoutTemplateState] = useState<LayoutTemplateId>(() => loadLayoutTemplate())
  const [chartSlots, setChartSlots] = useState<ChartSlotState[]>(() => loadChartSlots())
  const [focusedSlotId, setFocusedSlotIdState] = useState<string>(() => loadFocusedSlotId())
  const [dockWidthPx, setDockWidthPxState] = useState<number>(() =>
    loadClampedPx(DOCK_WIDTH_STORAGE_KEY, DOCK_WIDTH_MIN, DOCK_WIDTH_MAX, DOCK_WIDTH_DEFAULT)
  )
  const [oscillatorHeightPx, setOscillatorHeightPxState] = useState<number>(() =>
    loadClampedPx(OSCILLATOR_HEIGHT_STORAGE_KEY, OSCILLATOR_HEIGHT_MIN, OSCILLATOR_HEIGHT_MAX, OSCILLATOR_HEIGHT_DEFAULT)
  )
  const [glassTiers, setGlassTiers] = useState<GlassTierState>(() => loadGlassTiers())
  const [forecastDisclaimerMode, setForecastDisclaimerModeState] = useState<ForecastDisclaimerMode>(() =>
    loadForecastDisclaimerMode()
  )
  const [newsCategories, setNewsCategories] = useState<NewsCategory[]>(() => loadNewsCategories())
  const focusedSlot = useMemo(
    () => chartSlots.find((s) => s.id === focusedSlotId) ?? chartSlots[0],
    [chartSlots, focusedSlotId]
  )
  const symbol = focusedSlot.symbol
  const timeframe = focusedSlot.timeframe
  const indicators = focusedSlot.indicators
  const [watchlist, setWatchlist] = useState<Asset[]>(() => loadWatchlist())
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [academyOpen, setAcademyOpen] = useState(false)
  const [academyLessonId, setAcademyLessonId] = useState<string | null>(null)
  // Ephemeral, not persisted — mirrors academyOpen/academyLessonId exactly (resets to Home
  // on every app launch). openAcademy(lessonId) forces it to 'library' (a deep-link always
  // wants the specific lesson); openAcademy() with no id (the Rail's plain "Teaching zone"
  // button) forces it to 'home' so every plain visit explains the two modes first, rather
  // than landing wherever the user last happened to leave it.
  const [academyMode, setAcademyModeState] = useState<AcademyMode>('home')
  const [academyProgress, setAcademyProgress] = useState<AcademyProgressState>(() => loadAcademyProgress())
  const [portfolios, setPortfolios] = useState<Portfolio[]>(() => loadPortfolios())
  const [openPortfolioIds, setOpenPortfolioIds] = useState<string[]>([])
  const [lastActivePortfolioId, setLastActivePortfolioId] = useState<string | null>(null)
  const [language, setLanguageState] = useState<string>(() => loadLanguage())
  const [tickerSource, setTickerSourceState] = useState<TickerSource>(() => loadTickerSource())
  const [customizeOpen, setCustomizeOpen] = useState(false)
  // Ephemeral, not persisted — mirrors customizeOpen exactly. Whether the aggregate Overview
  // panel is open resets to closed on every app launch, same as Customize/Academy.
  const [overviewOpen, setOverviewOpen] = useState(false)
  // Ephemeral, not persisted — same lifecycle as overviewOpen/customizeOpen above. The class
  // filter defaults to 'all' so a plain "browse everything" entry point never needs a separate
  // trigger — see Topbar's "All" chip.
  const [assetBrowserOpen, setAssetBrowserOpen] = useState(false)
  const [assetBrowserClassFilter, setAssetBrowserClassFilterState] = useState<AssetClass | 'all'>('all')
  const [newsSource, setNewsSourceState] = useState<NewsSource>(() => loadNewsSource())
  const [dockLayout, setDockLayoutState] = useState<DockLayoutState>(() => loadDockLayout())
  const [expandedCard, setExpandedCard] = useState<DockCardId | null>(null)
  const [settingsVersion, setSettingsVersion] = useState(0)

  // Loads listings the user has personally imported (Customize > Import local listings) and
  // merges them into the shared ALL_ASSETS/ASSETS_BY_CLASS.stocks arrays once at startup — see
  // mergeUserAssets's own header comment in mockData.ts for why this makes the static ALL_ASSETS
  // import effectively dynamic without any other call site needing to change. Best-effort only:
  // if this IPC call ever fails, the app simply runs with whatever's bundled, same as before this
  // feature existed, rather than surfacing an error for a background enrichment step.
  useEffect(() => {
    let cancelled = false
    Promise.resolve(window.api?.getUserAssets())
      .then((records) => {
        if (!cancelled && records && records.length > 0) mergeUserAssets(records)
      })
      .catch(() => {
        // best-effort only; see comment above
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    i18n.changeLanguage(language)
    document.documentElement.setAttribute('dir', languageDir(language))
    document.documentElement.setAttribute('lang', language)
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [language])

  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist.map((a) => a.symbol)))
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [watchlist])

  useEffect(() => {
    try {
      localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(portfolios))
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [portfolios])

  useEffect(() => {
    try {
      localStorage.setItem(TICKER_SOURCE_STORAGE_KEY, tickerSource)
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [tickerSource])

  useEffect(() => {
    try {
      localStorage.setItem(NEWS_SOURCE_STORAGE_KEY, newsSource)
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [newsSource])

  useEffect(() => {
    try {
      localStorage.setItem(DOCK_LAYOUT_STORAGE_KEY, JSON.stringify(dockLayout))
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [dockLayout])

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_TEMPLATE_STORAGE_KEY, layoutTemplate)
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [layoutTemplate])

  useEffect(() => {
    try {
      const serializable: StoredChartSlot[] = chartSlots.map((s) => ({
        id: s.id,
        symbolTicker: s.symbol.symbol,
        timeframe: s.timeframe,
        indicators: s.indicators,
        chartStyle: s.chartStyle,
        forecastMethod: s.forecastMethod
      }))
      localStorage.setItem(CHART_SLOTS_STORAGE_KEY, JSON.stringify(serializable))
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [chartSlots])

  useEffect(() => {
    try {
      localStorage.setItem(FOCUSED_SLOT_STORAGE_KEY, focusedSlotId)
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [focusedSlotId])

  useEffect(() => {
    try {
      localStorage.setItem(DOCK_WIDTH_STORAGE_KEY, String(dockWidthPx))
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [dockWidthPx])

  useEffect(() => {
    try {
      localStorage.setItem(OSCILLATOR_HEIGHT_STORAGE_KEY, String(oscillatorHeightPx))
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [oscillatorHeightPx])

  useEffect(() => {
    try {
      localStorage.setItem(GLASS_TIERS_STORAGE_KEY, JSON.stringify(glassTiers))
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [glassTiers])

  useEffect(() => {
    try {
      localStorage.setItem(FORECAST_DISCLAIMER_MODE_STORAGE_KEY, forecastDisclaimerMode)
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [forecastDisclaimerMode])

  useEffect(() => {
    try {
      localStorage.setItem(NEWS_CATEGORIES_STORAGE_KEY, JSON.stringify(newsCategories))
    } catch {
      // best-effort persistence; ignore quota/availability errors
    }
  }, [newsCategories])

  useEffect(() => {
    saveAcademyProgress(academyProgress)
  }, [academyProgress])

  const setLayoutTemplate = useCallback((tpl: LayoutTemplateId) => setLayoutTemplateState(tpl), [])
  const setFocusedSlotId = useCallback((id: string) => setFocusedSlotIdState(id), [])

  const setDockWidthPx = useCallback((px: number) => {
    setDockWidthPxState(Math.min(DOCK_WIDTH_MAX, Math.max(DOCK_WIDTH_MIN, px)))
  }, [])
  const setOscillatorHeightPx = useCallback((px: number) => {
    setOscillatorHeightPxState(Math.min(OSCILLATOR_HEIGHT_MAX, Math.max(OSCILLATOR_HEIGHT_MIN, px)))
  }, [])
  const toggleGlassTier = useCallback((tier: GlassTier) => {
    setGlassTiers((prev) => ({ ...prev, [tier]: !prev[tier] }))
  }, [])
  const setForecastDisclaimerMode = useCallback(
    (mode: ForecastDisclaimerMode) => setForecastDisclaimerModeState(mode),
    []
  )
  const toggleNewsCategory = useCallback((cat: NewsCategory) => {
    setNewsCategories((prev) => {
      if (prev.includes(cat)) {
        // Never allow disabling the last remaining active category — a no-op instead of
        // silently leaving zero categories active, which would blank the feed with no way
        // back via the chip row itself (every chip would read as "off").
        if (prev.length === 1) return prev
        return prev.filter((c) => c !== cat)
      }
      return [...prev, cat]
    })
  }, [])

  const setSlotSymbol = useCallback((slotId: string, asset: Asset) => {
    setChartSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, symbol: asset } : s)))
  }, [])
  const setSlotTimeframe = useCallback((slotId: string, tf: Timeframe) => {
    setChartSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, timeframe: tf } : s)))
  }, [])
  const setSlotChartStyle = useCallback((slotId: string, style: ChartStyleId) => {
    setChartSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, chartStyle: style } : s)))
  }, [])
  const setSlotForecastMethod = useCallback((slotId: string, method: ForecastMethodId) => {
    setChartSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, forecastMethod: method } : s)))
  }, [])
  const toggleSlotIndicator = useCallback((slotId: string, id: IndicatorId) => {
    setChartSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, indicators: { ...s.indicators, [id]: !s.indicators[id] } } : s))
    )
  }, [])

  // symbol/timeframe/indicators (and their setters below) always target the currently-focused
  // chart slot — every existing consumer (dock cards, Topbar search) keeps working unchanged,
  // it just now reads/writes "whichever chart is focused" instead of one fixed global.

  const selectSymbol = useCallback((asset: Asset) => setSlotSymbol(focusedSlotId, asset), [focusedSlotId, setSlotSymbol])

  const setTimeframe = useCallback(
    (tf: Timeframe) => setSlotTimeframe(focusedSlotId, tf),
    [focusedSlotId, setSlotTimeframe]
  )

  const toggleIndicator = useCallback(
    (id: IndicatorId) => toggleSlotIndicator(focusedSlotId, id),
    [focusedSlotId, toggleSlotIndicator]
  )

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])

  const openAcademy = useCallback((lessonId?: string) => {
    setAcademyLessonId(lessonId ?? null)
    // A deep-link (called WITH a lessonId, e.g. an InfoIcon) forces Library, so the specific
    // lesson shows immediately. The Rail "Teaching Zone" button calls this with no id and
    // always forces Home instead, so every plain visit lands on the explanatory home screen
    // rather than wherever the user last happened to leave it.
    setAcademyModeState(lessonId ? 'library' : 'home')
    setAcademyOpen(true)
  }, [])
  const closeAcademy = useCallback(() => setAcademyOpen(false), [])
  const setAcademyMode = useCallback((mode: AcademyMode) => setAcademyModeState(mode), [])

  const recordAttempt = useCallback(
    (moduleId: ModuleId, correctCount: number, totalCount: number, now: number = Date.now()): AttemptOutcome => {
      const { scorePct, passed } = scoreAttempt(correctCount, totalCount)
      const prevRecord = academyProgress[moduleId]
      const nextRecord = applyAttempt(prevRecord, scorePct, passed, now)
      const justEarned = prevRecord?.passed !== true && nextRecord.passed
      setAcademyProgress((prev) => ({ ...prev, [moduleId]: nextRecord }))
      return { scorePct, passed, justEarned }
    },
    [academyProgress]
  )

  const isModuleUnlockedFn = useCallback(
    (moduleId: ModuleId) => checkModuleUnlocked(moduleId, academyProgress),
    [academyProgress]
  )

  const remainingCooldownMsFn = useCallback(
    (moduleId: ModuleId, now: number = Date.now()) => computeRemainingCooldownMs(academyProgress[moduleId]?.lastAttemptAt, now),
    [academyProgress]
  )

  const isInWatchlist = useCallback(
    (sym: string) => watchlist.some((a) => a.symbol === sym),
    [watchlist]
  )

  const toggleWatchlist = useCallback((asset: Asset) => {
    setWatchlist((prev) =>
      prev.some((a) => a.symbol === asset.symbol) ? prev.filter((a) => a.symbol !== asset.symbol) : [...prev, asset]
    )
  }, [])

  const addPosition = useCallback((portfolioId: string, sym: string, quantity: number, costBasis: number) => {
    setPortfolios((prev) =>
      prev.map((p) => {
        if (p.id !== portfolioId) return p
        const existing = p.positions.find((pos) => pos.symbol === sym)
        if (existing) {
          // Adding to an existing holding blends into a new average cost basis
          // rather than creating a duplicate row for the same symbol.
          const totalQty = existing.quantity + quantity
          const blendedCost = (existing.quantity * existing.costBasis + quantity * costBasis) / totalQty
          return {
            ...p,
            positions: p.positions.map((pos) =>
              pos.symbol === sym ? { ...pos, quantity: totalQty, costBasis: blendedCost } : pos
            )
          }
        }
        return {
          ...p,
          positions: [...p.positions, { symbol: sym, quantity, costBasis, addedAt: Math.floor(Date.now() / 1000) }]
        }
      })
    )
  }, [])

  const removePosition = useCallback((portfolioId: string, sym: string) => {
    setPortfolios((prev) =>
      prev.map((p) => (p.id === portfolioId ? { ...p, positions: p.positions.filter((pos) => pos.symbol !== sym) } : p))
    )
  }, [])

  const createPortfolio = useCallback((name?: string) => {
    const id = generatePortfolioId()
    setPortfolios((prev) => {
      const finalName = name && name.trim() && !isNameTaken(prev, name) ? name.trim() : nextDefaultPortfolioName(prev)
      const style = defaultStyleForPortfolio(prev.length)
      return [...prev, { id, name: finalName, positions: [], icon: style.icon, color: style.color }]
    })
    return id
  }, [])

  const renamePortfolio = useCallback((id: string, name: string): boolean => {
    const trimmed = name.trim()
    if (!trimmed) return false
    let success = false
    setPortfolios((prev) => {
      if (isNameTaken(prev, trimmed, id)) {
        success = false
        return prev
      }
      success = true
      return prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p))
    })
    return success
  }, [])

  const updatePortfolioStyle = useCallback((id: string, style: { icon?: string; color?: string }) => {
    setPortfolios((prev) => prev.map((p) => (p.id === id ? { ...p, ...style } : p)))
  }, [])

  const deletePortfolio = useCallback((id: string) => {
    setPortfolios((prev) => prev.filter((p) => p.id !== id))
    setOpenPortfolioIds((prev) => prev.filter((openId) => openId !== id))
  }, [])

  const openPortfolio = useCallback((id: string) => {
    setOpenPortfolioIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setLastActivePortfolioId(id)
  }, [])
  const closePortfolioInstance = useCallback((id: string) => {
    setOpenPortfolioIds((prev) => prev.filter((openId) => openId !== id))
  }, [])
  const closeAllPortfolios = useCallback(() => setOpenPortfolioIds([]), [])

  const allPortfolioSymbols = useMemo(() => {
    const symbols = new Set<string>()
    for (const p of portfolios) for (const pos of p.positions) symbols.add(pos.symbol)
    return [...symbols]
  }, [portfolios])

  const setLanguage = useCallback((code: string) => setLanguageState(code), [])
  const setTickerSource = useCallback((source: TickerSource) => setTickerSourceState(source), [])

  const resetWatchlist = useCallback(() => {
    setWatchlist(
      DEFAULT_WATCHLIST_SYMBOLS.map((s) => ALL_ASSETS.find((a) => a.symbol === s)).filter((a): a is Asset =>
        Boolean(a)
      )
    )
  }, [])

  const openCustomize = useCallback(() => setCustomizeOpen(true), [])
  const closeCustomize = useCallback(() => setCustomizeOpen(false), [])
  const openOverview = useCallback(() => setOverviewOpen(true), [])
  const closeOverview = useCallback(() => setOverviewOpen(false), [])
  const setAssetBrowserClassFilter = useCallback((klass: AssetClass | 'all') => setAssetBrowserClassFilterState(klass), [])
  const openAssetBrowser = useCallback((klass: AssetClass | 'all') => {
    setAssetBrowserClassFilterState(klass)
    setAssetBrowserOpen(true)
  }, [])
  const closeAssetBrowser = useCallback(() => setAssetBrowserOpen(false), [])
  const setNewsSource = useCallback((source: NewsSource) => setNewsSourceState(source), [])

  const setDockOrder = useCallback((order: DockCardId[]) => {
    setDockLayoutState((prev) => ({ ...prev, order }))
  }, [])
  const toggleDockCardHidden = useCallback((id: DockCardId) => {
    setDockLayoutState((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(id) ? prev.hidden.filter((h) => h !== id) : [...prev.hidden, id]
    }))
  }, [])
  const resetDockLayout = useCallback(() => {
    setDockLayoutState({ order: DEFAULT_DOCK_ORDER, hidden: [] })
  }, [])
  const openCardOverlay = useCallback((id: DockCardId) => setExpandedCard(id), [])
  const closeCardOverlay = useCallback(() => setExpandedCard(null), [])
  const bumpSettingsVersion = useCallback(() => setSettingsVersion((v) => v + 1), [])

  const dockLayoutValue = useMemo<DockLayoutContextValue>(
    () => ({
      dockOrder: dockLayout.order,
      dockHidden: dockLayout.hidden,
      setDockOrder,
      toggleDockCardHidden,
      resetDockLayout
    }),
    [dockLayout, setDockOrder, toggleDockCardHidden, resetDockLayout]
  )

  const academyProgressValue = useMemo<AcademyProgressContextValue>(
    () => ({
      progress: academyProgress,
      isModuleUnlocked: isModuleUnlockedFn,
      remainingCooldownMs: remainingCooldownMsFn,
      recordAttempt
    }),
    [academyProgress, isModuleUnlockedFn, remainingCooldownMsFn, recordAttempt]
  )

  const value = useMemo<AppState>(
    () => ({
      symbol,
      timeframe,
      indicators,
      watchlist,
      theme,
      academyOpen,
      academyLessonId,
      academyMode,
      selectSymbol,
      setTimeframe,
      toggleIndicator,
      toggleTheme,
      openAcademy,
      closeAcademy,
      setAcademyMode,
      isInWatchlist,
      toggleWatchlist,
      portfolios,
      openPortfolioIds,
      lastActivePortfolioId,
      createPortfolio,
      renamePortfolio,
      updatePortfolioStyle,
      deletePortfolio,
      addPosition,
      removePosition,
      openPortfolio,
      closePortfolioInstance,
      closeAllPortfolios,
      allPortfolioSymbols,
      language,
      setLanguage,
      tickerSource,
      setTickerSource,
      resetWatchlist,
      customizeOpen,
      openCustomize,
      closeCustomize,
      overviewOpen,
      openOverview,
      closeOverview,
      assetBrowserOpen,
      assetBrowserClassFilter,
      openAssetBrowser,
      closeAssetBrowser,
      setAssetBrowserClassFilter,
      newsSource,
      setNewsSource,
      expandedCard,
      openCardOverlay,
      closeCardOverlay,
      settingsVersion,
      bumpSettingsVersion,
      layoutTemplate,
      setLayoutTemplate,
      chartSlots,
      focusedSlotId,
      setFocusedSlotId,
      setSlotSymbol,
      setSlotTimeframe,
      toggleSlotIndicator,
      setSlotChartStyle,
      setSlotForecastMethod,
      dockWidthPx,
      setDockWidthPx,
      oscillatorHeightPx,
      setOscillatorHeightPx,
      glassTiers,
      toggleGlassTier,
      forecastDisclaimerMode,
      setForecastDisclaimerMode,
      newsCategories,
      toggleNewsCategory
    }),
    [
      symbol,
      timeframe,
      indicators,
      watchlist,
      theme,
      academyOpen,
      academyLessonId,
      academyMode,
      selectSymbol,
      toggleIndicator,
      toggleTheme,
      openAcademy,
      closeAcademy,
      setAcademyMode,
      isInWatchlist,
      toggleWatchlist,
      portfolios,
      openPortfolioIds,
      lastActivePortfolioId,
      createPortfolio,
      renamePortfolio,
      updatePortfolioStyle,
      deletePortfolio,
      addPosition,
      removePosition,
      openPortfolio,
      closePortfolioInstance,
      closeAllPortfolios,
      allPortfolioSymbols,
      language,
      setLanguage,
      tickerSource,
      setTickerSource,
      resetWatchlist,
      customizeOpen,
      openCustomize,
      closeCustomize,
      overviewOpen,
      openOverview,
      closeOverview,
      assetBrowserOpen,
      assetBrowserClassFilter,
      openAssetBrowser,
      closeAssetBrowser,
      setAssetBrowserClassFilter,
      newsSource,
      setNewsSource,
      expandedCard,
      openCardOverlay,
      closeCardOverlay,
      settingsVersion,
      bumpSettingsVersion,
      layoutTemplate,
      setLayoutTemplate,
      chartSlots,
      focusedSlotId,
      setFocusedSlotId,
      setSlotSymbol,
      setSlotTimeframe,
      toggleSlotIndicator,
      setSlotChartStyle,
      setSlotForecastMethod,
      dockWidthPx,
      setDockWidthPx,
      oscillatorHeightPx,
      setOscillatorHeightPx,
      glassTiers,
      toggleGlassTier,
      forecastDisclaimerMode,
      setForecastDisclaimerMode,
      newsCategories,
      toggleNewsCategory
    ]
  )

  return (
    <AppStateCtx.Provider value={value}>
      <DockLayoutCtx.Provider value={dockLayoutValue}>
        <AcademyProgressCtx.Provider value={academyProgressValue}>{children}</AcademyProgressCtx.Provider>
      </DockLayoutCtx.Provider>
    </AppStateCtx.Provider>
  )
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateCtx)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}

export function useDockLayout(): DockLayoutContextValue {
  const ctx = useContext(DockLayoutCtx)
  if (!ctx) throw new Error('useDockLayout must be used within AppStateProvider')
  return ctx
}

export function useAcademyProgress(): AcademyProgressContextValue {
  const ctx = useContext(AcademyProgressCtx)
  if (!ctx) throw new Error('useAcademyProgress must be used within AppStateProvider')
  return ctx
}
