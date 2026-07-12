import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import { MODULE_TITLE_KEY, lessonIdsForModule, type ModuleId } from './modules'
import PriceChart from '@renderer/components/chart/PriceChart'
import OscillatorPanel from '@renderer/components/chart/OscillatorPanel'
import { generateCandles } from '@renderer/data/mockData'
import type { Asset, Candle, IndicatorId } from '@renderer/types/market'

/** Fixed synthetic asset fed to the app's own generateCandles() (data/mockData.ts) purely to
 *  get a short, deterministic candle series to illustrate the trend lessons below — the exact
 *  same generator every real chart in this app uses, just seeded off a made-up symbol so the
 *  illustration never depends on the user's actual data mode (mock or live) or watchlist. */
const STUDY_ASSET: Asset = { symbol: 'ACADEMYDEMO', name: 'Illustrative example', klass: 'stocks', price: 100, changePct: 1.4 }
const STUDY_TIMEFRAME = '3M' as const

const ALL_INDICATORS_OFF: Record<IndicatorId, boolean> = {
  ma20: false,
  ma50: false,
  boll: false,
  rsi: false,
  macd: false,
  forecast: false,
  volume: false
}
const MA_INDICATORS: Record<IndicatorId, boolean> = { ...ALL_INDICATORS_OFF, ma20: true }
const BOLL_INDICATORS: Record<IndicatorId, boolean> = { ...ALL_INDICATORS_OFF, boll: true }

/** Each of the 4 trend lessons gets its own genuinely distinct illustration — a fresh
 *  PriceChart/OscillatorPanel element per lesson id, never one shared instance whose props get
 *  mutated across lessons. Returns null for every non-trend lesson id (assetTypes/risk lessons
 *  render text-only, per this screen's design). */
function renderTrendDiagram(lessonId: string, candles: Candle[], theme: 'dark' | 'light'): JSX.Element | null {
  switch (lessonId) {
    case 'ma':
      return <PriceChart candles={candles} indicators={MA_INDICATORS} chartStyle="candles" forecastMethod="drift" theme={theme} />
    case 'boll':
      return <PriceChart candles={candles} indicators={BOLL_INDICATORS} chartStyle="candles" forecastMethod="drift" theme={theme} />
    case 'rsi':
      return <OscillatorPanel candles={candles} mode="rsi" theme={theme} />
    case 'macd':
      return <OscillatorPanel candles={candles} mode="macd" theme={theme} />
    default:
      return null
  }
}

/** Static hand-drawn payoff diagram for the options module: a long call's classic "hockey
 *  stick" (flat below strike, rising 1:1 above it) plus a long put's mirror image, against
 *  underlying price at expiry. Same stroke language as components/icons/Icons.tsx (rounded
 *  caps/joins, ~1.8-2px strokes, no fill) scaled up to a small diagram instead of a glyph. */
function OptionsPayoffDiagram(): JSX.Element {
  const { t } = useTranslation()
  const leftX = 20
  const rightX = 300
  const strikeX = 160
  const axisY = 112
  const riseTopY = 34
  return (
    <svg viewBox="0 0 320 150" className="options-payoff-svg" role="img" aria-label={t('academy.lessons.blackscholes.title')}>
      <path d={`M${leftX} ${axisY} H${rightX}`} stroke="var(--border)" strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <path
        d={`M${strikeX} ${riseTopY - 8} V${axisY + 10}`}
        stroke="var(--text-faint)"
        strokeWidth={1.5}
        strokeDasharray="3 3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M${leftX} ${axisY} H${strikeX} L${rightX} ${riseTopY}`}
        stroke="var(--gain)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d={`M${rightX} ${axisY} H${strikeX} L${leftX} ${riseTopY}`}
        stroke="var(--loss)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <text x={strikeX} y={axisY + 24} textAnchor="middle" className="options-payoff-label" fill="var(--text-faint)">
        {t('academy.study.payoffStrikeLabel')}
      </text>
      <text x={rightX} y={riseTopY - 8} textAnchor="end" className="options-payoff-label" fill="var(--gain)" fontWeight={700}>
        {t('academy.study.payoffCallLabel')}
      </text>
      <text x={leftX} y={riseTopY - 8} textAnchor="start" className="options-payoff-label" fill="var(--loss)" fontWeight={700}>
        {t('academy.study.payoffPutLabel')}
      </text>
    </svg>
  )
}

/** Pre-quiz study screen for the 4 SUBJECT modules (assetTypes/trend/risk/options — the Final
 *  Exam gets the lighter FinalExamReview instead, see that file). Renders every lesson belonging
 *  to this module in full — title/summary/formula/howToUse/watchOutFor — using the exact same
 *  CSS classes AcademyPanel's Library view already uses, so this reads as the same app, not a
 *  bolted-on new screen. Trend lessons additionally get a small illustrative chart; the options
 *  module gets one shared payoff diagram; assetTypes/risk stay text-only (see design rationale
 *  in the phase brief — there's no standard visual convention for a Sharpe ratio the way there
 *  is for a moving-average crossover or an option payoff). Neither action here is time-gated:
 *  Skip and Start are both clickable immediately, same "trust the user's judgment" stance this
 *  app already takes with the collapsible forecast disclaimer.
 *
 *  `contentOnly` is for QuizRunner's in-quiz study overlay (Phase 19): the quiz is already
 *  running, so there's no "Skip"/"Start quiz" decision left to make — this mode hides the
 *  header (title/framing/skip) and the bottom Start button and renders just the lesson content,
 *  letting the caller (QuizRunner) supply its own overlay chrome (title + close) around it. */
export default function ModuleStudyScreen({
  moduleId,
  onStartQuiz,
  onSkip,
  contentOnly = false
}: {
  moduleId: ModuleId
  onStartQuiz?: () => void
  onSkip?: () => void
  contentOnly?: boolean
}): JSX.Element {
  const { t } = useTranslation()
  const { theme } = useAppState()
  const lessonIds = useMemo(() => lessonIdsForModule(moduleId), [moduleId])
  const candles = useMemo(() => generateCandles(STUDY_ASSET, STUDY_TIMEFRAME), [])

  return (
    <div className="module-study-screen">
      {!contentOnly && (
        <div className="module-study-header">
          <div className="academy-eyebrow">{t('academy.study.heading')}</div>
          <h3>{t(MODULE_TITLE_KEY[moduleId])}</h3>
          <p className="academy-summary">{t('academy.study.framing')}</p>
          <button className="quiz-nav-btn module-study-skip-btn" onClick={onSkip}>
            {t('academy.study.skipBtn')}
          </button>
        </div>
      )}

      {moduleId === 'options' && (
        <div className="module-study-payoff-wrap">
          <OptionsPayoffDiagram />
        </div>
      )}

      {lessonIds.map((lessonId) => {
        const diagram = renderTrendDiagram(lessonId, candles, theme)
        return (
          <section key={lessonId} className="module-study-lesson">
            <h4>{t(`academy.lessons.${lessonId}.title`)}</h4>
            {diagram && <div className="module-study-chart">{diagram}</div>}
            <p className="academy-summary">{t(`academy.lessons.${lessonId}.summary`)}</p>

            <div className="academy-block">
              <div className="academy-block-label">{t('academy.formula')}</div>
              <div className="academy-formula tnum">{t(`academy.lessons.${lessonId}.formula`)}</div>
            </div>

            <div className="academy-block">
              <div className="academy-block-label ok">{t('academy.howToUse')}</div>
              <p>{t(`academy.lessons.${lessonId}.howToUse`)}</p>
            </div>

            <div className="academy-block">
              <div className="academy-block-label warn">{t('academy.watchOutFor')}</div>
              <p>{t(`academy.lessons.${lessonId}.watchOutFor`)}</p>
            </div>
          </section>
        )
      })}

      {!contentOnly && (
        <button className="quiz-nav-btn primary module-study-start-btn" onClick={onStartQuiz}>
          {t('academy.study.startBtn')}
        </button>
      )}
    </div>
  )
}
