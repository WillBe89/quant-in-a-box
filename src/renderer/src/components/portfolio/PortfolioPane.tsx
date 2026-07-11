import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import { ALL_ASSETS } from '@renderer/data/mockData'
import { dataService } from '@renderer/data/dataService'
import { generateCandles } from '@renderer/data/mockData'
import {
  beta as betaCalc,
  closesOf,
  dailyReturns,
  historicalVaR,
  maxDrawdown,
  sharpeRatio,
  sortinoRatio,
  volatilityAnnualized
} from '@renderer/lib/quant'
import { cumulativeValueSeries, weightedPortfolioReturns } from '@renderer/lib/portfolioMath'
import { searchAssets } from '@renderer/lib/assetSearch'
import RiskStatTile from '@renderer/components/stats/RiskStatTile'
import { IconClose, IconSparkle, IconAlertTriangle } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import { SUPPORTED_LANGUAGES } from '@renderer/i18n'
import type { Asset, PortfolioRiskStats } from '@renderer/types/market'
import './portfolio.css'

type AiAvailability = { claudeCode: boolean; apiKey: boolean }
type AiInsightsResult = { commentary: string; source: 'claude-code' | 'api-key' }

const BENCHMARK: Asset = { symbol: 'SPXPROXY', name: 'Broad market proxy', klass: 'stocks', price: 5500, changePct: 0.5 }

interface Row {
  asset: Asset
  quantity: number
  costBasis: number
  currentPrice: number
  marketValue: number
  costTotal: number
  pnl: number
  pnlPct: number
  weightPct: number
}

export default function PortfolioPane({
  portfolioId,
  onClose
}: {
  portfolioId: string
  onClose: () => void
}): JSX.Element | null {
  const { t, i18n } = useTranslation()
  const { portfolios, addPosition, removePosition } = useAppState()
  const portfolio = portfolios.find((p) => p.id === portfolioId)

  const [symbolQuery, setSymbolQuery] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState<Asset | null>(null)
  const [quantityInput, setQuantityInput] = useState('')
  const [costBasisInput, setCostBasisInput] = useState('')

  const [stats, setStats] = useState<PortfolioRiskStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const [aiAvailability, setAiAvailability] = useState<AiAvailability | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AiInsightsResult | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.resolve(window.api?.checkAiAvailability())
      .catch(() => ({ claudeCode: false, apiKey: false }))
      .then((avail) => {
        if (!cancelled) setAiAvailability(avail ?? { claudeCode: false, apiKey: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const positions = useMemo(() => portfolio?.positions ?? [], [portfolio])

  useEffect(() => {
    setAiResult(null)
    setAiError(null)
  }, [positions])

  const rows = useMemo<Row[]>(() => {
    const withAsset = positions
      .map((p) => {
        const asset = ALL_ASSETS.find((a) => a.symbol === p.symbol)
        return asset ? { position: p, asset } : null
      })
      .filter((r): r is { position: (typeof positions)[number]; asset: Asset } => r !== null)

    const totalMarketValue = withAsset.reduce((sum, r) => sum + r.asset.price * r.position.quantity, 0)

    return withAsset.map(({ position, asset }) => {
      const marketValue = asset.price * position.quantity
      const costTotal = position.costBasis * position.quantity
      const pnl = marketValue - costTotal
      return {
        asset,
        quantity: position.quantity,
        costBasis: position.costBasis,
        currentPrice: asset.price,
        marketValue,
        costTotal,
        pnl,
        pnlPct: costTotal === 0 ? 0 : (pnl / costTotal) * 100,
        weightPct: totalMarketValue === 0 ? 0 : (marketValue / totalMarketValue) * 100
      }
    })
  }, [positions])

  const totals = useMemo(() => {
    const marketValue = rows.reduce((s, r) => s + r.marketValue, 0)
    const costTotal = rows.reduce((s, r) => s + r.costTotal, 0)
    const pnl = marketValue - costTotal
    return { marketValue, costTotal, pnl, pnlPct: costTotal === 0 ? 0 : (pnl / costTotal) * 100 }
  }, [rows])

  useEffect(() => {
    if (rows.length === 0) {
      setStats(null)
      return
    }
    let cancelled = false
    setStatsLoading(true)
    Promise.all(
      rows.map(async (r) => {
        const candles = await dataService.getCandles(r.asset, '1Y')
        return { weight: r.weightPct / 100, returns: dailyReturns(closesOf(candles)) }
      })
    ).then((holdings) => {
      if (cancelled) return
      const portReturns = weightedPortfolioReturns(holdings)
      if (portReturns.length < 5) {
        setStats(null)
        setStatsLoading(false)
        return
      }
      const valueSeries = cumulativeValueSeries(portReturns)
      const benchmarkReturns = dailyReturns(closesOf(generateCandles(BENCHMARK, '1Y')))
      setStats({
        sharpe: sharpeRatio(portReturns),
        sortino: sortinoRatio(portReturns),
        volatilityAnnualized: volatilityAnnualized(portReturns),
        valueAtRisk95: historicalVaR(portReturns, 0.95),
        maxDrawdown: maxDrawdown(valueSeries),
        beta: betaCalc(portReturns, benchmarkReturns)
      })
      setStatsLoading(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions])

  const matches = useMemo(() => searchAssets(ALL_ASSETS, symbolQuery), [symbolQuery])

  if (!portfolio) return null

  function handleAdd(): void {
    const quantity = parseFloat(quantityInput)
    const costBasis = parseFloat(costBasisInput)
    if (!selectedSymbol || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(costBasis) || costBasis < 0) {
      return
    }
    addPosition(portfolioId, selectedSymbol.symbol, quantity, costBasis)
    setSymbolQuery('')
    setSelectedSymbol(null)
    setQuantityInput('')
    setCostBasisInput('')
  }

  async function handleGetInsights(): Promise<void> {
    if (!stats || rows.length === 0) return
    setAiLoading(true)
    setAiError(null)
    setAiResult(null)
    const languageName = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)?.label ?? 'English'
    try {
      if (!window.api) throw new Error('AI bridge unavailable')
      const result = await window.api.getPortfolioInsights({
        positions: rows.map((r) => ({
          symbol: r.asset.symbol,
          name: r.asset.name,
          quantity: r.quantity,
          costBasis: r.costBasis,
          currentPrice: r.currentPrice,
          marketValue: r.marketValue,
          weightPct: r.weightPct,
          pnlPct: r.pnlPct
        })),
        stats: {
          sharpe: stats.sharpe,
          sortino: stats.sortino,
          volatilityAnnualized: stats.volatilityAnnualized,
          valueAtRisk95: stats.valueAtRisk95,
          maxDrawdown: stats.maxDrawdown,
          beta: stats.beta
        },
        totalValue: totals.marketValue,
        languageName
      })
      if (result.ok) {
        setAiResult({ commentary: result.commentary, source: result.source })
      } else {
        setAiError(result.message)
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="portfolio-pane" role="group" aria-label={portfolio.name}>
      <div className="portfolio-pane-header">
        <h3 className="portfolio-pane-name">{portfolio.name}</h3>
        <Tooltip label={t('common.close') ?? ''}>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close') ?? undefined}>
            <IconClose size={13} />
          </button>
        </Tooltip>
      </div>

      <div className="portfolio-pane-body">
        <div className="portfolio-add">
          <div className="portfolio-add-field portfolio-add-symbol">
            <input
              type="text"
              placeholder={t('portfolio.symbolPlaceholder') ?? undefined}
              value={selectedSymbol ? selectedSymbol.symbol : symbolQuery}
              onChange={(e) => {
                setSelectedSymbol(null)
                setSymbolQuery(e.target.value)
              }}
            />
            {matches.length > 0 && !selectedSymbol && (
              <div className="portfolio-add-results">
                {matches.map((a) => (
                  <button key={a.symbol} onClick={() => setSelectedSymbol(a)}>
                    <span className="sr-sym">{a.symbol}</span>
                    <span className="sr-name">{a.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            className="portfolio-add-field"
            type="number"
            placeholder={t('portfolio.quantityPlaceholder') ?? undefined}
            min="0"
            step="any"
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
          />
          <input
            className="portfolio-add-field"
            type="number"
            placeholder={t('portfolio.costBasisPlaceholder') ?? undefined}
            min="0"
            step="any"
            value={costBasisInput}
            onChange={(e) => setCostBasisInput(e.target.value)}
          />
          <button className="portfolio-add-btn" onClick={handleAdd}>
            {t('portfolio.addBtn')}
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="portfolio-empty">{t('portfolio.emptyState')}</div>
        ) : (
          <>
            <div className="portfolio-summary">
              <div className="portfolio-summary-tile">
                <div className="lbl">{t('portfolio.marketValue')}</div>
                <div className="val tnum">${totals.marketValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
              <div className="portfolio-summary-tile">
                <div className="lbl">{t('portfolio.costBasis')}</div>
                <div className="val tnum">${totals.costTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
              <div className={'portfolio-summary-tile ' + (totals.pnl >= 0 ? 'up' : 'down')}>
                <div className="lbl">{t('portfolio.unrealizedPnl')}</div>
                <div className="val tnum">
                  {totals.pnl >= 0 ? '+' : ''}
                  ${totals.pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })} (
                  {totals.pnl >= 0 ? '+' : ''}
                  {totals.pnlPct.toFixed(2)}%)
                </div>
              </div>
            </div>

            <div className="portfolio-table-wrap">
              <table className="portfolio-table">
                <thead>
                  <tr>
                    <th>{t('portfolio.colSymbol')}</th>
                    <th>{t('portfolio.colQty')}</th>
                    <th>{t('portfolio.colAvgCost')}</th>
                    <th>{t('portfolio.colPrice')}</th>
                    <th>{t('portfolio.colValue')}</th>
                    <th>{t('portfolio.colPnl')}</th>
                    <th>{t('portfolio.colWeight')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.asset.symbol}>
                      <td className="portfolio-sym">{r.asset.symbol}</td>
                      <td className="tnum">{r.quantity}</td>
                      <td className="tnum">{r.costBasis.toFixed(2)}</td>
                      <td className="tnum">{r.currentPrice.toFixed(2)}</td>
                      <td className="tnum">{r.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className={'tnum ' + (r.pnl >= 0 ? 'up' : 'down')}>
                        {r.pnl >= 0 ? '+' : ''}
                        {r.pnlPct.toFixed(1)}%
                      </td>
                      <td className="tnum">{r.weightPct.toFixed(1)}%</td>
                      <td>
                        <Tooltip label={t('portfolio.removePosition') ?? ''}>
                          <button
                            className="portfolio-remove"
                            onClick={() => removePosition(portfolioId, r.asset.symbol)}
                            aria-label={t('portfolio.removePosition') ?? undefined}
                          >
                            <IconClose size={12} />
                          </button>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="portfolio-analytics">
              <div className="portfolio-analytics-head">
                <h3>{t('portfolio.analyticsTitle')}</h3>
                <span className="portfolio-analytics-sub">{t('portfolio.analyticsSub')}</span>
              </div>
              {statsLoading || !stats ? (
                <div className="stat-loading">{t('portfolio.analyticsLoading')}</div>
              ) : (
                <div className="stat-grid">
                  <RiskStatTile metric="sharpe" label={t('dock.risk.sharpe')} lessonId="sharpe" rawValue={stats.sharpe} />
                  <RiskStatTile metric="sortino" label={t('dock.risk.sortino')} lessonId="sortino" rawValue={stats.sortino} />
                  <RiskStatTile
                    metric="volatility"
                    label={t('dock.risk.volatility')}
                    lessonId="volatility"
                    rawValue={stats.volatilityAnnualized}
                  />
                  <RiskStatTile metric="var" label={t('dock.risk.var')} lessonId="var" rawValue={stats.valueAtRisk95} />
                  <RiskStatTile
                    metric="maxdd"
                    label={t('dock.risk.maxDrawdown')}
                    lessonId="maxdd"
                    rawValue={stats.maxDrawdown}
                  />
                  <RiskStatTile metric="beta" label={t('dock.risk.beta')} lessonId="beta" rawValue={stats.beta} />
                </div>
              )}
            </div>

            {stats && !statsLoading && (
              <div className="portfolio-ai">
                <div className="portfolio-analytics-head">
                  <h3>
                    <IconSparkle size={14} /> {t('portfolio.ai.sectionTitle')}
                  </h3>
                  <span className="portfolio-analytics-sub">{t('portfolio.ai.sectionSub')}</span>
                </div>

                {!aiAvailability ? null : !aiAvailability.claudeCode && !aiAvailability.apiKey ? (
                  <div className="portfolio-ai-connect">
                    <div className="portfolio-ai-connect-title">{t('portfolio.ai.connectTitle')}</div>
                    <p>{t('portfolio.ai.connectBody')}</p>
                  </div>
                ) : (
                  <div className="portfolio-ai-body">
                    {!aiResult && !aiError && !aiLoading && (
                      <button className="portfolio-ai-btn" onClick={handleGetInsights}>
                        <IconSparkle size={14} />
                        {t('portfolio.ai.getInsightsBtn')}
                      </button>
                    )}

                    {aiLoading && <div className="stat-loading">{t('portfolio.ai.loading')}</div>}

                    {aiError && !aiLoading && (
                      <div className="portfolio-ai-error">
                        <div className="portfolio-ai-connect-title">{t('portfolio.ai.errorTitle')}</div>
                        <p>{aiError}</p>
                        <button className="portfolio-ai-btn" onClick={handleGetInsights}>
                          {t('portfolio.ai.retryBtn')}
                        </button>
                      </div>
                    )}

                    {aiResult && !aiLoading && (
                      <div className="portfolio-ai-result">
                        <p className="portfolio-ai-commentary">{aiResult.commentary}</p>
                        <div className="portfolio-ai-disclaimer">
                          <IconAlertTriangle size={16} />
                          <div>
                            <div className="portfolio-ai-disclaimer-title">{t('portfolio.ai.disclaimerTitle')}</div>
                            <p>{t('portfolio.ai.disclaimerBody')}</p>
                          </div>
                        </div>
                        <div className="portfolio-ai-footer">
                          <span>
                            {aiResult.source === 'claude-code'
                              ? t('portfolio.ai.sourceClaudeCode')
                              : t('portfolio.ai.sourceApiKey')}
                          </span>
                          <button className="portfolio-ai-regenerate" onClick={handleGetInsights}>
                            {t('portfolio.ai.regenerateBtn')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
