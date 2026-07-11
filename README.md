<div align="center">

# Quant In A Box

### Institutional-grade quant analytics for retail traders and students.

[![Download for Windows](https://img.shields.io/badge/Download-Windows-0078D6?style=for-the-badge)](https://github.com/WillBe89/quant-in-a-box/releases/latest)
[![Download for macOS](https://img.shields.io/badge/Download-macOS-black?style=for-the-badge)](https://github.com/WillBe89/quant-in-a-box/releases/latest)
[![Download for Linux](https://img.shields.io/badge/Download-Linux-F0AB00?style=for-the-badge)](https://github.com/WillBe89/quant-in-a-box/releases/latest)

![platforms](https://img.shields.io/badge/platforms-Windows_·_macOS_·_Linux-555) ![license](https://img.shields.io/badge/license-Private-blue)

</div>

---

Quant In A Box is a desktop application that brings institutional-grade quantitative analytics to retail traders and students: technical indicators, options Greeks, portfolio risk metrics, and AI-assisted commentary, wrapped in a fast, native Electron + React interface. It runs entirely on realistic, deterministically generated mock market data out of the box, so it's fully usable with zero configuration and zero API keys, while also supporting optional real-time data providers for those who want live quotes and news.

## Features

### Charting & Analytics
- Interactive candlestick charts with a rich hover crosshair showing date, volume, change vs. the prior bar, and live indicator values.
- Built-in technical indicators: moving averages (SMA/EMA), Bollinger Bands, RSI, and MACD, all overlaid directly on the chart.
- Options pricing and Greeks calculated with the Black-Scholes model.
- At-a-glance risk indicators (Sharpe, Sortino, Volatility, VaR, Max Drawdown, Beta) shown with color-coded good/neutral/bad faces based on documented thresholds.
- A searchable universe of thousands of assets, spanning stocks, ETFs, cryptocurrencies, bonds, FX, and real estate, with smart ranked search (exact/prefix/substring matching) so popular tickers surface first.
- Customizable ticker tape that can track your watchlist, your portfolio, or the full market.
- Market News panel that can be filtered to whatever you're viewing, your watchlist, or your portfolio.
- A "Teaching Zone" (Academy) with lessons covering indicators, options Greeks, and dedicated primers on each asset class (stocks/ETFs, crypto, bonds, FX & commodities, real estate/REITs).
- A consistent icon set with hover tooltips throughout the interface.

### Portfolio Tracking
- Track your holdings by symbol, quantity, and cost basis, with new buys automatically blended into a weighted average cost.
- See per-position market value, unrealized P&L ($/%), and portfolio weight, plus portfolio-wide totals.
- Real portfolio-level analytics (Sharpe, Sortino, Volatility, VaR, Max Drawdown, Beta) computed from your actual blended holdings, not just a single symbol.
- Create, name, rename, and delete multiple named portfolios.
- Open and view several portfolios side by side at once, each with its own independent positions and analytics.
- Maintain a personal watchlist, with quick add/remove/reset and one-click star-toggle access from any chart.

### AI Insights
- Get plain-English AI commentary on your portfolio, powered by your own local Claude Code sign-in (falling back to your own Anthropic API key if you provide one); no separate API key required for most users.
- Every AI insight is shown alongside a permanent, unmissable "not financial advice" disclaimer.
- Insights are labeled with their source (local Claude Code vs. API key) so you always know where the analysis came from.

### Internationalization
- Full interface translation into 10 languages besides English, selectable from a language switcher.
- Correct right-to-left text rendering for Arabic and Urdu.

### Customization & Layout
- Drag-and-drop reordering of dashboard cards (Risk, Options, News), with keyboard-accessible move controls too.
- Show, hide, and reset the visibility of individual dashboard cards.
- Expand any card into a larger pop-out view for a closer look.
- A dedicated Customize panel to manage your watchlist, ticker source, dock layout, and portfolios in one place.
- Smooth, motion-based UI transitions that automatically respect your OS's reduced-motion setting.
- Light and dark theme support.
- Custom app branding and icon throughout the app and taskbar.

### Packaging & Distribution
- Installable on Windows (`.exe`), macOS (`.dmg`), and Linux (`.AppImage`) via native installers.
- Automated build and release pipeline: pushes to `main`, PRs against `main`, and manual runs are all checked (typecheck/tests), and tagged releases automatically build and publish installers for all three platforms.

## Tech Stack

- **Electron**: desktop application shell (main/preload/renderer process model)
- **electron-vite**: Vite-based build and dev tooling tailored for Electron
- **Vite**: underlying bundler
- **React 18** + **TypeScript**: renderer UI
- **@vitejs/plugin-react**: JSX / Fast Refresh support in the renderer
- **lightweight-charts**: candlestick/financial charting
- **motion**: UI animation (drag-and-drop reordering, transitions)
- **i18next** / **react-i18next**: internationalization
- **@electron-toolkit/utils** / **@electron-toolkit/preload**: Electron main/preload helper utilities
- **cross-spawn**: safe cross-platform process spawning (used by the AI insights feature to invoke the local Claude Code CLI)
- **vitest**: unit test runner
- **electron-builder**: packaging and installer generation (NSIS/dmg/AppImage) and GitHub Releases publishing

## Getting Started

### Prerequisites

- Node.js (the CI pipeline builds and tests against Node 20)
- npm

### Installation

```bash
git clone https://github.com/WillBe89/quant-in-a-box.git
cd quant-in-a-box
npm install
```

`npm install` will also trigger `postinstall` (`electron-builder install-app-deps`), which rebuilds native Electron app dependencies for your platform.

### Configuration (optional)

```bash
cp .env.example .env
```

The app works out of the box with **zero environment variables**. Without any API keys set, it runs entirely on realistic generated mock data (candles, quotes, option chains, and news), so you can start using it immediately.

If you want live data, edit `.env` and set any of the following:

| Variable | Required | Purpose |
|---|---|---|
| `VITE_FINNHUB_API_KEY` | No | Free-tier key from [finnhub.io](https://finnhub.io); powers live quotes, candles, and ticker-filtered news. |
| `VITE_TWELVE_DATA_API_KEY` | No | Optional free-tier key from [twelvedata.com](https://twelvedata.com); broadens bond/ETF coverage as a supplement to Finnhub. |
| `ANTHROPIC_API_KEY` | No | Fallback for the "Get AI insights" feature in the Portfolio panel; only used if the local Claude Code CLI isn't installed/signed in. Read only in the Electron main process, never bundled into the renderer. |

`.env` is not committed to git (neither is `.env.example`'s content applicable outside your local copy).

### Run in development

```bash
npm run dev
```

This starts `electron-vite dev`, launching the app with hot reload across the main, preload, and renderer processes.

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `electron-vite dev` | Runs the app in development mode with hot reload (main, preload, renderer). |
| `npm run build` | `electron-vite build` | Compiles/bundles main, preload, and renderer for production into `out/`. |
| `npm run typecheck` | `tsc --noEmit -p tsconfig.web.json && tsc --noEmit -p tsconfig.node.json` | Type-checks the renderer project, then the main/preload project, emitting no output. |
| `npm test` | `vitest run` | Runs the test suite once (non-watch mode). |
| `npm run postinstall` | `electron-builder install-app-deps` | Rebuilds/installs native Electron app dependencies after `npm install` (runs automatically). |
| `npm run build:win` | `npm run build && electron-builder --win` | Production build, then packages a Windows NSIS installer. |
| `npm run build:mac` | `npm run build && electron-builder --mac` | Production build, then packages a macOS `.dmg`. |
| `npm run build:linux` | `npm run build && electron-builder --linux` | Production build, then packages a Linux `.AppImage`. |
| `npm run build:unpacked` | `npm run build && electron-builder --dir` | Production build, then outputs an unpacked app directory (no installer) for local testing. |

## Continuous Integration & Releases

A GitHub Actions workflow (`.github/workflows/build.yml`) named **Build** runs on pushes to `main`, pushes of `v*` tags, pull requests targeting `main`, and manual dispatch:

1. **Typecheck & test** (`ubuntu-latest`): runs on every trigger; `npm ci`, `npm run typecheck`, `npm run test`.
2. **Package** (`ubuntu-latest` / `windows-latest` / `macos-latest` matrix): only runs on a `v*` tag push or a manual `workflow_dispatch`, and only after the test job passes.
   - On a tag push, it runs `npx electron-builder --publish always`, publishing installers for all three platforms directly to a draft GitHub Release.
   - On manual dispatch, it runs `npx electron-builder --publish never` and instead uploads the installers as workflow artifacts (no publish).

## Internationalization

The interface is fully translated into the following languages, selectable from the in-app language switcher:

- English (default)
- Chinese
- Hindi
- Spanish
- French
- Arabic
- Bengali
- Portuguese
- Russian
- Urdu
- Thai

Arabic and Urdu render with correct right-to-left text direction.

**Translation status:** all 10 non-English locales were produced by an AI translate, parity-check, and fluency-spot-check pipeline, not by native speakers. They're a solid first pass, not final copy. In particular, the financial terminology (Sharpe, Sortino, VaR, Greeks, etc.) used in the Academy lessons has established, sometimes non-obvious translations in each market that an automated pass can miss. Native-speaker review is pending.

## Project Structure

```
src/
├── main/            Electron main process (Node context)
│   ├── index.ts      Creates the BrowserWindow, wires IPC handlers, loads the renderer
│   └── aiInsights.ts Portfolio AI-commentary feature (local Claude Code CLI, with Anthropic API fallback)
│
├── preload/          Context-bridge boundary
│   ├── index.ts       Exposes window.api / window.electron to the renderer via contextBridge
│   └── index.d.ts      Matching Window type declarations
│
└── renderer/src/      React 18 + Vite UI (Chromium context, no Node access)
    ├── state/          AppStateContext.tsx: single React Context holding app state (symbol/timeframe/
    │                    indicators, watchlist, portfolios with localStorage persistence, theme, language,
    │                    dock layout, open overlays) and its setter actions
    ├── lib/             Pure calculation/utility modules: quant.ts (SMA/EMA, Sharpe, Sortino, VaR, max
    │                    drawdown, Bollinger Bands, RSI, MACD, Black-Scholes/Greeks), portfolioMath.ts,
    │                    riskAssessment.ts (all three with a co-located .test.ts), plus assetSearch.ts,
    │                    portfolioEntry.ts, chartTheme.ts, motion.ts
    ├── data/            Data layer: dataService.ts (MockDataService / FinnhubDataService, chosen by
    │                    whether VITE_FINNHUB_API_KEY is set, with per-call fallback to mock on fetch
    │                    failure), finnhubAdapter.ts, mockData.ts (seeded PRNG generation, plus curated
    │                    lists for bonds/FX/real estate), assetUniverse.ts (roughly 11.5k+ generated stock
    │                    and crypto symbols)
    ├── i18n/            i18next/react-i18next setup, SUPPORTED_LANGUAGES with LTR/RTL metadata,
    │                    locale JSON resources
    ├── academy/         In-app financial-literacy glossary (lessons.ts metadata + i18n-driven copy,
    │                    AcademyPanel.tsx, InfoIcon.tsx)
    ├── components/
    │   ├── layout/      App chrome: Topbar, Rail, Workspace, Dock, TickerTape
    │   ├── dock/         Dashboard cards: RiskCard, OptionsCard, NewsCard, CardHead, DockCardOverlay
    │   ├── chart/        PriceChart.tsx (lightweight-charts wrapper), OscillatorPanel.tsx (RSI/MACD)
    │   ├── portfolio/    PortfolioPicker, PortfolioWorkspace, PortfolioPane
    │   ├── customize/    CustomizePanel.tsx
    │   ├── ui/           Shared primitives: Tooltip.tsx, OverlayPanel.tsx
    │   ├── stats/        RiskStatTile.tsx
    │   └── icons/        Icons.tsx: inline SVG icon set
    ├── types/           market.ts: shared domain types (Asset, Candle, Timeframe, NewsItem,
    │                    OptionQuote, Portfolio/PortfolioPosition, ChartHoverInfo, etc.)
    ├── styles/          theme.css, global.css
    └── assets/          Static assets (e.g. logo-just.png)
```

Configuration files of note: `electron.vite.config.ts` (main/preload use `externalizeDepsPlugin()`; renderer uses `@vitejs/plugin-react` and resolves the `@renderer` alias to `src/renderer/src`), and a root `tsconfig.json` that references `tsconfig.node.json` (main/preload) and `tsconfig.web.json` (renderer) as TypeScript project references.

## Known Limitations

The following gaps are known and deliberate. They're documented here rather than hidden:

1. **Simulated market data, not live prices.** Asset prices and candles across the entire asset universe (including the roughly 11,500+ symbol generated stock/crypto universe) are generated deterministically from seeded randomness, not fetched from a real market data feed, unless a Finnhub/TwelveData key is configured.
2. **AI translations need native-speaker review.** All 10 non-English locales were produced by an AI pipeline, not native speakers. They're a solid first pass, but not final copy, especially for financial terminology in the Academy lessons.
3. **RTL layout mirroring is not implemented.** Arabic and Urdu get correct right-to-left text direction, but the dashboard's panel layout (rail/workspace/dock positions, chart orientation) still renders left-to-right. This is a known, deliberate gap.
4. **AI insights: only the local Claude Code path is fully verified end-to-end.** The direct Anthropic-API-key fallback has not been exercised against a live key.
5. **No transaction/lot history.** Portfolios track current positions (symbol, quantity, average cost) only; there's no realized-vs-unrealized P&L splitting or trade history.
6. **No cash/uninvested balance tracking** in the portfolio tracker.
7. **No default-portfolio pinning.** With 2+ saved portfolios, opening the picker shows a manual checklist (most-recently-active one listed first) rather than any user-configurable default or pin.

## Support

Quant In A Box is free to use. The security warnings you may see on first launch are because the installers aren't code-signed, which is purely a cost thing, not a code problem:

- **Apple Developer Program**: US$99/year (to notarize the macOS build)
- **Windows code-signing certificate**: roughly US$100 to $400/year

If Quant In A Box is useful to you, a small donation helps cover those costs so future builds can be signed. Any help is genuinely appreciated.

**Donate:** [Buy Me a Coffee](https://buymeacoffee.com/calclab) · [willbe.dev](https://willbe.dev) · or the **Sponsor** button at the top of this repo.

## Author

Built by **will.be**, [willbe.dev](https://willbe.dev) (with AI assistance).

## License

This is a private, personal project by will.be. It is not open source and no external contributions are expected. `package.json` is marked `"private": true` and no license is granted; all rights reserved.
