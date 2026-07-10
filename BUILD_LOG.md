# Build Log

Running log of autonomous build cycles. Newest entries at the top.

## 2026-07-10 — Loop stopped: needs Will's input on the portfolio tracker

Three cycles completed autonomously (watchlist persistence → quant.ts test suite → packaging config), each typechecked, tested, and built clean, with real bugs caught and fixed by the verification step each time (a test-fixture bug in cycle 2, a wrong electron-builder property name in cycle 3).

The only remaining item from the candidate list is the portfolio/holdings tracker, and it's a genuine product-scope question, not something with an obvious default:
- Single portfolio, or multiple named portfolios?
- Current positions only (symbol, quantity, cost basis), or full transaction/lot history (so realized vs. unrealized P&L can be split out)?
- Should the existing "Portfolio Risk" dock card (today: stats for whichever symbol is selected) become an actual *weighted portfolio* calculation once real holdings exist — meaning its meaning changes for every user, not just an addition?
- Cash balance / uninvested cash tracked at all?

Stopping here rather than guessing, per the loop's stop condition. Everything else scoped in this conversation is built, tested, and verified working.

## 2026-07-10 — Packaging config (electron-builder)

**Built:** A real `build` config in `package.json` for electron-builder — `appId`, `productName`, output directory (`release/`), Windows NSIS installer target (with a changeable install directory and desktop shortcut), macOS DMG target (Finance category), Linux AppImage target. Added a `build:unpacked` script (`electron-builder --dir`) for fast local packaging verification without generating a full installer every time.

**Why:** the app had no path to becoming an actual distributable `.exe`/`.dmg`/`.AppImage` yet — this was pure config/plumbing needed before anyone outside a dev environment could run it.

**Verified:** first attempt failed fast and loud — `npm run build:unpacked` caught a real error, `nsis.allowToChangeInstallDirectory` isn't a valid electron-builder property (correct name is `allowToChangeInstallationDirectory`); electron-builder's own schema validation pointed at the exact typo. Fixed the property name, re-ran, and it produced a real working executable at `release\win-unpacked\Quant In A Box.exe`. No custom app icon exists yet, so electron-builder falls back to the default Electron icon — that's a design-asset gap (someone needs to draw/commission an actual icon), not a code blocker, so it's left as a known follow-up rather than something to guess at.

## 2026-07-10 — Unit tests for the quant math library

**Built:** A real test suite (`vitest`) covering every function in `lib/quant.ts` — SMA, EMA, stdev, daily returns, annualized volatility, Sharpe, Sortino, max drawdown, historical VaR, beta, Bollinger Bands, RSI, MACD, and Black-Scholes pricing/Greeks. 23 tests, all passing. Added `npm run test` script and `vitest.config.ts` (mirrors the `@renderer` path alias from `electron.vite.config.ts`).

**Why:** the app's whole pitch is "real institutional-grade math," so the math library is the highest-stakes code in the codebase — it deserved verification beyond "it compiles and looks right on screen." Black-Scholes is checked against the classic textbook ATM example (S=K=100, T=1, r=5%, σ=20% → price ≈ 10.45, delta ≈ 0.637) and against put-call parity; Sharpe/Sortino/VaR/beta are checked against hand-computable edge cases (identical-to-market beta = 1, zero-volatility Sharpe = 0, worst-percentile VaR, etc.).

**Verified:** `npm run test` → 23/23 passing. Caught one real issue along the way — not in the library, but in my own first draft of a Sortino test, which picked two identical downside returns, so downside deviation was correctly 0 and Sortino correctly short-circuited to 0 by the divide-by-zero guard; fixed the test's fixture data rather than the function. `npm run typecheck` and `npm run build` both still clean. No UI changed this cycle, so no browser check was needed.

## 2026-07-10 — Watchlist persistence

**Built:** Real watchlist add/remove, persisted across restarts.
- `AppStateContext` now loads/saves the watchlist to `localStorage` (`qiab:watchlist:v1`), defaulting to one symbol per asset class (NVDA, BTC, US10Y, EURUSD, VNQ) on first run.
- The star button in the symbol header (`Workspace.tsx`) toggles the current symbol in/out of the watchlist (filled vs outline star).
- The rail's pinned-symbol list (`Rail.tsx`) now reflects the actual watchlist instead of always showing every mock symbol, with an empty-state hint when nothing is pinned.

**Why:** the star button existed visually in v1 but did nothing; the rail always showed every symbol regardless of what the user cared about, which isn't a real "watchlist."

**Verified:** `npm run typecheck` and `npm run build` both clean. Functional check via the browser preview: toggled a symbol off/on, confirmed `localStorage` contents update, reloaded the page and confirmed the watchlist survives reload. Caught and fixed nothing further needed — the only console errors seen were stale HMR churn from earlier edits, not a live bug (confirmed by re-checking DOM state and a fresh reload).
