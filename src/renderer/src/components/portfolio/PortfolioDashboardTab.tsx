import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import { computeAssetClassBreakdown } from '@renderer/lib/portfolioBreakdown'
import type { ResolvedHoldingRow } from '@renderer/lib/portfolioHoldings'
import RiskStatTile from '@renderer/components/stats/RiskStatTile'
import { IconSparkle, IconAlertTriangle } from '@renderer/components/icons/Icons'
import { SUPPORTED_LANGUAGES } from '@renderer/i18n'
import type { PortfolioRiskStats } from '@renderer/types/market'
import ClassBreakdownBar from '@renderer/components/portfolio/ClassBreakdownBar'
import HoldingsRankBar from '@renderer/components/portfolio/HoldingsRankBar'

type AiAvailability = { claudeCode: boolean; apiKey: boolean }
type AiInsightsResult = { commentary: string; source: 'claude-code' | 'api-key' }

export default function PortfolioDashboardTab({
  rows,
  risk
}: {
  rows: ResolvedHoldingRow[]
  risk: { stats: PortfolioRiskStats | null; loading: boolean }
}): JSX.Element {
  const { t, i18n } = useTranslation()
  const { settingsVersion } = useAppState()
  const { stats, loading: statsLoading } = risk

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
    // Re-checks when a key is saved/cleared via Customize while this pane is already open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsVersion])

  const aiRequestIdRef = useRef(0)

  useEffect(() => {
    aiRequestIdRef.current += 1
    setAiResult(null)
    setAiError(null)
    setAiLoading(false)
  }, [rows])

  const totals = useMemo(() => {
    const marketValue = rows.reduce((s, r) => s + r.marketValue, 0)
    return { marketValue }
  }, [rows])

  const classBreakdown = useMemo(() => computeAssetClassBreakdown(rows), [rows])

  async function handleGetInsights(): Promise<void> {
    if (!stats || rows.length === 0) return
    const requestId = ++aiRequestIdRef.current
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
      if (aiRequestIdRef.current !== requestId) return
      if (result.ok) {
        setAiResult({ commentary: result.commentary, source: result.source })
      } else {
        setAiError(result.message)
      }
    } catch (e) {
      if (aiRequestIdRef.current !== requestId) return
      setAiError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      if (aiRequestIdRef.current === requestId) setAiLoading(false)
    }
  }

  return (
    <div className="portfolio-dashboard-tab">
      <div className="portfolio-analytics-head">
        <h3>{t('portfolio.dashboard.classBreakdownTitle')}</h3>
        <span className="portfolio-analytics-sub">{t('portfolio.dashboard.classBreakdownSub')}</span>
      </div>
      <ClassBreakdownBar slices={classBreakdown} />

      <div className="portfolio-analytics-head portfolio-dashboard-section-head">
        <h3>{t('portfolio.dashboard.holdingBreakdownTitle')}</h3>
        <span className="portfolio-analytics-sub">{t('portfolio.dashboard.holdingBreakdownSub')}</span>
      </div>
      <HoldingsRankBar rows={rows} />

      {/* Future pass: benchmark comparison section goes here. Out of scope for this pass. */}

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
    </div>
  )
}
