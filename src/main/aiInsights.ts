import spawn from 'cross-spawn'
import { getAnthropicKey } from './secureSettings'

export interface PortfolioPositionSummary {
  symbol: string
  name: string
  quantity: number
  costBasis: number
  currentPrice: number
  marketValue: number
  weightPct: number
  pnlPct: number
}

export interface PortfolioStatsSummary {
  sharpe: number
  sortino: number
  volatilityAnnualized: number
  valueAtRisk95: number
  maxDrawdown: number
  beta: number
}

export interface PortfolioInsightsRequest {
  positions: PortfolioPositionSummary[]
  stats: PortfolioStatsSummary
  totalValue: number
  languageName: string
}

export type PortfolioInsightsResult =
  | { ok: true; commentary: string; source: 'claude-code' | 'api-key'; costUsd?: number }
  | {
      ok: false
      reason: 'no-backend' | 'claude-cli-error' | 'api-error' | 'timeout'
      message: string
    }

// The UI always renders its OWN static, translated disclaimer text underneath any
// response — that guarantee lives in the renderer, not here, so it can never be
// skipped by a prompting quirk or a model that forgets to mention it. This system
// prompt still asks the model to keep the framing in mind as a second layer, not
// the only layer.
const SYSTEM_PROMPT =
  'You are a financial education assistant embedded in a retail investing app called ' +
  'Quant In A Box. You give general, educational commentary about a portfolio — ' +
  'discussing concentration, diversification, risk profile, and what the provided ' +
  'statistics generally indicate — based ONLY on the data given to you. You NEVER give ' +
  'personalized investment advice, and you NEVER tell the user to buy, sell, or hold ' +
  'anything specific. You are not a licensed financial advisor. Keep commentary to ' +
  '2-4 sentences, plain language, briefly explaining any jargon you use.'

const JSON_SCHEMA = {
  type: 'object',
  properties: { commentary: { type: 'string' } },
  required: ['commentary']
}

const MAX_BUDGET_USD = '0.25'
const CLI_TIMEOUT_MS = 60_000
const CLI_VERSION_CHECK_TIMEOUT_MS = 5_000

function buildPrompt(req: PortfolioInsightsRequest): string {
  const posLines = req.positions
    .map(
      (p) =>
        `- ${p.symbol} (${p.name}): ${p.quantity} units, avg cost ${p.costBasis.toFixed(2)}, ` +
        `current price ${p.currentPrice.toFixed(2)}, market value ${p.marketValue.toFixed(2)}, ` +
        `${p.weightPct.toFixed(1)}% of portfolio, unrealized P&L ${p.pnlPct.toFixed(1)}%`
    )
    .join('\n')
  return (
    `Portfolio total value: ${req.totalValue.toFixed(2)}\n\nHoldings:\n${posLines}\n\n` +
    `Risk statistics (annualized where applicable): Sharpe ratio ${req.stats.sharpe.toFixed(2)}, ` +
    `Sortino ratio ${req.stats.sortino.toFixed(2)}, volatility ${(req.stats.volatilityAnnualized * 100).toFixed(1)}%, ` +
    `95% 1-day VaR ${(req.stats.valueAtRisk95 * 100).toFixed(1)}%, max drawdown ${(req.stats.maxDrawdown * 100).toFixed(1)}%, ` +
    `beta vs market ${req.stats.beta.toFixed(2)}.\n\n` +
    `Respond in ${req.languageName}. Give general educational commentary on this portfolio's composition and risk profile.`
  )
}

/** Whether the `claude` CLI is installed and reachable on PATH — cached for the process lifetime. */
let cliAvailableCache: boolean | null = null

export async function isClaudeCliAvailable(): Promise<boolean> {
  if (cliAvailableCache !== null) return cliAvailableCache
  cliAvailableCache = await new Promise<boolean>((resolve) => {
    let settled = false
    const child = spawn('claude', ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] })
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill()
      resolve(false)
    }, CLI_VERSION_CHECK_TIMEOUT_MS)
    child.on('error', () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(false)
    })
    child.on('exit', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(code === 0)
    })
  })
  return cliAvailableCache
}

function runClaudeCli(prompt: string): Promise<{ commentary?: string; costUsd?: number; error?: string }> {
  return new Promise((resolve) => {
    let settled = false
    // --tools "" disables ALL agentic tool access (Bash/Read/Write/Edit/etc) — this call
    // can only ever generate text, never touch the filesystem or run commands. The
    // --json-schema mechanism itself uses an internal structured-output path that's
    // unaffected by --tools (confirmed empirically), so schema enforcement still works.
    const child = spawn(
      'claude',
      [
        '-p',
        prompt,
        '--tools',
        '',
        '--model',
        'sonnet',
        '--output-format',
        'json',
        '--system-prompt',
        SYSTEM_PROMPT,
        '--json-schema',
        JSON.stringify(JSON_SCHEMA),
        '--max-budget-usd',
        MAX_BUDGET_USD
      ],
      // stdin explicitly closed (not just left as an open pipe) — otherwise the CLI
      // waits ~3s to see if piped input is coming before proceeding with just -p.
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill()
      resolve({ error: 'timeout' })
    }, CLI_TIMEOUT_MS)

    child.stdout?.on('data', (d) => (stdout += d.toString()))
    child.stderr?.on('data', (d) => (stderr += d.toString()))
    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ error: err.message })
    })
    child.on('exit', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (code !== 0) {
        resolve({ error: stderr.trim() || `claude exited with code ${code}` })
        return
      }
      try {
        const parsed = JSON.parse(stdout)
        if (parsed.is_error) {
          resolve({ error: typeof parsed.result === 'string' ? parsed.result : 'unknown error from claude CLI' })
          return
        }
        const commentary = parsed.structured_output?.commentary
        if (typeof commentary !== 'string' || !commentary.trim()) {
          resolve({ error: 'claude CLI returned no commentary text' })
          return
        }
        resolve({ commentary, costUsd: typeof parsed.total_cost_usd === 'number' ? parsed.total_cost_usd : undefined })
      } catch (e) {
        resolve({ error: `failed to parse claude CLI output: ${(e as Error).message}` })
      }
    })
  })
}

async function runAnthropicApi(prompt: string): Promise<{ commentary?: string; error?: string }> {
  const apiKey = getAnthropicKey()
  if (!apiKey) return { error: 'no api key configured' }
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { error: `Anthropic API error ${res.status}: ${text.slice(0, 300)}` }
    }
    const data = await res.json()
    const commentary = data?.content?.find((b: { type: string }) => b.type === 'text')?.text
    if (typeof commentary !== 'string' || !commentary.trim()) {
      return { error: 'Anthropic API returned no text content' }
    }
    return { commentary }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function getPortfolioInsights(req: PortfolioInsightsRequest): Promise<PortfolioInsightsResult> {
  const prompt = buildPrompt(req)

  if (await isClaudeCliAvailable()) {
    const cli = await runClaudeCli(prompt)
    if (cli.commentary) {
      return { ok: true, commentary: cli.commentary, source: 'claude-code', costUsd: cli.costUsd }
    }
    if (cli.error === 'timeout') {
      return { ok: false, reason: 'timeout', message: 'Claude Code took too long to respond.' }
    }
    // Claude CLI is installed but failed for some other reason (not logged in, network,
    // etc.) — try the API-key fallback before giving up, in case one is configured.
    const api = await runAnthropicApi(prompt)
    if (api.commentary) return { ok: true, commentary: api.commentary, source: 'api-key' }
    return {
      ok: false,
      reason: 'claude-cli-error',
      message: cli.error || 'Claude Code CLI failed for an unknown reason.'
    }
  }

  const api = await runAnthropicApi(prompt)
  if (api.commentary) return { ok: true, commentary: api.commentary, source: 'api-key' }
  if (api.error === 'no api key configured') {
    return {
      ok: false,
      reason: 'no-backend',
      message: 'No Claude Code CLI detected and no ANTHROPIC_API_KEY configured.'
    }
  }
  return { ok: false, reason: 'api-error', message: api.error || 'Anthropic API call failed for an unknown reason.' }
}
