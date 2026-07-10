export interface Lesson {
  id: string
  title: string
  category: 'Trend & Momentum' | 'Risk & Portfolio' | 'Options & Derivatives'
  summary: string
  formula?: string
  howToUse: string
  watchOutFor: string
}

export const LESSONS: Lesson[] = [
  {
    id: 'ma',
    title: 'Moving Average (MA)',
    category: 'Trend & Momentum',
    summary:
      'The average closing price over the last N days, plotted as a smooth line. It filters out day-to-day noise so you can see the underlying trend.',
    formula: 'MA(n) = (close₁ + close₂ + … + closeₙ) / n',
    howToUse:
      'Price above a rising MA generally signals an uptrend; below a falling MA signals a downtrend. Traders often watch for a shorter MA (e.g. 20-day) crossing above a longer one (e.g. 50-day) as a "golden cross" bullish signal, and the reverse as a "death cross".',
    watchOutFor:
      'MAs are lagging — they confirm a trend after it starts, not before. In a choppy, sideways market they generate false crossover signals repeatedly.'
  },
  {
    id: 'boll',
    title: 'Bollinger Bands',
    category: 'Trend & Momentum',
    summary:
      'A moving average with two bands plotted above and below it, spaced by the recent standard deviation of price. The bands widen when volatility rises and narrow when it falls.',
    formula: 'Upper = MA(20) + 2σ    Lower = MA(20) − 2σ',
    howToUse:
      'Price touching the upper band suggests it is statistically stretched to the upside relative to its recent range; the lower band, the downside. A sharp narrowing of the bands ("squeeze") often precedes a big move in either direction.',
    watchOutFor:
      'Touching a band is not automatically a buy or sell signal — in a strong trend, price can "walk the band" for a long time. Bands describe recent volatility, not direction.'
  },
  {
    id: 'rsi',
    title: 'RSI (Relative Strength Index)',
    category: 'Trend & Momentum',
    summary:
      'A momentum oscillator from 0-100 that measures how fast and how much price has moved recently, based on the size of up days versus down days.',
    formula: 'RSI = 100 − 100 / (1 + average gain / average loss)',
    howToUse:
      'Readings above 70 are traditionally read as "overbought" and below 30 as "oversold" — a hint that a pullback or bounce may be near. Divergences (price makes a new high but RSI doesn\'t) are often watched as early trend-exhaustion signals.',
    watchOutFor:
      'In strong trends, RSI can stay above 70 or below 30 for extended periods without reversing — treat it as a momentum reading, not a countdown timer.'
  },
  {
    id: 'macd',
    title: 'MACD (Moving Average Convergence Divergence)',
    category: 'Trend & Momentum',
    summary:
      'The gap between a fast (12-day) and slow (26-day) exponential moving average, plus a 9-day signal line smoothing that gap. The histogram shows the difference between the two.',
    formula: 'MACD = EMA(12) − EMA(26)    Signal = EMA(9) of MACD',
    howToUse:
      'MACD crossing above its signal line is read as bullish momentum building; crossing below, bearish. The histogram growing taller shows momentum accelerating in that direction.',
    watchOutFor:
      'Like all EMA-based tools, MACD lags price. It works best in trending markets and produces frequent whipsaw signals in flat, range-bound ones.'
  },
  {
    id: 'volatility',
    title: 'Annualized Volatility',
    category: 'Risk & Portfolio',
    summary:
      'How much an asset\'s daily returns typically bounce around, scaled up to a yearly figure so different assets and timeframes are comparable on the same scale.',
    formula: 'Vol(annual) = stdev(daily returns) × √252',
    howToUse:
      'Higher volatility means bigger swings in both directions — more potential upside, but also bigger potential drawdowns. Use it to size positions: a highly volatile asset warrants a smaller position for the same dollar risk.',
    watchOutFor:
      'Volatility is symmetric — it doesn\'t distinguish good (upside) swings from bad (downside) ones. It also looks backward; past volatility doesn\'t guarantee future volatility.'
  },
  {
    id: 'sharpe',
    title: 'Sharpe Ratio',
    category: 'Risk & Portfolio',
    summary:
      'Return earned per unit of total risk taken — the classic way to compare whether one investment\'s returns are worth the bumpiness of its ride, relative to another\'s.',
    formula: 'Sharpe = (annual return − risk-free rate) / annual volatility',
    howToUse:
      'Above 1 is generally considered decent, above 2 very good, above 3 excellent. Use it to compare two strategies or assets with different volatility profiles — the one with the higher Sharpe delivered more return for the risk endured.',
    watchOutFor:
      'Sharpe penalizes upside volatility the same as downside — a strategy with occasional huge gains can score "worse" than one with a smoother, mediocre ride. It also assumes returns are roughly normally distributed, which is often false for real markets (fat tails, crashes).'
  },
  {
    id: 'sortino',
    title: 'Sortino Ratio',
    category: 'Risk & Portfolio',
    summary:
      'A variant of the Sharpe ratio that only penalizes downside volatility — the swings you actually don\'t want — rather than treating all volatility as bad.',
    formula: 'Sortino = (annual return − risk-free rate) / downside deviation',
    howToUse:
      'Generally more forgiving than Sharpe for strategies with big upside spikes (e.g. momentum or options strategies). A high Sortino alongside a much lower Sharpe suggests most of the volatility has been on the upside.',
    watchOutFor:
      'Needs enough down-days in the sample to be statistically meaningful — over very short or very calm periods, downside deviation can be tiny and inflate the ratio misleadingly.'
  },
  {
    id: 'maxdd',
    title: 'Maximum Drawdown',
    category: 'Risk & Portfolio',
    summary:
      'The single largest peak-to-trough decline the asset or portfolio has experienced over the period shown — the worst-case "how much would I have lost" if you bought the top and sold the bottom.',
    formula: 'MaxDD = min( (price − running peak) / running peak )',
    howToUse:
      'This is one of the most intuitive risk numbers there is: a -20% max drawdown means at some point you\'d have watched the value fall 20% from a prior high. Use it to gut-check whether you could emotionally and financially tolerate holding through the worst historical stretch.',
    watchOutFor:
      'Past drawdowns don\'t cap future ones — markets can always make a new, larger drawdown. It also says nothing about how long recovery took.'
  },
  {
    id: 'var',
    title: 'Value at Risk (VaR)',
    category: 'Risk & Portfolio',
    summary:
      'An estimate of the loss you should not expect to exceed over a given period, at a given confidence level — e.g. "95% VaR of -3.2%" means on 95% of days, the loss was smaller than 3.2%.',
    formula: 'Historical VaR = the (1 − confidence) percentile of the observed daily return distribution',
    howToUse:
      'Use it to set expectations for a "normal bad day" — if your position is $10,000 and daily VaR(95%) is -3.2%, a loss of roughly $320 or worse should happen about 1 day in 20.',
    watchOutFor:
      'VaR explicitly says nothing about the remaining 5% — it doesn\'t bound how bad the worst days can get. Crashes and crises live precisely in that unmeasured tail.'
  },
  {
    id: 'beta',
    title: 'Beta',
    category: 'Risk & Portfolio',
    summary:
      'How sensitive an asset\'s returns are to moves in a broader benchmark (like the S&P 500). A beta of 1.3 means the asset has historically moved about 30% more than the market, in the same direction.',
    formula: 'Beta = covariance(asset, market) / variance(market)',
    howToUse:
      'Beta above 1 means amplified market moves (more aggressive); below 1 means dampened moves (more defensive); negative beta means it tends to move opposite the market — useful for diversification/hedging.',
    watchOutFor:
      'Beta is measured over a specific historical window and can drift significantly over time as a company or sector\'s risk profile changes.'
  },
  {
    id: 'greeks',
    title: 'Options Greeks',
    category: 'Options & Derivatives',
    summary:
      'A set of sensitivities describing how an option\'s price is expected to change as different inputs move — the underlying price, time, and volatility.',
    formula:
      'Delta ∂price/∂S · Gamma ∂delta/∂S · Theta ∂price/∂time · Vega ∂price/∂volatility',
    howToUse:
      'Delta ≈ how much the option price moves per $1 move in the underlying (and roughly the odds of expiring in-the-money). Gamma is how fast delta itself changes. Theta is the daily value the option loses just from time passing. Vega is sensitivity to changes in implied volatility.',
    watchOutFor:
      'Greeks are instantaneous estimates from a pricing model (Black-Scholes here) — they assume constant volatility and no big price jumps, assumptions real markets regularly violate, especially around earnings or news events.'
  },
  {
    id: 'blackscholes',
    title: 'Black-Scholes Option Pricing',
    category: 'Options & Derivatives',
    summary:
      'A mathematical model for estimating a fair theoretical price for a European-style option, based on the underlying price, strike, time to expiry, interest rates, and expected (implied) volatility.',
    formula: 'Call = S·N(d1) − K·e^(−rT)·N(d2)',
    howToUse:
      'Compare the model price to the market price of an option to gauge whether it looks statistically expensive or cheap given your volatility assumption — and use the Greeks it produces to understand your risk exposure if you hold the position.',
    watchOutFor:
      'The model assumes constant volatility, no dividends, and log-normal price behavior — all simplifications. It is a reference point for reasoning about risk, not a guarantee of what an option will actually trade at.'
  }
]

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}
