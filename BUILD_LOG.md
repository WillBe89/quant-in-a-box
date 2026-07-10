# Build Log

Running log of autonomous build cycles. Newest entries at the top.

## 2026-07-10 — Portfolio tracker v1

**Built:** A real "Your holdings" panel (topbar/rail button, opens like the Teaching Zone) where you add positions by symbol + quantity + average cost basis. Adding to an existing symbol blends into a new weighted average cost rather than duplicating the row. Shows per-position current price, market value, unrealized P&L $/%, and % of portfolio weight, plus portfolio-wide totals. Persisted to `localStorage` (`qiab:portfolio:v1`), same pattern as the watchlist.

The bigger piece: **Portfolio Analytics** now computes real weighted stats (Sharpe, Sortino, volatility, VaR, max drawdown, beta) across your *actual* holdings, not just whatever symbol happens to be selected in the main chart — `lib/portfolioMath.ts` blends each holding's daily-return series by its market-value weight into one portfolio-level return series, then feeds that into the same `lib/quant.ts` functions the single-symbol Risk card already uses. New unit tests (`portfolioMath.test.ts`, 4 tests) cover the blending and compounding math.

**Scope decisions made without asking** (flagged here in case any should be revisited): single portfolio, not multiple; current positions only, no transaction/lot history — matches the most common "simple portfolio tracker" pattern and was explicit enough in what Will asked for ("track how it's going, apply the analytics to it") to build directly rather than re-asking.

**Verified:** typecheck/test (27/27)/build all clean. Functional check in the browser: added NVDA (10 @ $120) — P&L and weight (100%) computed correctly, and portfolio analytics with one holding matched that symbol's own standalone Risk-card stats exactly (a strong correctness cross-check). Added BTC (0.05 @ $58,000) — totals, weights (30.8%/69.2%), and analytics all updated correctly. Removed NVDA — analytics correctly collapsed back to BTC's own standalone stats. Reloaded the page and confirmed both the position list and the topbar's "Portfolio (n)" count persist.

**Bug caught and fixed:** opening the Teaching Zone from an info-icon *inside* the Portfolio panel opened Academy behind it (both modals shared `z-index: 100`, and Portfolio mounts later in the DOM so it won the tie). Fixed by giving Academy a higher `z-index` — it's a contextual reference lookup that should always stack above whatever invoked it.

## 2026-07-10 — GitHub repo + real cross-platform CI, with two real bugs caught and fixed

**Built:**
- Private repo created and pushed: [github.com/WillBe89/quant-in-a-box](https://github.com/WillBe89/quant-in-a-box).
- `.github/workflows/build.yml`: typecheck+test on every push/PR; on a `v*` tag, Windows/macOS/Linux runners each build their native installer and publish all three to a draft GitHub Release; manual runs (`workflow_dispatch`) build and upload as workflow artifacts instead, for testing without cutting a release.

**Bugs caught by actually running CI, not just reading the config:**
1. `npm ci` failed on a clean checkout with "Missing: esbuild@0.28.1 from lock file." Root cause: `vitest@4.1.10`'s `peerDependencies` require `vite ^6/^7/^8`, incompatible with this project's `vite@^5.4` (pinned for `electron-vite`). npm was silently auto-installing that peer as a private nested `vite`+`esbuild@0.28.1` inside `vitest/node_modules` — a resolution that varied run-to-run locally and produced a lockfile `npm ci` correctly rejected as inconsistent on a fresh Linux checkout. First attempted fix (approving the extra esbuild script) treated the symptom, not the cause, and CI failed again identically. Real fix: downgraded to `vitest@3.2.7`, which depends directly on `vite: "^5.0.0 || ^6.0.0 || ^7.0.0-0"` — no nested copy needed at all. Verified with a genuine from-scratch `npm ci` locally (not just `npm install`) before pushing again.
2. Electron-builder's `nsis` config rejected `allowToChangeInstallDirectory` — not a real property; correct name is `allowToChangeInstallationDirectory`. Caught immediately by electron-builder's own schema validation on the first packaging attempt.

**Verified:** manually triggered the full workflow (`workflow_dispatch`) after the fixes — typecheck/test job green, and all three packaging jobs (windows-latest, macos-latest, ubuntu-latest) succeeded, producing real installer artifacts (~75-110MB each, sane sizes for an Electron app). Confirms a `v*` tag push will actually produce a working `.exe`, `.dmg`, and `.AppImage` in one GitHub Release.

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
